import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/prisma";
import { orchestrate } from "../agents/orchestrator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Decode a Gmail message part from base64url */
function decodeBase64(encoded: string): string {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
}

/** Extract plain-text body from a Gmail message payload */
function extractBody(payload: any): string {
    if (!payload) return "";

    // Direct body
    if (payload.body?.data) {
        let text = decodeBase64(payload.body.data);
        // If it looks like HTML, strip it
        if (text.includes("<") && text.includes(">")) {
            text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
            text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
            text = text.replace(/<[^>]+>/g, " ");
        }
        return text.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    }

    // Multipart — find text/plain first, fall back to text/html
    if (payload.parts) {
        const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
        if (textPart?.body?.data) return decodeBase64(textPart.body.data).replace(/\s+/g, " ").trim();

        const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
        if (htmlPart?.body?.data) {
            let html = decodeBase64(htmlPart.body.data);
            html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
            html = html.replace(/<[^>]+>/g, " ");
            return html.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
        }

        // Recurse into nested multipart
        for (const part of payload.parts) {
            const body = extractBody(part);
            if (body) return body;
        }
    }

    return "";
}

/** Get header value from Gmail message headers */
function getHeader(headers: any[], name: string): string {
    return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

/** Build a raw RFC-2822 email string for sending via Gmail API */
function buildRawEmail(to: string, from: string, subject: string, replyText: string, threadId?: string): string {
    const lines = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        replyText,
    ];
    return Buffer.from(lines.join("\r\n")).toString("base64url");
}

// ─── Main Service ──────────────────────────────────────────────────────────────

export class GmailService {
    private tenantId: string;
    private static activeSyncs = new Set<string>();

    constructor(tenantId: string) {
        this.tenantId = tenantId;
    }

