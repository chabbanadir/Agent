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
                NOT: {
                    category: { in: ["SPAM", "SOCIAL", "OTHER"] }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 200 // Fetch more to allow grouping
        }) as any[];

        // Group messages into conversations
        const groups: Record<string, any[]> = {};

        messages.forEach(msg => {
            // Priority 1: Gmail Thread ID
            // Priority 2: Sender (for unthreaded messages)
            const groupId = msg.threadId || `sender:${msg.sender}`;
            if (!groups[groupId]) groups[groupId] = [];
            groups[groupId].push(msg);
        });

        // Map groups to a clean format
        const finalResults = Object.entries(groups).map(([id, msgs]) => ({
            id,
            lastMessage: msgs[0],
            messages: msgs.reverse(), // History in chronological order
            sender: msgs[0].sender,
            source: msgs[0].source,
            count: msgs.length,
            updatedAt: msgs[0].createdAt
        })).sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return NextResponse.json(finalResults);
    } catch (error: any) {
        console.error("Chat History Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
