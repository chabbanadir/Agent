import { NextRequest, NextResponse } from "next/server";
import { agentExecutor } from "@/lib/agents/orchestrator";
import { HumanMessage } from "@langchain/core/messages";
import prisma from "@/lib/prisma";
import { AgentState } from "@/types/agent";

export async function POST(req: NextRequest) {
    try {
        const { message, tenantId, sender, channel } = await req.json();

        if (!message || !tenantId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Log the incoming message
        await prisma.message.create({
            data: {
                tenantId,
                content: message,
                sender,
                source: "api",
                role: "user"
            }
        });

        // 2. Run the agentic orchestrator
        const result = (await agentExecutor.invoke({
            messages: [new HumanMessage(message)],
            tenantId: tenantId,
            channel: channel,
        })) as unknown as AgentState;

        if (result.next === "END" && result.messages.length > 1) {
            const lastMessage = result.messages[result.messages.length - 1].content.toString();

            // 3. Log the response
            await prisma.message.create({
                data: {
                    tenantId,
                    content: lastMessage,
                    sender: "assistant",
                    source: "api",
                    role: "assistant"
                }
            });

            return NextResponse.json({ response: lastMessage });
        }

        return NextResponse.json({ response: "Message processed, but no response generated." });
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
