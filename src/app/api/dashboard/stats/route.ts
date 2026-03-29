import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId;

        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch KPI aggregates in parallel
        const [totalMessages, activeAgents, totalDocs, bookedMessages, totalAiMessages] = await Promise.all([
            prisma.message.count({ where: { tenantId } }),
            prisma.agent.count({ where: { tenantId, isActive: true } }),
            prisma.document.count({ where: { tenantId } }),
            prisma.message.count({ where: { tenantId, role: "assistant", bookingStatus: "BOOKED" } }),
            prisma.message.count({ where: { tenantId, role: "assistant" } })
        ]);

        // Calculate conversion rate specifically for AI responses
        const conversionRate = totalAiMessages > 0
            ? Math.round((bookedMessages / totalAiMessages) * 100)
            : 0;

        // 2. Fetch Recent System Events (Mix of latest messages and doc uploads)
        const recentMessages = await prisma.message.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: 15,
            select: {
                id: true,
                role: true,
                sender: true,
                source: true,
                category: true,
                bookingStatus: true,
                content: true,
                createdAt: true,
                trace: true
            }
        });

        const recentDocs = await prisma.document.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: { id: true, name: true, createdAt: true }
        });

        // Format and merge events for the "Recent Events" sidebar (max 5)
        const formattedEvents = [
            ...recentMessages.slice(0, 3).map(m => ({
                id: m.id,
                type: 'message',
                text: m.role === 'assistant' ? `Agent replied via ${m.category}` : `New message from ${m.sender}`,
                time: m.createdAt.toISOString()
            })),
            ...recentDocs.map(d => ({
                id: d.id,
                type: 'doc',
                text: `Document "${d.name}" indexed`,
                time: d.createdAt.toISOString()
            }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

        // Map activity stream focusing specifically on Agent interactions and thoughts
        const activityStream = recentMessages
            .filter(m => m.role === 'assistant' || (m.role === 'user' && m.category))
            .slice(0, 10)
            .map(m => {
                let text = "Processed query.";
                if (m.role === 'assistant') {
                    if (m.bookingStatus === 'BOOKED') text = "Agent finalized a booking! 🎉";
                    else if (m.category !== 'OTHER') text = `Agent handled a ${m.category} inquiry.`;
                    else text = "Agent responded to conversation.";
                } else if (m.category === 'OTHER') {
                    text = "Ignored non-business chatter.";
                } else if (m.category === 'AUTOMATED') {
                    text = "Dropped automated system email.";
                } else if (m.category === 'GREETING') {
                    text = "Bypassed research for simple greeting.";
                } else {
                    text = `Classified as ${m.category}. Requesting Agent.`;
                }

                return {
                    id: m.id,
                    actor: m.sender || (m.role === 'assistant' ? 'Agent' : 'User'),
                    sender: m.sender,
                    source: m.source,
                    role: m.role,
                    action: text,
                    category: m.category,
                    timestamp: m.createdAt.toISOString()
                };
            });

        return NextResponse.json({
            stats: {
                totalMessages,
                activeAgents,
                totalDocs,
                conversionRate: `${conversionRate}%`,
            },
            events: formattedEvents,
            activityStream
        });

    } catch (error: any) {
        console.error("Dashboard Stats API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
