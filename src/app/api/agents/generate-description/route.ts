import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { getModel } from "@/lib/llm/gateway";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { agentId } = await req.json();
        if (!agentId) {
            return NextResponse.json({ error: "agentId is required" }, { status: 400 });
        }

        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: { tenant: true }
        }) as any;

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // 1. Get linked documents from agent config
        const config = agent.config as any;
        const allowedDocs = config?.allowedDocuments || [];

        if (allowedDocs.length === 0) {
            return NextResponse.json({
                description: "General assistant with no specialized document knowledge."
            });
        }

        // 2. Fetch document titles and a snippet of content
        const docs = await prisma.document.findMany({
            where: { id: { in: allowedDocs } },
            select: { name: true, content: true }
        });

        const docSummary = docs.map(d => `- ${d.name}: ${d.content.slice(0, 100)}...`).join("\n");

        // 3. Use LLM to generate a description
        const model = await getModel(agent.tenantId, agent.id);
        const response = await model.invoke([
            new SystemMessage(`You are a system administrator. Based on the following document context, generate a ONE SENTENCE professional specialty description for an AI agent. 
            The description should start with "Specialist in..." or "Handles..." 
            Be concise and specific.`),
            new HumanMessage(`Documents assigned to this agent:\n${docSummary}`)
        ]);

        const description = typeof response.content === "string"
            ? response.content.trim().replace(/^["']|["']$/g, '')
            : "Specialist in the provided business documentation.";

        return NextResponse.json({ description });

    } catch (error: any) {
        console.error("[Generate Description Error]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
