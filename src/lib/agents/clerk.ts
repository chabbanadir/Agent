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

    // Add thought about response generation
    const thoughtMessage = {
        role: "thought",
        content: `[Clerk] Generating response using ${context.length > 0 ? context.length : "NO"} context chunks. ${context.length === 0 ? "Advising user that specialized domain knowledge is unavailable." : ""}`
    };

    // Filter messages to only include those compatible with LLM providers (Human, AI, System)
    // We remove our custom 'thought' messages from the history sent to the LLM
    const chatHistory = messages.filter((m: any) => m.role !== 'thought' && m.role !== 'system_thought');

    const response = await clerk.invoke([
        new SystemMessage(systemPrompt),
        ...chatHistory
    ]);

    console.log(`[Clerk] generated response: ${response.content.toString().substring(0, 50)}...`);


    return {
        messages: [thoughtMessage, response],
        next: "END"
    };

}
