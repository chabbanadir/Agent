import prisma from "@/lib/prisma";
import { GmailService } from "../integrations/gmail";

export async function escalateToManager(
    messageId: string | null, 
    tenantId: string, 
    contextOverride?: { 
        sender?: string; 
        content?: string; 
        channelAccountId?: string;
        briefing?: string;
        referenceId?: string;
    }
) {
    console.log(`[Escalation] Starting escalation for ${messageId ? `message ${messageId}` : "SIMULATION"}...`);

    try {
        let message: any = null;
        let tenant: any = null;

        if (messageId) {
            const [m, t] = await Promise.all([
                prisma.message.findUnique({
                    where: { id: messageId },
                    include: { channelAccount: true }
                }),
                prisma.tenant.findUnique({
                    where: { id: tenantId }
                })
            ]);
            message = m;
            tenant = t;
        } else {
            tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
            message = {
                sender: contextOverride?.sender || "Simulated User",
                content: contextOverride?.content || "No content",
                channelAccountId: contextOverride?.channelAccountId,
                channelAccount: null
            };
        }

        if (!tenant || !message) {
            console.error("[Escalation] Tenant or Message context not found for escalation");
            return false;
        }

        const briefing = contextOverride?.briefing || "";
        const referenceId = contextOverride?.referenceId || "";

        // 1b. Try to find the specific agent for this channel
        let escalationChannel = tenant.escalationChannel;
        let managerWhatsapp = tenant.managerWhatsapp;
        let managerEmail = tenant.managerEmail;

        if (message.channelAccountId) {
            const agentChannel = await prisma.agentChannel.findFirst({
                where: { channelAccountId: message.channelAccountId, isActive: true },
                include: { agent: true }
            });

            if (agentChannel?.agent) {
                const agent = agentChannel.agent;
                if (agent.escalationChannel) escalationChannel = agent.escalationChannel;
                if (agent.managerWhatsapp) managerWhatsapp = agent.managerWhatsapp;
                if (agent.managerEmail) managerEmail = agent.managerEmail;
            }
        }

        let managerContact = escalationChannel === "WHATSAPP" 
            ? managerWhatsapp 
            : managerEmail;

        if (!managerContact) {
            if (escalationChannel === "EMAIL" && managerWhatsapp) {
                console.log("[Escalation] Falling back to WHATSAPP manager contact as no EMAIL was found.");
                escalationChannel = "WHATSAPP";
                managerContact = managerWhatsapp;
            } else if (escalationChannel === "WHATSAPP" && managerEmail) {
                console.log("[Escalation] Falling back to EMAIL manager contact as no WHATSAPP number was found.");
                escalationChannel = "EMAIL";
                managerContact = managerEmail;
            }
        }

        if (!managerContact) {
            console.warn(`[Escalation] No manager contact configured for escalation on channel ${escalationChannel}`);
            return false;
        }

        // If it's a simulation, we don't actually send real messages
        if (!messageId) {
            console.log(`[Escalation] SIMULATION MODE: Escalation would be sent to manager (${managerContact})`);
            console.log(`[Escalation] BRIEFING: ${briefing}`);
            console.log(`[Escalation] REF: ${referenceId}`);
            return true;
        }

        let briefingContext = "Needs manager input (availability, pricing, or custom offer).";
        let briefingSummary = "No summary provided.";

        if (briefing && briefing.includes("|||")) {
            const parts = briefing.split("|||");
            briefingContext = parts[0].trim();
            briefingSummary = parts[1].trim();
        } else if (briefing) {
            briefingContext = briefing;
        }

        const escalationSubject = `🚨 [${referenceId || "ESCALATION"}] Action Required for ${message.sender}`;
        const escalationBody = `
ref : ${referenceId || "N/A"}
number : ${message.sender}
context : ${briefingContext}
client request : ${briefingSummary}

${message.content}

Please include the reference tag ${referenceId} in your reply to automatically route it back to this client.
        `.trim();

        // Send via the configured channel (Gmail for now if email)
        if (escalationChannel === "EMAIL" && message.channelAccount?.type === "GMAIL") {
            const gmail = new GmailService(tenantId);
            const success = await gmail.sendEmail(
                message.channelAccount,
                managerContact,
                escalationSubject,
                escalationBody,
                message.threadId || undefined
            );

            if (success) {
                console.log(`[Escalation] Successfully sent escalation email to ${managerContact}`);
                return true;
            }
        }

        // WhatsApp escalation
        if (escalationChannel === "WHATSAPP" && managerContact) {
            try {
                const { WhatsappManager } = await import("../integrations/whatsapp");
                
                // Determine the sender address:
                // 1. Use the address of the ChannelAccount that received the message
                // 2. OR fall back to tenant's configured whatsappNumber
                let senderAddress = message.channelAccount?.address;
                if (!senderAddress && tenant.whatsappNumber) {
                    senderAddress = tenant.whatsappNumber;
                }

                if (senderAddress) {
                    await WhatsappManager.sendMessage(
                        senderAddress,
                        managerContact,
                        escalationBody
                    );
                    console.log(`[Escalation] Successfully sent WhatsApp escalation from ${senderAddress} to ${managerContact}`);
                    return true;
                } else {
                    console.warn("[Escalation] No sender address available for WhatsApp escalation");
                }
            } catch (err: any) {
                console.error("[Escalation] WhatsApp escalation failed:", err.message);
            }
        }
        
        return false;

    } catch (error) {
        console.error("[Escalation] Fatal error during escalation:", error);
        return false;
    }
}
