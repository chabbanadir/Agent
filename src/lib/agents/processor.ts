import prisma from "@/lib/prisma";
import { orchestrate } from "./orchestrator";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { google } from "googleapis";
import { getProtocol } from "@/lib/protocols";
import { getModel } from "../llm/gateway";

export class AgentProcessor {
    private static warnedAccounts = new Set<string>();

    private static extractEmail(str: string) {
        if (!str) return "";
        const match = str.match(/<([^>]+)>/);
        return (match ? match[1] : str).toLowerCase().trim();
    }

    static async processTurn(messages: any[], protocol: 'WHATSAPP' | 'GMAIL') {
        console.log(`[Processor] Processing Turn for ${protocol} with ${messages.length} messages.`);
        // Note: messages might need Date parsing if they come from Redis JSON.
        const parsedMessages = messages.map(m => ({
            ...m,
            createdAt: m.createdAt ? new Date(m.createdAt) : new Date(m.timestamp)
        }));
        return this.processMessageBatch(parsedMessages);
    }

    static async processPendingMessages() {
        console.log("[Processor] Scanning for RECEIVED messages...");
        this.warnedAccounts.clear();

        const pendingMessages = await prisma.message.findMany({
            where: {
                role: "user",
                AND: [
                    {
                        OR: [
                            { status: "RECEIVED" },
                            {
                                status: "PROCESSING",
                                lastProcessedAt: { lt: new Date(Date.now() - 2 * 60 * 1000) },
                                retryCount: { lt: 5 }
                            }
                        ]
                    },
                    {
                        OR: [
                            { category: null as any },
                            { NOT: { category: "AUTOMATED" } }
                        ]
                    }
                ]
            },
            include: { channelAccount: true }
        });

        if (pendingMessages.length === 0) return;

        console.log(`[Processor] Found ${pendingMessages.length} messages to process (including retries).`);

        const groups: Record<string, typeof pendingMessages> = {};
        for (const msg of pendingMessages) {
            const email = this.extractEmail(msg.sender);
            const key = `${msg.channelAccountId || "no-account"}-${email}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(msg);
        }

        await Promise.allSettled(Object.keys(groups).map(async (key) => {
            try {
                const batch = groups[key];
                const firstMsg = batch[0];
                const senderEmail = this.extractEmail(firstMsg.sender);

                const agentChannel = await prisma.agentChannel.findFirst({
                    where: {
                        channelAccountId: firstMsg.channelAccountId,
                        isActive: true
                    }
                });

                if (agentChannel) {
                    const protocol = getProtocol(firstMsg.source || 'DEFAULT');
                    const config = (agentChannel.config as any) || {};
                    
                    if (config.delayEnabled || protocol.debounceMs > 0) {
                        const latestMsg = batch.reduce((prev, current) =>
                            prev.createdAt.getTime() > current.createdAt.getTime() ? prev : current
                        );

                        // Use config delay if present, otherwise fall back to protocol default
                        const debounceMs = config.delayEnabled 
                            ? (config.maxDelayMinutes || 1) * 60 * 1000 
                            : protocol.debounceMs;

                        const ageInMs = Date.now() - latestMsg.createdAt.getTime();

                        if (ageInMs < debounceMs) {
                            const waitRemaining = Math.ceil((debounceMs - ageInMs) / 1000);
                            console.log(`[Processor] Debouncing batch for ${senderEmail} (${waitRemaining}s remaining). Mode: SILENCE`);
                            return;
                        }
                    }
                }

                const batchIds = batch.map(m => m.id);

                const claimed = await prisma.message.updateMany({
                    where: {
                        id: { in: batchIds },
                        OR: [
                            { status: "RECEIVED" },
                            { status: "PROCESSING" }
                        ]
                    },
                    data: {
                        status: "PROCESSING",
                        lastProcessedAt: new Date(),
                        retryCount: { increment: 1 }
                    }
                });

                if (claimed.count === 0) return;

                const agentEmail = firstMsg.channelAccount?.address?.toLowerCase().trim();
                const senderEmailNormalized = senderEmail.toLowerCase().trim();

                const trace = firstMsg.trace as any;
                const incomingHeaders = trace?.headers as any[] || [];
                const xChabba = incomingHeaders.find((h: any) => h.name?.toLowerCase() === 'x-chabba')?.value === 'true';

                if (xChabba) {
                    console.log(`[Processor] Identified Agent-to-Agent communication (X-Chabba header). Skipping to prevent loop.`);
                    await prisma.message.updateMany({
                        where: { id: { in: batchIds } },
                        data: { status: "SKIPPED", category: "OTHER" }
                    });
                    return;
                }

                const xAgentId = incomingHeaders.find((h: any) => h.name?.toLowerCase() === 'x-chabba-agent-id')?.value;

                if (agentChannel && senderEmailNormalized === agentEmail && xAgentId === agentChannel.agentId) {
                    console.log(`[Processor] Identified SELF-loop for Agent ${agentChannel.agentId} on ${senderEmail}. Skipping.`);
                    await prisma.message.updateMany({
                        where: { id: { in: batchIds } },
                        data: { status: "SKIPPED", category: "OTHER" }
                    });
                    return;
                }

                const sortedBatch = batch.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
                await this.processMessageBatch(sortedBatch);
            } catch (err: any) {
                console.error(`[Processor] Failed to process group ${key}:`, err.message);
            }
        }));
    }

    static async processTargetedMessage(messageId: string) {
        const msg = await prisma.message.findUnique({
            where: { id: messageId },
            include: { channelAccount: true }
        });

        if (!msg) return;

        // NEW: Respect the 'Delay' setting even for targeted triggers
        const agentChannel = await prisma.agentChannel.findFirst({
            where: {
                channelAccountId: msg.channelAccountId,
                isActive: true
            }
        });

        if (agentChannel) {
            const protocol = getProtocol(msg.source || 'DEFAULT');
            const config = (agentChannel.config as any) || {};
            
            if (config.delayEnabled || protocol.debounceMs > 0) {
                // Determine debounce window
                const debounceMs = config.delayEnabled 
                    ? (config.maxDelaySeconds || 30) * 1000 
                    : protocol.debounceMs;

                const ageInMs = Date.now() - msg.createdAt.getTime();

                if (ageInMs < debounceMs) {
                    const waitLeft = Math.ceil((debounceMs - ageInMs) / 1000);
                    console.log(`[Processor] Targeted msg ${msg.id} is too fresh (Debounce: ${debounceMs}ms). Waiting for silence (${waitLeft}s left).`);
                    return;
                }
            }
        }

        const pendingFromSender = await prisma.message.findMany({
            where: {
                sender: msg.sender,
                channelAccountId: msg.channelAccountId,
                status: "RECEIVED",
                id: { not: msg.id }
            }
        });

        const batch = [msg, ...pendingFromSender];
        const batchIds = batch.map(m => m.id);

        const claimed = await prisma.message.updateMany({
            where: {
                id: { in: batchIds },
                OR: [
                    { status: "RECEIVED" },
                    { status: "PROCESSING" },
                    { status: "FAILED" }
                ]
            },
            data: {
                status: "PROCESSING",
                lastProcessedAt: new Date(),
                retryCount: { increment: 1 }
            }
        });

        if (claimed.count === 0) return;

        const sortedBatch = batch.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        await this.processMessageBatch(sortedBatch);
    }

    static async processMessageBatch(batch: any[]) {
        const primaryMsg = batch[batch.length - 1];
        const batchIds = batch.map(m => m.id);
        (primaryMsg as any)._startTime = Date.now();

        try {
            const agentChannels = await prisma.agentChannel.findMany({
                where: {
                    channelAccountId: primaryMsg.channelAccountId,
                    isActive: true,
                    agent: { isActive: true }
                },
                include: { agent: { include: { tenant: true } } }
            });

            // --- MANAGER INTERVENTION DETECTION ---
            const senderNormalized = this.extractEmail(primaryMsg.sender);
            for (const acm of (agentChannels as any)) {
                const managerEmail = acm.agent.managerEmail || acm.agent.tenant.managerEmail;
                const managerWhatsapp = acm.agent.managerWhatsapp || acm.agent.tenant.managerWhatsapp;
                
                let isManager = 
                    (managerEmail && senderNormalized === managerEmail.toLowerCase().trim()) ||
                    (managerWhatsapp && senderNormalized.includes(managerWhatsapp.replace(/[^0-9]/g, '')));

                if (!isManager && primaryMsg.content.match(/(?:\[)?REF-[A-Z0-9]+(?:\])?/i)) {
                    isManager = true;
                }

                if (isManager) {
                    console.log(`[Processor] Detected Manager Intervention from ${senderNormalized}`);
                    const intervened = await this.handleManagerIntervention(primaryMsg, acm, batch);
                    if (intervened) return; // Batch handled as intervention
                }
            }
            // --------------------------------------

            if (agentChannels.length === 0) {
                if (!this.warnedAccounts.has(primaryMsg.channelAccountId)) {
                    console.log(`[Processor] No active agents found for channel account ${primaryMsg.channelAccountId || 'None'}`);
                    this.warnedAccounts.add(primaryMsg.channelAccountId);
                }
                await prisma.message.updateMany({
                    where: { id: { in: batchIds } },
                    data: {
                        status: "SKIPPED",
                        category: "OTHER",
                        trace: {
                            reason: "No active agents found",
                            channelAccountId: primaryMsg.channelAccountId,
                            timestamp: new Date().toISOString()
                        } as any
                    }
                });
                return;
            }

            console.log(`[Processor] Routing batch of ${batch.length} messages to ${agentChannels.length} agents.`);
            agentChannels.forEach((acm: any) => console.log(`[Processor] -> Found Agent: ${acm.agent.name} (ID: ${acm.agent.id}) | Provider: ${acm.agent.provider} | Model: ${acm.agent.model}`));
            agentChannels.forEach((acm: any) => console.log(`[Processor] -> Found Agent: ${acm.agent.name} (ID: ${acm.agent.id}) | Provider: ${acm.agent.provider} | Model: ${acm.agent.model}`));

            let successCount = 0;
            let lastError = "";

            for (const acm of (agentChannels as any)) {
                try {
                    await this.runAgentForBatch(acm.agent, acm, batch);
                    successCount++;
                } catch (err: any) {
                    lastError = err.message;
                    console.error(`[Processor] Agent ${acm.agent.name} (ID: ${acm.agent.id}) failed:`, err.message);
                }
            }

            if (successCount === 0 && agentChannels.length > 0) {
                throw new Error(`All agents failed. Last error: ${lastError}`);
            }

            await prisma.message.updateMany({
                where: {
                    id: { in: batchIds },
                    status: "PROCESSING" // Only complete if not already marked as SKIPPED or FAILED
                },
                data: { status: "COMPLETED" }
            });

        } catch (error: any) {
            console.error(`[Processor] Failed to process batch ${batchIds.join(',')}:`, error.message);
            await prisma.message.updateMany({
                where: { id: { in: batchIds } },
                data: { status: "FAILED", trace: { error: error.message } as any }
            });
        }
    }

    private static async runAgentForBatch(agent: any, agentChannel: any, batch: any[]) {
        const primaryMsg = batch[batch.length - 1];
        try {
            const senderEmail = this.extractEmail(primaryMsg.sender);
            const batchIds = batch.map(m => m.id);
            const history = await prisma.message.findMany({
                where: {
                    AND: [
                        { id: { notIn: batchIds } },
                        {
                            OR: [
                                { sender: { contains: senderEmail } },
                                { threadId: primaryMsg.threadId }
                            ]
                        }
                    ],
                    tenantId: primaryMsg.tenantId
                },
                orderBy: { createdAt: "desc" },
                take: 15
            });

            const chatHistory = history.reverse().map(m => {
                if (m.role === "assistant") return new AIMessage(m.content);
                return new HumanMessage(m.content);
            });

            const consolidatedContent = batch.length > 1
                ? `[WHATSAPP BATCHED MESSAGES]\nThe user sent multiple messages in quick succession. Please consider all of them together as one turn:\n\n` +
                batch.map((m, i) => `--- MSG ${i + 1} (${new Date(m.createdAt).toLocaleTimeString()}) ---\n${m.content}`).join("\n\n")
                : primaryMsg.content;

            const result = await orchestrate(
                consolidatedContent,
                primaryMsg.tenantId,
                primaryMsg.sender,
                agent.id,
                primaryMsg.source as any,
                chatHistory,
                primaryMsg.channelAccountId,
                primaryMsg.id
            );

            const agentMessages = result?.messages || [];
            const lastMsg = agentMessages[agentMessages.length - 1];
            const responseContent = typeof lastMsg?.content === "string"
                ? lastMsg.content
                : JSON.stringify(lastMsg?.content);

            const isGhostMode = (agentChannel.config as any)?.ghostMode === true;
            const isActionable = ["BUSINESS", "GREETING"].includes(result.category || "");

            if (responseContent && isActionable) {
                // Determine if we should send or just save a ghost draft
                const status = isGhostMode ? "PROCESSING" : "COMPLETED"; // If ghost, keep PROCESSING so it shows as active/pending
                const isGhostReply = isGhostMode;

                await prisma.$transaction([
                    prisma.message.updateMany({
                        where: { id: { in: batchIds } },
                        data: { 
                            category: (result.category || "OTHER") as string,
                            status: isGhostMode ? "PROCESSING" : "COMPLETED",
                            trace: {
                                classification: result.category,
                                reason: (result as any).reason,
                                agentId: result.agentId,
                                isGhost: isGhostMode
                            } as any
                        }
                    }),
                    prisma.message.create({
                        data: {
                            tenantId: primaryMsg.tenantId,
                            channelAccountId: primaryMsg.channelAccountId,
                            role: "assistant",
                            content: isGhostMode ? "" : responseContent,
                            draftContent: isGhostMode ? responseContent : null,
                            isGhostReply: isGhostMode,
                            sender: agent.name,
                            source: primaryMsg.source,
                            threadId: primaryMsg.threadId || (primaryMsg.source === 'WHATSAPP' ? primaryMsg.sender : undefined),
                            parentMessageId: primaryMsg.id,
                            status: status,
                            category: (result.category || "OTHER") as string,
                            bookingStatus: result.bookingStatus,
                            trace: { ...result, isGhost: isGhostMode } as any
                        }
                    })
                ]);

                if (!isGhostMode && primaryMsg.channelAccountId) {
                    if (primaryMsg.source === 'email' || primaryMsg.source === 'GMAIL') {
                        const useHtml = (agentChannel.config as any)?.useHtmlEmail ?? true;
                        await this.sendEmailReply(primaryMsg, responseContent, agent, useHtml);
                    } else if (primaryMsg.source === 'WHATSAPP') {
                        const account = await prisma.channelAccount.findUnique({
                            where: { id: primaryMsg.channelAccountId }
                        });
                        if (account) {
                            try {
                                const { WhatsappManager } = await import('@/lib/integrations/whatsapp');
                                await WhatsappManager.sendMessage(account.address, primaryMsg.sender, responseContent);
                            } catch (err: any) {
                                console.error("[Processor] Failed to send WhatsApp reply:", err.message);
                            }
                        }
                    }
                }
            } else {
                const skipCategories = ["SPAM", "SOCIAL", "AUTOMATED", "OTHER"];
                if (result.category && skipCategories.includes(result.category)) {
                    await prisma.message.updateMany({
                        where: {
                            sender: primaryMsg.sender,
                            tenantId: primaryMsg.tenantId,
                            status: "RECEIVED",
                            id: { notIn: batchIds }
                        },
                        data: {
                            status: "SKIPPED",
                            category: result.category || "OTHER",
                            trace: { reason: `Batch skipped due to previous classification: ${result.category}` } as any
                        }
                    });
                }

                await prisma.message.updateMany({
                    where: { id: { in: batchIds } },
                    data: {
                        category: (result.category || "OTHER") as string,
                        status: "SKIPPED" // Explicitly mark as SKIPPED
                    }
                });
            }

        } catch (error: any) {
            const isRateLimit = error.status === 429 || error.lc_error_code === 'MODEL_RATE_LIMIT' || error.message?.includes('429');
            if (isRateLimit) {
                await prisma.agent.update({
                    where: { id: agent.id },
                    data: { isActive: false }
                });
            }
            throw error;
        }
    }



    private static async sendEmailReply(originalMsg: any, content: string, agent: any, useHtml: boolean = true) {
        try {
            const account = await prisma.channelAccount.findUnique({
                where: { id: originalMsg.channelAccountId! }
            });

            if (!account || account.type !== 'GMAIL') return;

            const creds = account.credentials as any;
            if (!creds || !creds.access_token) return;

            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );

            oauth2Client.setCredentials({
                access_token: creds.access_token,
                refresh_token: creds.refresh_token,
                expiry_date: creds.expires_at ? creds.expires_at * 1000 : undefined
            });

            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            const subjectMatch = originalMsg.content.match(/Subject: (.*)\n/);
            let rawSubject = subjectMatch ? subjectMatch[1].trim() : "Reply from Agent";
            const cleanSubject = rawSubject.replace(/^(re:\s*)+/gi, "").trim();
            const replySubject = `Re: ${cleanSubject}`;
            const parentRfcId = originalMsg.rfcMessageId || originalMsg.externalId;

            const raw = this.buildRawEmail(
                originalMsg.sender,
                account.address,
                replySubject,
                content,
                parentRfcId,
                useHtml,
                agent.id
            );

            await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    threadId: originalMsg.threadId || undefined,
                    raw
                }
            });

            console.log(`[Processor] Clean reply sent to ${originalMsg.sender} (Format: ${useHtml ? 'HTML' : 'TEXT'})`);

        } catch (error: any) {
            console.error("[Processor] Failed to send email reply:", error.message);
        }
    }

    private static buildRawEmail(to: string, from: string, subject: string, content: string, inReplyToMsgId: string, useHtml: boolean = true, agentId?: string) {
        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
        const rfcRef = inReplyToMsgId.startsWith("<") ? inReplyToMsgId : `<${inReplyToMsgId}>`;

        if (!useHtml) {
            const str = [
                `To: ${to}`,
                `From: ${from}`,
                `Subject: ${encodedSubject}`,
                `In-Reply-To: ${rfcRef}`,
                `References: ${rfcRef}`,
                "X-Chabba: true",
                agentId ? `X-Chabba-Agent-ID: ${agentId}` : "",
                "MIME-Version: 1.0",
                "Content-Type: text/plain; charset=utf-8",
                "Content-Transfer-Encoding: base64",
                "",
                Buffer.from(content).toString("base64"),
            ].join("\r\n");
            return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        }

        const boundary = `----=_Part_${Math.random().toString(36).substring(2)}`;
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
  .wrapper { background-color: #f9f9f9; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e1e1e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  p { margin-bottom: 15px; white-space: pre-wrap; font-size: 14px; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      ${content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '<br>').join('')}
    </div>
  </div>
</body>
</html>`.trim();

        const parts = [
            `To: ${to}`,
            `From: ${from}`,
            `Subject: ${encodedSubject}`,
            `In-Reply-To: ${rfcRef}`,
            `References: ${rfcRef}`,
            "X-Chabba: true",
            agentId ? `X-Chabba-Agent-ID: ${agentId}` : "",
            "MIME-Version: 1.0",
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            "Content-Type: text/plain; charset=utf-8",
            "Content-Transfer-Encoding: base64",
            "",
            Buffer.from(content).toString("base64"),
            "",
            `--${boundary}`,
            "Content-Type: text/html; charset=utf-8",
            "Content-Transfer-Encoding: base64",
            "",
            Buffer.from(htmlContent).toString("base64"),
            "",
            `--${boundary}--`
        ];

        const str = parts.join("\r\n");
        return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    private static async handleManagerIntervention(managerMsg: any, acm: any, batch: any[]) {
        const batchIds = batch.map(m => m.id);
        const text = managerMsg.content;
        
        // 1. Try to extract Reference ID: REF-ABC or [REF-ABC]
        const refMatch = text.match(/(?:\[)?(REF-[A-Z0-9]+)(?:\])?/i);
        const refId = refMatch ? refMatch[1].toUpperCase() : null;
        
        let targetMsg: any = null;
        
        if (refId) {
            console.log(`[Processor] Manager specified Reference ID: ${refId}`);
            // Find the message that has this referenceId in its trace
            targetMsg = await prisma.message.findFirst({
                where: {
                    tenantId: managerMsg.tenantId,
                    trace: { path: ["referenceId"], equals: refId } as any
                },
                orderBy: { createdAt: "desc" }
            });
            
            if (!targetMsg) {
                // Secondary check: search trace as a JSON string if path filtering is not supported by the PG version/driver
                const allRecentEscalations = await prisma.message.findMany({
                    where: { tenantId: managerMsg.tenantId, isEscalation: true },
                    orderBy: { createdAt: "desc" },
                    take: 20
                });
                targetMsg = allRecentEscalations.find(m => (m.trace as any)?.referenceId === refId);
            }
        }
        
        // 2. Fallback: Find most recent unhandled escalation in this thread or for this channel
        if (!targetMsg) {
            targetMsg = await prisma.message.findFirst({
                where: {
                    tenantId: managerMsg.tenantId,
                    channelAccountId: managerMsg.channelAccountId,
                    isEscalation: true,
                    status: { in: ["COMPLETED", "PROCESSING"] } // COMPLETED because the agent finished its turn
                },
                orderBy: { createdAt: "desc" }
            });
        }
        
        if (!targetMsg) {
            console.warn(`[Processor] Manager intervention from ${managerMsg.sender} but no target escalation found.`);
            return false; // Let the agent process it normally
        }
        
        console.log(`[Processor] Relaying manager intervention to client ${targetMsg.sender} (Thread: ${targetMsg.threadId})`);
        
        // 3. Clean manager's text (remove the tag)
        const cleanContent = text.replace(/(?:\[)?REF-[A-Z0-9]+(?:\])?/gi, "").replace(/^.*(?:Ref ID|Ref|Reference).*$/gim, "").trim();
        
        // 4. Draft the final reply using AI
        const history = await prisma.message.findMany({
            where: {
                tenantId: targetMsg.tenantId,
                OR: [
                    { sender: { contains: this.extractEmail(targetMsg.sender) } },
                    { threadId: targetMsg.threadId }
                ],
                createdAt: { lte: targetMsg.createdAt }
            },
            orderBy: { createdAt: "desc" },
            take: 10
        });

        const chatHistory = history.reverse().map(m => {
            if (m.role === "assistant") return new AIMessage(m.content);
            return new HumanMessage(m.content);
        });

        let finalAnswer = cleanContent;
        try {
            const llm = await getModel(managerMsg.tenantId, acm.agent.id);
            const sysPrompt = new SystemMessage(`
                You are ${acm.agent.name}. You are chatting with a customer.
                The customer recently escalated a complex question to you.
                Behind the scenes, your human manager provided you with the following definitive answer/instruction to give to the customer:
                
                MANAGER INSTRUCTION: "${cleanContent}"
                
                TASK: Write the exact, final message to send to the customer. 
                - Base your answer ENTIRELY on the manager's instruction.
                - DO NOT mention the manager. Write naturally directly to the customer. 
                - Adapt the tone to match an enthusiastic and helpful agent, and respect the previous chat context.
                - Keep it conversational.
            `);
            const response = await llm.invoke([sysPrompt, ...chatHistory]);
            finalAnswer = response.content.toString();
        } catch (err: any) {
            console.error("[Processor] Failed to generate AI drafted intervention:", err.message);
        }

        // 5. Create assistant reply for the client
        await prisma.$transaction([
            prisma.message.create({
                data: {
                    tenantId: managerMsg.tenantId,
                    channelAccountId: targetMsg.channelAccountId,
                    role: "assistant",
                    content: finalAnswer,
                    sender: acm.agent.name,
                    source: targetMsg.source,
                    threadId: targetMsg.threadId || undefined,
                    parentMessageId: targetMsg.id,
                    status: "COMPLETED",
                    category: "BUSINESS",
                    trace: { 
                        type: "MANAGER_INTERVENTION_COMPILED", 
                        managerSender: managerMsg.sender,
                        managerInstruction: cleanContent,
                        referenceId: refId || (targetMsg.trace as any)?.referenceId
                    } as any
                }
            }),
            prisma.message.updateMany({
                where: { id: { in: batchIds } },
                data: { status: "COMPLETED", category: "BUSINESS" }
            }),
            prisma.message.update({
                where: { id: targetMsg.id },
                data: { isEscalation: false } // Clear the escalation flag since it's resolved
            })
        ]);
        
        // 6. Send the message to the client
        if (targetMsg.source === 'WHATSAPP' && targetMsg.channelAccountId) {
            const account = await prisma.channelAccount.findUnique({ where: { id: targetMsg.channelAccountId } });
            if (account) {
                try {
                    const { WhatsappManager } = await import('@/lib/integrations/whatsapp');
                    await WhatsappManager.sendMessage(account.address, targetMsg.sender, finalAnswer);
                } catch (err: any) {
                    console.error("[Processor] Failed to relay manager WhatsApp intervention:", err.message);
                }
            }
        } else if ((targetMsg.source === 'email' || targetMsg.source === 'GMAIL') && targetMsg.channelAccountId) {
            await this.sendEmailReply(targetMsg, finalAnswer, acm.agent, true);
        }
        
        return true;
    }
}
