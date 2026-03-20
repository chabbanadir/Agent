import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { getModel } from "../llm/gateway";
import prisma from "@/lib/prisma";

export async function clerkNode(state: any) {
    const { messages, context, persuasionLevel = 0.8, tenantId, agentId } = state;
    const lastMessage = messages[messages.length - 1].content;

    // Fetch the agent to get the custom system prompt
    const agent = agentId
        ? await prisma.agent.findUnique({ where: { id: agentId } })
        : await prisma.agent.findFirst({ where: { tenantId, isActive: true } });

    const clerk = await getModel(tenantId, agentId);

    const basePrompt = agent?.systemPrompt || "You are a persuasive Sales Clerk.";
    const systemPrompt = `${basePrompt}
Your goal is to answer the user's question using the provided context AND push them to book a service.
Persuasion Level: ${persuasionLevel} (out of 1).

Context info:
${context.join("\n")}

Be helpful, concise, and always include a Call-To-Action (CTA) at the end.`;

    console.log(`[Clerk] Generating response with ${context.length} context items...`);
    const response = await clerk.invoke([
        new SystemMessage(systemPrompt),
        ...messages
    ]);

    console.log(`[Clerk] generated response: ${response.content.toString().substring(0, 50)}...`);

    return {
        messages: [response],
        next: "END"
    };
}
