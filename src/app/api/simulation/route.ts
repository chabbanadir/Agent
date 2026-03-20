import { NextRequest, NextResponse } from "next/server";
import { agentExecutor } from "@/lib/agents/orchestrator";
import { HumanMessage } from "@langchain/core/messages";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AgentState } from "@/types/agent";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const { sender, message, agentId } = await req.json() as { sender: string; message: string; agentId?: string };

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        console.log(`[Simulation] Invoking agent for tenant ${tenantId} | Sender: ${sender} | Agent: ${agentId}`);

        // Run the agentic orchestrator
        const result = (await agentExecutor.invoke({
            messages: [new HumanMessage(message)],
            tenantId: tenantId,
            agentId: agentId,
            next: "orchestrate",
            context: []
        })) as unknown as AgentState;

        console.log(`[Simulation] Result keys: ${Object.keys(result || {})}`);
        if (result?.messages) {
            console.log(`[Simulation] Num messages: ${result.messages.length}`);
        }

        // The result in AgentState will contain the full trace and messages
        return NextResponse.json({
            success: true,
            trace: result,
            response: result.messages?.[result.messages.length - 1]?.content || "No response generated."
        });

    } catch (error: any) {
        console.error("Simulation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
