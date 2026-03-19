import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        // Fetch all messages for the tenant, ordered by creation date
        const messages = await prisma.message.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: 200 // Fetch more to allow grouping
        }) as any[];

        // Group by threadId
        const threads: Record<string, any[]> = {};
        const unthreaded: any[] = [];

        messages.forEach(msg => {
            if (msg.threadId) {
                if (!threads[msg.threadId]) threads[msg.threadId] = [];
                threads[msg.threadId].push(msg);
            } else {
                unthreaded.push(msg);
            }
        });

        // Map threads to a clean format
        const threadedList = Object.entries(threads).map(([id, msgs]) => ({
            id,
            lastMessage: msgs[0],
            messages: msgs.reverse(), // History in chronological order
            sender: msgs[0].sender,
            source: msgs[0].source,
            count: msgs.length,
            updatedAt: msgs[0].createdAt
        }));

        // Combine with unthreaded (each unthreaded msg is its own 'thread')
        const finalResults = [
            ...threadedList,
            ...unthreaded.map(msg => ({
                id: msg.id,
                lastMessage: msg,
                messages: [msg],
                sender: msg.sender,
                source: msg.source,
                count: 1,
                updatedAt: msg.createdAt
            }))
        ].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return NextResponse.json(finalResults);
    } catch (error: any) {
        console.error("Chat History Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
