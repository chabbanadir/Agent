import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const groupId = decodeURIComponent(params.id);

        // Fetch messages for the tenant - DESC for newest first
        const messages = await prisma.message.findMany({
            where: {
                tenantId,
                OR: [
                    { category: null },
                    { NOT: { category: { in: ["SPAM", "SOCIAL", "OTHER"] } } }
                ]
            },
            orderBy: { createdAt: "desc" },
            take: 1000
        }) as any[];

        // Helper to extract bare email
        const extractEmail = (str: string) => {
            if (!str) return "unknown";
            const match = str.match(/<([^>]+)>/);
            return match ? match[1].toLowerCase() : str.toLowerCase();
        };

        const formatSenderDisplay = (sender: string, source?: string) => {
            if (source === 'WHATSAPP' || sender.includes('@s.whatsapp.net') || sender.includes('@g.us')) {
                if (sender.includes('@g.us')) {
                    const id = sender.split('@')[0];
                    return `Group: ${id}`;
                }
                const digits = sender.split('@')[0];
                return `+${digits}`;
            }
            return sender;
        };

        // Group messages into conversations
        const groups: Record<string, any[]> = {};
        const threadToGroup = new Map<string, string>(); // threadId -> groupId
        const msgIdToGroup = new Map<string, string>(); // messageId -> groupId

        // Two-pass grouping: user messages first, then assistant replies
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        userMessages.forEach((msg: any) => {
            const displaySender = formatSenderDisplay(msg.sender, msg.source);
            const emailOrPhone = msg.source === 'WHATSAPP' ? displaySender : extractEmail(msg.sender);
            const channelId = msg.channelAccountId || "default";
            const accountSenderKey = `${channelId}:${emailOrPhone}`;
            
            let idToUse = msg.threadId;

            if (idToUse && threadToGroup.has(idToUse)) {
                idToUse = threadToGroup.get(idToUse);
            } else if (!idToUse) {
                idToUse = `group-${accountSenderKey}`;
            }

            if (msg.threadId && !threadToGroup.has(msg.threadId)) {
                threadToGroup.set(msg.threadId, idToUse!);
            }

            if (!groups[idToUse!]) {
                groups[idToUse!] = [];
            }
            groups[idToUse!].push(msg);
            msgIdToGroup.set(msg.id, idToUse!);
        });

        // Pass 2: Attach assistant replies via parentMessageId
        assistantMessages.forEach((msg: any) => {
            let groupId: string | undefined;

            if (msg.parentMessageId && msgIdToGroup.has(msg.parentMessageId)) {
                groupId = msgIdToGroup.get(msg.parentMessageId);
            } else if (msg.threadId && threadToGroup.has(msg.threadId)) {
                groupId = threadToGroup.get(msg.threadId);
            } else if (msg.source === 'WHATSAPP' && msg.channelAccountId) {
                for (const [gId, gMsgs] of Object.entries(groups)) {
                    if (gMsgs.some((m: any) => m.channelAccountId === msg.channelAccountId && m.role === 'user')) {
                        groupId = gId;
                        break;
                    }
                }
            }

            if (!groupId) {
                const displaySender = formatSenderDisplay(msg.sender, msg.source);
                const emailOrPhone = msg.source === 'WHATSAPP' ? displaySender : extractEmail(msg.sender);
                const channelId = msg.channelAccountId || "default";
                groupId = `group-${channelId}:${emailOrPhone}`;
            }

            if (!groups[groupId]) {
                groups[groupId] = [];
            }
            groups[groupId].push(msg);
            msgIdToGroup.set(msg.id, groupId);
        });

        const rawGroupMessages = groups[groupId] || [];
        const groupMessages = rawGroupMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (groupMessages.length === 0) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        // --- ON-DEMAND SYNC FOR WHATSAPP ---
        const firstUserMsg = groupMessages.find(m => m.role === 'user' && m.source === 'WHATSAPP');
        if (firstUserMsg && firstUserMsg.channelAccountId) {
            try {
                const { WhatsappManager } = await import("@/lib/integrations/whatsapp");
                // remoteJid is stored in 'sender' for WhatsApp messages in this system
                await WhatsappManager.syncRecentHistory(
                    firstUserMsg.channelAccountId, 
                    firstUserMsg.sender, 
                    tenantId
                );
            } catch (syncErr: any) {
                console.warn("[History API] On-demand sync failed:", syncErr.message);
            }
        }
        // ------------------------------------

        // Return the group info
        const userMsg = groupMessages.find(m => m.role === 'user') || groupMessages[0];
        const assistantMsg = [...groupMessages].reverse().find(m => m.role === 'assistant');

        return NextResponse.json({
            id: groupId,
            sender: formatSenderDisplay(userMsg.sender, userMsg.source),
            senderName: userMsg.senderName,
            agentName: assistantMsg ? assistantMsg.sender : null,
            source: userMsg.source,
            messages: groupMessages,
            updatedAt: groupMessages[groupMessages.length - 1].createdAt
        });

    } catch (error: any) {
        console.error("Single Chat History Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
