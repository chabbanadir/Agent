import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentState } from "@/types/agent";
import { researcherNode } from "./researcher";
import { clerkNode } from "./clerk";
import { getModel } from "../llm/gateway";

// Define the state transitions
const orchestratorNode = async (state: AgentState) => {
    const { messages, tenantId } = state;
    const lastMessage = messages[messages.length - 1];
    const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    // Use the dynamic model gateway
    const classifier = await getModel(tenantId);

    try {
        const classification = await classifier.invoke([
            new SystemMessage("Classify if this message needs a business response (e.g. asking about services, hours, company info). Reply with EXACTLY 'RESPOND' or 'IGNORE'. Defaults to 'RESPOND' if unsure."),
            new HumanMessage(query)
        ]);

        const rawContent = classification.content.toString();
        const content = rawContent.toUpperCase().trim();
        console.log(`[Orchestrator] Classification result: "${content}"`);

        if (content.includes("IGNORE")) {
            return { next: "__end__" };
        }

        return { next: "research" };
    } catch (error) {
        console.error("[Orchestrator] Classification failed, defaulting to research:", error);
        return { next: "research" };
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
        next: {
            value: (x, y) => y ?? x,
            default: () => ""
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

export async function orchestrate(query: string, tenantId: string) {
    return await agentExecutor.invoke({
        messages: [new HumanMessage(query)],
        tenantId,
        next: "orchestrate",
        context: []
    });
}
