import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentState } from "@/types/agent";
import { researcherNode } from "./researcher";
import { clerkNode } from "./clerk";
import { getModel } from "../llm/gateway";

// Define the state transitions
const orchestratorNode = async (state: AgentState) => {
    const { messages, tenantId, agentId } = state;
    const lastMessage = messages[messages.length - 1];
    const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    // Use the dynamic model gateway
    const classifier = await getModel(tenantId, agentId);

    try {
        const classification = await classifier.invoke([
            new SystemMessage(`
                You are a decision layer for an AI agent representing a surf company. 
                Classify the incoming message into one of these categories:
                - BUSINESS: High-intent messages about surfing, surf lessons, gear, hours, or company-related inquiries.
                - CLOSURE: Messages like "thank you", "goodbye", "see ya", or "have a nice day" that signal the end of a conversation.
                - SOCIAL: Notifications from social media platforms (Twitch, Instagram, etc.).
                - SPAM: Promotional emails, ads, or phishing.
                - OTHER: Anything else that doesn't require a business response.

                CRITICAL: The company ONLY provides surf-related services. If someone asks for screen repair or something else, it is NOT business.
                
                Reply with EXACTLY the category name in UPPERCASE. Default to OTHER if unsure.
            `),
            new HumanMessage(query)
        ]);

        const content = classification.content.toString().toUpperCase().trim();
        console.log(`[Orchestrator] Classification result: "${content}"`);

        // Any of these should stop the loop
        const ignoreCategories = ["SPAM", "SOCIAL", "OTHER", "CLOSURE"];
        const category = ignoreCategories.includes(content) ? content : "BUSINESS";

        if (category !== "BUSINESS") {
            return { next: "__end__", category };
        }

        return { next: "research", category };
    } catch (error) {
        console.error("[Orchestrator] Classification failed, defaulting to OTHER:", error);
        return { next: "__end__", category: "OTHER" };
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
