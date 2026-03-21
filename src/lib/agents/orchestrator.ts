import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentState } from "@/types/agent";
import { researcherNode } from "./researcher";
import { clerkNode } from "./clerk";
import { getModel } from "../llm/gateway";
import prisma from "@/lib/prisma";

// Define the state transitions
const orchestratorNode = async (state: AgentState) => {
    const { messages, tenantId } = state;
    const lastMessage = messages[messages.length - 1];
    const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    // Fetch all active agents for this tenant to provide context for routing
    const activeAgents = await prisma.agent.findMany({
        where: { tenantId, isActive: true }
    });

    const agentList = activeAgents.length > 0
        ? activeAgents.map(a => `- ID: ${a.id} | NAME: ${a.name} | SPECIALTY: ${a.description || 'General support'}`).join('\n')
        : "- No specialized agents found. Use Default.";

    // Use the dynamic model gateway (classifier usually uses default or specific if provided)
    const classifier = await getModel(tenantId);

    try {
        const classification = await classifier.invoke([
            new SystemMessage(`
                Role: AI Ecosystem Orchestrator. 
                Goal: Classify the message and pick the best Agent.

                CATEGORIES:
                1. BUSINESS: Inquiries about services, support, sales, or technical help.
                2. CLOSURE: "Thanks", "Bye", etc.
                3. SPAM/SOCIAL: Promotions or social media alerts.
                4. OTHER: General chatter.

                AGENTS:
                ${agentList}

                INSTRUCTIONS:
                - If the message is about help, technical issues, or buying something, use "BUSINESS".
                - If "BUSINESS", you MUST pick an Agent ID from the list.
                - Reply ONLY with JSON.

                EXAMPLES:
                - "I need help with my login" -> {"category": "BUSINESS", "agentId": "SUPPORT_ID", "reason": "Technical support"}
                - "How much is the pro plan?" -> {"category": "BUSINESS", "agentId": "SALES_ID", "reason": "Product pricing"}
                - "Thanks anyway" -> {"category": "CLOSURE", "agentId": null, "reason": "Ending conversation"}

                FORMAT:
                {
                  "category": "BUSINESS | CLOSURE | SPAM | SOCIAL | OTHER",
                  "agentId": "ID_HERE or null",
                  "reason": "..."
                }
            `),
            new HumanMessage(query)
        ]);

        let result;
        try {
            // Attempt to parse JSON response
            const content = classification.content.toString();
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : { category: "OTHER", agentId: null };
        } catch (e) {
            console.error("[Orchestrator] Failed to parse JSON, defaulting:", e);
            result = { category: "OTHER", agentId: null };
        }

        const category = result.category.toUpperCase();
        console.log(`[Orchestrator] Classification: ${category} | Agent: ${result.agentId}`);

        const ignoreCategories = ["SPAM", "SOCIAL", "OTHER", "CLOSURE"];
        const finalCategory = ignoreCategories.includes(category) ? category : "BUSINESS";

        // Add orchestration thought for the trace
        const thoughtMessage = {
            role: "thought",
            content: `[Orchestrator] Classified as ${finalCategory}. Reason: ${result.reason || "Automatic routing"}. Selected Agent: ${result.agentId || "Default"}`
        };

        if (finalCategory !== "BUSINESS") {
            return {
                messages: [thoughtMessage],
                next: "__end__",
                category: finalCategory
            };
        }

        return {
            messages: [thoughtMessage],
            next: "research",
            category: finalCategory,
            agentId: result.agentId || (activeAgents[0]?.id) // Fallback to first active
        };

    } catch (error) {
        console.error("[Orchestrator] Classification failed:", error);
        return {
            messages: [new AIMessage("I encountered an error while trying to classify your request. Please try again later.")],
            next: "__end__",
            category: "OTHER"
        };
    }

};

// Build the graph
const workflow = new StateGraph<AgentState>({
    channels: {
        messages: {
            value: (x, y) => {
                if (!y) return x;
                return x.concat(y);
            },
            default: () => []
        },
        tenantId: {
            value: (x, y) => y ?? x,
            default: () => ""
        },
        agentId: {
            value: (x, y) => y ?? x,
            default: () => undefined
        },
        next: {
            value: (x, y) => y ?? x,
            default: () => ""
        },
        category: {
            value: (x, y) => y ?? x,
            default: () => undefined
        },
        context: {
            value: (x, y) => (x || []).concat(y || []),
            default: () => []
        }
    }
})
    .addNode("orchestrate", orchestratorNode)
    .addNode("research", researcherNode)
    .addNode("respond", clerkNode)
    .addEdge("__start__", "orchestrate")
    .addConditionalEdges("orchestrate", (state) => {
        // Map next value to known node names
        const next = state.next;
        if (next === "research") return "research";
        return "__end__";
    }, {
        research: "research",
        __end__: END
    })
    .addEdge("research", "respond")
    .addEdge("respond", END);

export const agentExecutor = workflow.compile();

export async function orchestrate(query: string, tenantId: string, agentId?: string): Promise<AgentState> {
    return await agentExecutor.invoke({
        messages: [new HumanMessage(query)],
        tenantId,
        agentId,
        next: "orchestrate",
        context: []
    }) as unknown as AgentState;
}
