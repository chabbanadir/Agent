import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/prisma";
import { TurnManager } from "@/lib/TurnManager";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function decodeBase64(encoded: string): string {
    if (!encoded) return "";
    try {
        const buff = Buffer.from(encoded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
        return buff.toString("utf-8");
    } catch {
        return "";
    }
}

/** Strips quoted email history (e.g., "On ... wrote:") from the text. */
function stripQuotedText(text: string): string {
    if (!text) return "";
    
    const markers = [
        /^(?:\s*On\s+.*\s+wrote:|\s*Le\s+.*\s+a\s+écrit\s*:)/im,
        /^-*\s*(?:Original Message|Message d'origine)\s*-*/im,
        /^\s*From:\s+.*$/im,
        /^\s*De\s*:\s+.*$/im,
    ];

    for (const marker of markers) {
        const match = text.match(marker);
        if (match && match.index !== undefined) {
            return text.substring(0, match.index).trim();
        }
    }

    return text.trim();
}

function extractBody(payload: any): string {
    if (!payload) return "";
    let body = "";

    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/plain" && part.body?.data) {
                body += decodeBase64(part.body.data);
            } else if (part.parts) {
                body += extractBody(part);
            }
        }
    } else if (payload.body?.data) {
        body = decodeBase64(payload.body.data);
    }

    return body;
}

function getHeader(headers: any[], name: string): string {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase());
    return header ? header.value : "";
}

/** Check if an email should be skipped based on headers/automation (Mailing lists, bots) */
function shouldSkipMessage(headers: any[], messageId: string): boolean {
    const listHeader = headers.find(h => h.name?.toLowerCase() === 'list-id' || h.name?.toLowerCase() === 'list-unsubscribe');
    const precedence = headers.find(h => h.name?.toLowerCase() === 'precedence')?.value?.toLowerCase();
    const autoSubmitted = headers.find(h => h.name?.toLowerCase() === 'auto-submitted')?.value?.toLowerCase();
    const xChabba = headers.find(h => h.name?.toLowerCase() === 'x-chabba')?.value === 'true';

    if (listHeader || precedence === 'list' || precedence === 'bulk' || autoSubmitted === 'auto-generated' || xChabba) {
        console.log(`[Gmail] Skipping message ${messageId}: Newsletter/Mailing List/Auto-Generated or Agent-to-Agent detected via headers`);
        return true;
    }

    return false;
}

// ─── Main Service ──────────────────────────────────────────────────────────────

export class GmailService {
    private tenantId: string;

    constructor(tenantId: string) {
        this.tenantId = tenantId;
    }

    async syncAllAccounts(): Promise<{ processed: number; errors: string[] }> {
        const accounts = await prisma.channelAccount.findMany({
            where: { tenantId: this.tenantId, type: "GMAIL", isActive: true }
        });

        let total = 0;
        const errors: string[] = [];
        for (const account of accounts) {
            try {
                const { processed, historyId } = await this.syncAccount(account);
                total += processed;
                if (historyId) {
                    await prisma.channelAccount.update({
                        where: { id: account.id },
                        data: { lastHistoryId: historyId }
                    });
                }
            } catch (err: any) {
                errors.push(`${account.address}: ${err.message}`);
            }
        }
        return { processed: total, errors };
    }

