import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const escalations = await prisma.message.findMany({
            where: { isEscalation: true },
            orderBy: { createdAt: "desc" },
            include: {
                tenant: {
                    select: { name: true }
                }
            }
        });
        return NextResponse.json(escalations);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { messageId, replyContent } = await req.json();

        if (!messageId || !replyContent) {
            return NextResponse.json({ error: "Missing messageId or replyContent" }, { status: 400 });
        }

        const originalMessage = await prisma.message.findUnique({
            where: { id: messageId },
            include: { channelAccount: true }
        });

        if (!originalMessage) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        // 1. Create the reply message in the DB
        const reply = await prisma.message.create({
            data: {
                tenantId: originalMessage.tenantId,
                channelAccountId: originalMessage.channelAccountId,
                threadId: originalMessage.threadId,
                role: "assistant", // Manager acts as the assistant/agent
                content: replyContent,
                sender: "Manager",
                source: originalMessage.source,
                status: "APPROVED", // Manager bypasses normal processing
                isEscalation: false
            }
        });

        // 2. Mark the original escalation as resolved
        await prisma.message.update({
            where: { id: messageId },
            data: { isEscalation: false }
        });

        return NextResponse.json({ success: true, reply });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
