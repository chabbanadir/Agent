import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        // Fetch all messages for the tenant, ordered by creation date
        // Filter out SPAM, SOCIAL, and OTHER categories
        const messages = await prisma.message.findMany({
            where: {
                tenantId,
                status: {
                    notIn: ["SKIPPED", "FAILED"]
                },
                OR: [
                    { category: null },
                    { NOT: { category: { in: ["SPAM", "SOCIAL", "OTHER", "AUTOMATED"] } } }
                ]
            },
            orderBy: { createdAt: "desc" },
            take: 200 // Fetch more to allow grouping
        }) as any[];

        // Helper to extract bare email from "Name <email>"
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
        const msgIdToGroup = new Map<string, string>(); // messageId -> groupId (for parentMessageId linking)

        // Two-pass grouping: first user messages, then assistant replies
        // Pass 1: Group user messages by thread or account+sender
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        userMessages.forEach((msg: any) => {
            const displaySender = formatSenderDisplay(msg.sender, msg.source);
            const emailOrPhone = msg.source === 'WHATSAPP' ? displaySender : extractEmail(msg.sender);
            const channelId = msg.channelAccountId || "default";
            const accountSenderKey = `${channelId}:${emailOrPhone}`;
            
            let groupId = msg.threadId;

            if (groupId && threadToGroup.has(groupId)) {
                groupId = threadToGroup.get(groupId);
            } else if (!groupId) {
                groupId = `group-${accountSenderKey}`;
            }

            if (msg.threadId && !threadToGroup.has(msg.threadId)) {
                threadToGroup.set(msg.threadId, groupId!);
            }

            if (!groups[groupId!]) {
                groups[groupId!] = [];
            }
            groups[groupId!].push(msg);
            msgIdToGroup.set(msg.id, groupId!);
        });

        // Pass 2: Attach assistant replies to their parent's group
        assistantMessages.forEach((msg: any) => {
            let groupId: string | undefined;

            // First: try linking via parentMessageId
            if (msg.parentMessageId && msgIdToGroup.has(msg.parentMessageId)) {
                groupId = msgIdToGroup.get(msg.parentMessageId);
            }
            // Second: try threadId
            else if (msg.threadId && threadToGroup.has(msg.threadId)) {
                groupId = threadToGroup.get(msg.threadId);
            }
            // Third: for WhatsApp, try to find a user group on the same channel account
            else if (msg.source === 'WHATSAPP' && msg.channelAccountId) {
                // Look for any existing group on this channel that has user messages
                for (const [gId, gMsgs] of Object.entries(groups)) {
                    const hasMatchingUser = gMsgs.some((m: any) => 
                        m.channelAccountId === msg.channelAccountId && m.role === 'user'
                    );
                    if (hasMatchingUser) {
                        groupId = gId;
                        break;
                    }
                }
            }
            
            // Fallback: create own group (shouldn't happen normally)
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

        // Map groups to a clean format
        const finalResults = Object.entries(groups).map(([id, msgs]) => {
            // Sort grouped messages chronologically (asc)
            const chronological = msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            // Find the primary user message to declare the human sender string
            const userMsg = chronological.find(m => m.role === 'user') || chronological[0];
            // Find the latest agent assignment
            const assistantMsg = [...chronological].reverse().find(m => m.role === 'assistant');

            // Check if any message in the group was escalated
            const isEscalation = msgs.some(m => m.isEscalation === true);

            return {
                id,
                lastMessage: chronological[chronological.length - 1],
                messages: chronological,
                sender: formatSenderDisplay(userMsg.sender, userMsg.source),
                senderName: userMsg.senderName,
                agentName: assistantMsg ? assistantMsg.sender : null,
                source: userMsg.source,
                isEscalation,
                count: chronological.length,
                updatedAt: chronological[chronological.length - 1].createdAt
            };
        }).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        // Fetch all channel accounts for this tenant to provide as filters
        const availableChannels = await prisma.channelAccount.findMany({
            where: { tenantId }
        });

        return NextResponse.json({
            threads: finalResults,
            availableChannels
        });
    } catch (error: any) {
        console.error("Chat History Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