    /** Build an authenticated Gmail OAuth2 client using stored tokens */
    private async getAuthClient(): Promise<OAuth2Client | null> {
        const tenant = await prisma.tenant.findUnique({
            where: { id: this.tenantId },
            include: { users: { include: { accounts: true } } }
        });

        if (!tenant || !tenant.gmailEmail) {
            console.log(`[Gmail] Not configured for tenant: ${this.tenantId}`);
            return null;
        }

        // Find the user whose email is the configured gmailEmail
        const user = tenant.users.find((u: any) => u.email === tenant.gmailEmail);
        if (!user) {
            console.log(`[Gmail] No user found with email ${tenant.gmailEmail}`);
            return null;
        }

        // Find the Google account for that user
        const account = user.accounts.find((a: any) => a.provider === "google");
        if (!account || (!account.access_token && !account.refresh_token)) {
            console.log(`[Gmail] No Google OAuth account found for ${tenant.gmailEmail}`);
            return null;
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        );

        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
        });

        // Auto-refresh and persist new tokens
        oauth2Client.on("tokens", async (tokens) => {
            console.log(`[Gmail] Refreshed tokens for ${tenant.gmailEmail}`);
            await prisma.account.update({
                where: { id: account.id },
                data: {
                    access_token: tokens.access_token ?? account.access_token,
                    ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
                    ...(tokens.expiry_date && { expires_at: Math.floor(tokens.expiry_date / 1000) }),
                },
            });
        });

        return oauth2Client;
    }

    /** Poll Gmail inbox for unread messages, run agent, optionally reply */
    async pollAndProcess(maxResults = 25): Promise<{ processed: number; lastResponse?: string; status?: string }> {
        if (GmailService.activeSyncs.has(this.tenantId)) {
            console.log(`[Gmail] Sync already in progress for ${this.tenantId}. Skipping.`);
            return { processed: 0, status: "already_running" };
        }

        GmailService.activeSyncs.add(this.tenantId);
        try {
            const auth = await this.getAuthClient();
            if (!auth) {
                return { processed: 0, status: "no_auth" };
            }

            const tenant = await prisma.tenant.findUnique({
                where: { id: this.tenantId },
            }) as any;

            const autoReply = tenant?.gmailSettings?.autoReply !== false;
            const gmail = google.gmail({ version: "v1", auth });

            // Fetch unread messages - limited to last 24 hours to avoid processing old unread emails
            const listRes = await gmail.users.messages.list({
                userId: "me",
                q: "is:unread newer_than:1d -category:social -category:promotions",
                maxResults: maxResults,
            });

            const messages = listRes.data.messages || [];
            console.log(`[Gmail] Found ${messages.length} email(s) for ${tenant?.gmailEmail} using query: ${"is:unread -category:social -category:promotions"}`);

            if (messages.length === 0) {
                return { processed: 0 };
            }

            let processed = 0;
            let lastResponse: string | undefined;

            for (const msg of messages) {
                let dbMessageId: string | undefined;
                try {
                    // Skip if already successfully processed
                    const existing = await prisma.message.findFirst({
                        where: { externalId: msg.id!, tenantId: this.tenantId },
                    });
                    if (existing && existing.status === "COMPLETED") {
                        console.log(`[Gmail] Skipping ${msg.id} - already COMPLETED`);
                        continue;
                    }

                    // Fetch full message
                    const fullMsg = await gmail.users.messages.get({
                        userId: "me",
                        id: msg.id!,
                        format: "full",
                    });

                    const headers = fullMsg.data.payload?.headers || [];
                    const from = getHeader(headers, "from");
                    const subject = getHeader(headers, "subject");
                    const body = extractBody(fullMsg.data.payload);
                    const gmailThreadId = fullMsg.data.threadId;

                    if (!body.trim()) {
                        console.log(`[Gmail] Skipping ${msg.id} - empty body`);
                        continue;
                    }

                    console.log(`[Gmail] Processing email from: ${from} | Subject: ${subject} | Thread: ${gmailThreadId}`);

                    // Create or update the message record to PROCESSING
                    const dbMessage = await prisma.message.upsert({
                        where: { externalId: msg.id! },
                        create: {
                            tenantId: this.tenantId,
                            externalId: msg.id!,
                            threadId: gmailThreadId,
                            role: "user",
                            content: `Subject: ${subject}\n\n${body.trim()}`,
                            sender: from,
                            source: "email",
                            status: "PROCESSING",
                        },
                        update: {
                            status: "PROCESSING",
                        }
                    });
                    dbMessageId = dbMessage.id;

                    // Run the AI agent
                    const result = await orchestrate(
                        `Subject: ${subject}\n\n${body.trim()}`,
                        this.tenantId
                    );

                    const category = result?.category || "OTHER";
                    const agentMessages = result?.messages || [];
                    const lastMsg = agentMessages[agentMessages.length - 1];
                    const responseContent = typeof lastMsg?.content === "string"
                        ? lastMsg.content
                        : JSON.stringify(lastMsg?.content);

                    // Save agent reply and link to parent
                    if (responseContent && category === "BUSINESS") {
                        await prisma.message.create({
                            data: {
                                tenantId: this.tenantId,
                                role: "assistant",
                                content: responseContent,
                                sender: "AgentClaw Bot",
                                source: "email",
                                threadId: gmailThreadId || undefined,
                                parentMessageId: dbMessage.id,
                                status: "COMPLETED",
                                category: "BUSINESS",
                                trace: result as any, // result is AgentState, trace is Json
                            },
                        });

                        // Auto-reply if enabled
                        if (autoReply) {
                            const fromEmail = from.match(/<(.+)>/)?.[1] || from;
                            await gmail.users.messages.send({
                                userId: "me",
                                requestBody: {
                                    threadId: gmailThreadId || undefined,
                                    raw: buildRawEmail(fromEmail, tenant.gmailEmail, subject, responseContent),
                                },
                            });
                            console.log(`[Gmail] Auto-replied to ${fromEmail} (Category: BUSINESS)`);
                        }
                    } else {
                        console.log(`[Gmail] Skipping auto-reply for category: ${category}`);
                    }

                    // Update parent with category and COMPLETED status
                    await prisma.message.update({
                        where: { id: dbMessage.id },
                        data: {
                            status: "COMPLETED",
                            category,
                            trace: result as any
                        }
                    });

                    // Mark the original email as read in Gmail
                    await gmail.users.messages.modify({
                        userId: "me",
                        id: msg.id!,
                        requestBody: { removeLabelIds: ["UNREAD"] },
                    });

                    processed++;
                } catch (err: any) {
                    console.error(`[Gmail] Error processing message ${msg.id}:`, err.message);
                    if (dbMessageId) {
                        await prisma.message.update({
                            where: { id: dbMessageId },
                            data: { status: "FAILED", trace: { error: err.message } as any }
                        });
                    }
                }
            }

            return { processed, lastResponse, status: "completed" };
        } finally {
            GmailService.activeSyncs.delete(this.tenantId);
        }
    }
}