    async getAuthClient(account: any): Promise<OAuth2Client | null> {
        const creds = account.credentials as any;
        if (!creds || !creds.access_token) return null;

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: creds.access_token,
            refresh_token: creds.refresh_token,
            expiry_date: creds.expires_at ? creds.expires_at * 1000 : undefined
        });

        return oauth2Client;
    }

    async syncAccount(account: any, maxResults = 50): Promise<{ processed: number; historyId?: string }> {
        const auth = await this.getAuthClient(account);
        if (!auth) return { processed: 0 };

        const gmail = google.gmail({ version: "v1", auth });

        const listRes = await gmail.users.messages.list({
            userId: "me",
            q: "-from:me -label:SENT newer_than:1d",
            maxResults
        });

        const messages = listRes.data.messages || [];
        if (messages.length === 0) return { processed: 0, historyId: listRes.data.nextPageToken || undefined };

        let processed = 0;
        for (const msg of messages) {
            try {
                const existing = await prisma.message.findUnique({ where: { externalId: msg.id! } });
                if (existing) continue;

                const fullMsg = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "full"
                });

                const internalDate = parseInt(fullMsg.data.internalDate || "0");
                const ageMinutes = (Date.now() - internalDate) / 1000 / 60;
                if (ageMinutes > 1440) continue; // Skip messages older than 24 hours

                const headers = fullMsg.data.payload?.headers || [];
                const isAutomated = shouldSkipMessage(headers, msg.id!);

                const from = getHeader(headers, "from");
                const subject = getHeader(headers, "subject");
                const rawBody = extractBody(fullMsg.data.payload);
                const body = stripQuotedText(rawBody);

                const trace = {
                    headers,
                    syncedAt: new Date().toISOString(),
                    autoSkipped: isAutomated,
                    originalBodyLength: rawBody.length,
                    stripped: rawBody.length !== body.length
                };

                const createdMessage = await prisma.message.create({
                    data: {
                        tenantId: this.tenantId,
                        channelAccountId: account.id,
                        role: "user",
                        content: `Subject: ${subject}\n\n${body}`,
                        sender: from,
                        source: "email",
                        externalId: msg.id!,
                        rfcMessageId: getHeader(headers, "message-id"),
                        threadId: msg.threadId!,
                        status: isAutomated ? "SKIPPED" : "RECEIVED",
                        category: isAutomated ? "AUTOMATED" : undefined,
                        trace: trace as any
                    }
                });
                
                if (!isAutomated) {
                    const sessionId = `${account.id}_${msg.threadId!}`;
                    await TurnManager.addMessage(sessionId, createdMessage as any, { protocol: 'EMAIL', baseTimeoutMs: 60000 });
                }
                
                processed++;
            } catch (err: any) {
                console.error(`[Gmail] Error ingesting message ${msg.id}:`, err.message);
            }
        }

        const profile = await gmail.users.getProfile({ userId: "me" });
        return { processed, historyId: profile.data.historyId || undefined };
    }

    async pollAndProcess(): Promise<{ processed: number; status: string }> {
        const result = await this.syncAllAccounts();
        return { processed: result.processed, status: "OK" };
    }

    async registerWatch(account: any): Promise<boolean> {
        const auth = await this.getAuthClient(account);
        if (!auth) return false;

        const gmail = google.gmail({ version: "v1", auth });
        try {
            await gmail.users.watch({
                userId: "me",
                requestBody: {
                    topicName: process.env.GMAIL_PUBSUB_TOPIC || "",
                    labelIds: ["INBOX"]
                }
            });

            await prisma.channelAccount.update({
                where: { id: account.id },
                data: { lastWatchAt: new Date() }
            });
            return true;
        } catch (err: any) {
            console.error(`[Gmail] Failed to register watch for ${account.address}:`, err.message);
            return false;
        }
    }

    async syncByHistory(account: any): Promise<{ processed: number }> {
        if (!account.lastHistoryId) return this.syncAccount(account);

        const auth = await this.getAuthClient(account);
        if (!auth) return { processed: 0 };

        const gmail = google.gmail({ version: "v1", auth });

        try {
            const historyRes = await gmail.users.history.list({
                userId: "me",
                startHistoryId: account.lastHistoryId
            });

            const history = historyRes.data.history || [];
            if (history.length === 0) return { processed: 0 };

            let totalProcessed = 0;
            const messageIds = new Set<string>();

            for (const item of history) {
                if (item.messagesAdded) {
                    for (const added of item.messagesAdded) {
                        if (added.message?.id) messageIds.add(added.message.id);
                    }
                }
            }

            for (const msgId of messageIds) {
                const existing = await prisma.message.findUnique({ where: { externalId: msgId } });
                if (existing) continue;

                const fullMsg = await gmail.users.messages.get({
                    userId: "me",
                    id: msgId,
                    format: "full"
                });

                const internalDate = parseInt(fullMsg.data.internalDate || "0");
                if (Date.now() - internalDate > 1440 * 60 * 1000) continue;

                const headers = fullMsg.data.payload?.headers || [];
                const isAutomated = shouldSkipMessage(headers, msgId);

                const from = getHeader(headers, "from");
                const subject = getHeader(headers, "subject");
                const rawBody = extractBody(fullMsg.data.payload);
                const body = stripQuotedText(rawBody);

                const trace = {
                    headers,
                    syncedAt: new Date().toISOString(),
                    autoSkipped: isAutomated,
                    originalBodyLength: rawBody.length,
                    stripped: rawBody.length !== body.length
                };

                const createdMessage = await prisma.message.create({
                    data: {
                        tenantId: this.tenantId,
                        channelAccountId: account.id,
                        role: "user",
                        content: `Subject: ${subject}\n\n${body}`,
                        sender: from,
                        source: "email",
                        externalId: msgId,
                        rfcMessageId: getHeader(headers, "message-id"),
                        threadId: fullMsg.data.threadId!,
                        status: isAutomated ? "SKIPPED" : "RECEIVED",
                        category: isAutomated ? "AUTOMATED" : undefined,
                        trace: trace as any
                    }
                });
                
                if (!isAutomated) {
                    const sessionId = `${account.id}_${fullMsg.data.threadId!}`;
                    await TurnManager.addMessage(sessionId, createdMessage as any, { protocol: 'EMAIL', baseTimeoutMs: 60000 });
                }
                
                totalProcessed++;
            }

            if (historyRes.data.historyId) {
                await prisma.channelAccount.update({
                    where: { id: account.id },
                    data: { lastHistoryId: historyRes.data.historyId }
                });
            }

            return { processed: totalProcessed };

        } catch (error: any) {
            if (error.status === 404 || error.status === 410) {
                const result = await this.syncAccount(account);
                return { processed: result.processed };
            }
            throw error;
        }
    }

    async sendEmail(account: any, to: string, subject: string, body: string, threadId?: string): Promise<boolean> {
        const auth = await this.getAuthClient(account);
        if (!auth) return false;

        const gmail = google.gmail({ version: "v1", auth });

        // Encode the email according to RFC 2822
        const identifier = account.name || account.address;
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const emailParts = [
            `From: ${identifier} <${account.address}>`,
            `To: ${to}`,
            `Content-Type: text/plain; charset=utf-8`,
            `MIME-Version: 1.0`,
            `Subject: ${utf8Subject}`,
            ``,
            body
        ];
        const email = emailParts.join('\r\n');
        const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        try {
            await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedEmail,
                    threadId: threadId
                }
            });
            return true;
        } catch (err: any) {
            console.error(`[Gmail] Failed to send email to ${to}:`, err.message);
            return false;
        }
    }
}
