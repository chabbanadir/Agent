import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { orchestrate } from "@/lib/agents/orchestrator";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
        }

        const token = authHeader.split(' ')[1];

        // Authenticate using the ApiKey
        const apiKey = await prisma.apiKey.findUnique({
            where: { key: token },
            include: { tenant: true }
        });

        if (!apiKey) {
            return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
        }

        // Update last used timestamp asynchronously
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsed: new Date() }
        }).catch(console.error);

        const body = await req.json();
        const { agentId, message, channel = "CHAT", history = [] } = body;

        if (!agentId || !message) {
            return NextResponse.json({ error: "agentId and message are required in the payload" }, { status: 400 });
        }

        // Verify the agent belongs to this tenant
        const agent = await prisma.agent.findFirst({
            where: { id: agentId, tenantId: apiKey.tenantId, isActive: true }
        });

        if (!agent) {
            return NextResponse.json({ error: "Agent not found or inactive" }, { status: 404 });
        }

        // Send to orchestrator
        const result = await orchestrate(message, apiKey.tenantId, agentId, channel.toUpperCase(), history);

        // Save the external message to DB for history
        const dbMessage = await prisma.message.create({
            data: {
                tenantId: apiKey.tenantId,
                role: "user",
                source: "api",
                sender: "external_api",
                content: message,
                status: "COMPLETED",
                category: result.category || "OTHER"
            }
        });

        const agentMessages = result.messages || [];
        const lastMsg = agentMessages[agentMessages.length - 1];
        const responseContent = typeof lastMsg?.content === "string"
            ? lastMsg.content
            : JSON.stringify(lastMsg?.content) || "No response generated";

        // Save AI response to DB
        await prisma.message.create({
            data: {
                tenantId: apiKey.tenantId,
                role: "assistant",
                content: responseContent,
                sender: agent.name,
                source: "api",
                parentMessageId: dbMessage.id,
                status: "COMPLETED",
                category: result.category || "OTHER",
                bookingStatus: result.bookingStatus || "NONE",
                trace: result as any
            }
        });

        return NextResponse.json({
            success: true,
            reply: responseContent,
            category: result.category,
            bookingStatus: result.bookingStatus
        });

    } catch (error: any) {
        console.error("External Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
