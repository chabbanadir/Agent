import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { getModel } from "../llm/gateway";

export async function clerkNode(state: any) {
    const { messages, context, persuasionLevel = 0.8, tenantId } = state;
    const lastMessage = messages[messages.length - 1].content;

    const clerk = await getModel(tenantId);

    const systemPrompt = `You are a persuasive Sales Clerk. 
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
