import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { AgentState } from "@/types/agent";
import { researcherNode } from "./researcher";
import { clerkNode } from "./clerk";
import { getModel } from "../llm/gateway";
import prisma from "@/lib/prisma";

// Define the state transitions
const orchestratorNode = async (state: AgentState) => {
    const { messages, tenantId, channel, agentId, channelAccountId, sender } = state;
    const lastMessage = messages[messages.length - 1];
    console.log(`[Orchestrator] [Channel: ${channel || 'DEFAULT'}] Processing message from ${sender || 'Unknown'} for tenant: ${tenantId}`);
    const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

    // Fetch tenant details and active agents
    const [tenant, activeAgents] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId } }),
        prisma.agent.findMany({ where: { tenantId, isActive: true } })
    ]);

    const activeAgentLines = activeAgents.map(a => `- ID: ${a.id} | NAME: ${a.name} | SPECIALTY: ${a.description || 'General support'}`);
    const agentList = activeAgentLines.length > 0 ? activeAgentLines.join('\n') : "- No specialized agents found. Use Default.";

    // Determine the business boundary based on available agents
    let businessBoundary = "";
    if (agentId) {
        const targetAgent = activeAgents.find(a => a.id === agentId);
        if (targetAgent?.description) {
            businessBoundary = `\nTARGETED BUSINESS DOMAIN: ${targetAgent.description}`;
        }
    } else {
        const domainList = activeAgents.filter(a => a.description).map(a => `- ${a.name}: ${a.description}`).join('\n');
        if (domainList) {
            businessBoundary = `\nSUPPORTED BUSINESS DOMAINS:\n${domainList}`;
        }
    }

    // Memory Compression: Fetch recent facts
    const userFacts = await prisma.conversationFact.findMany({
        where: { tenantId, senderUri: sender },
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    const factContext = userFacts.length > 0 
        ? `\n<long_term_memory>\n${userFacts.map((f: any) => f.factSummary).join('\n')}\n</long_term_memory>`
        : '';

    // Use the dynamic model gateway
    const classifier = await getModel(tenantId, agentId);

    const systemPromptText = `
                Role: AI Ecosystem Orchestrator. 
                Goal: Classify the message (or batch of messages) and pick the best Agent.
                CURRENT CHANNEL: ${channel || 'WEB'}
                SENDER: ${sender || 'Unknown'}
                ${businessBoundary}
                ${factContext}
                
                IMPORTANT: The input may contain a BATCH of multiple messages sent by the user in quick succession. You must analyze the ENTIRE input. 
                - If the batch contains at least one substantive "BUSINESS" request, classify the entire turn as BUSINESS.
                - If the batch is purely greetings, classify as GREETING.
                IMPORTANT: You are provided with the recent conversation history to understand the context. 
                - If the current message is a short confirmation (e.g. "Yes", "OK", "Sure", "Yes plz") or a follow-up to an existing business inquiry, classify it as BUSINESS even if it seems vague in isolation.
                - If the conversation is already in progress (see history below), strictly AVOID classifying human follow-ups as OTHER.

                AGENTS:
                ${agentList}

                REPLY ONLY with JSON matching this exact structure:
                {
                    "category": "BUSINESS" | "GREETING" | "CLOSURE" | "SPAM/SOCIAL" | "AUTOMATED" | "OTHER",
                    "reason": "Brief explanation",
                    "agentId": "selected-agent-id-string", // or null if none
                    "extractedConstraints": ["extract constraint 1", "extract question 2"] // AIEP checklist extraction
                }
            `;

    // Extract recent history for context (up to 5 messages, excluding the current one)
    const historyForContext = messages.slice(-6, -1).map((m: any) => {
        const role = m.role || (m.type === 'human' ? 'user' : (m.type === 'ai' ? 'assistant' : 'system'));
        if (role === 'thought') return null;
        return { role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) };
    }).filter(Boolean);

    try {
        const classification = await classifier.invoke([
            new SystemMessage(systemPromptText),
            ...historyForContext.map(m => m!.role === 'assistant' ? new AIMessage(m!.content) : new HumanMessage(m!.content)),
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

        const category = (result?.category || "OTHER").toUpperCase();
        const reason = result.reason || "Automatic routing";

        if (result.agentId) {
            console.log(`[Orchestrator] Intelligence suggested agent: ${activeAgents.find(a => a.id === result.agentId)?.name || result.agentId}`);
        } else if (state.agentId) {
            const manAgent = activeAgents.find(a => a.id === state.agentId);
            console.log(`[Orchestrator] Using channel-locked agent: ${manAgent?.name || state.agentId}`);
        }
        console.log(`[Orchestrator][PID:${process.pid}]Classification: ${category} | Reason: ${reason} | Suggested Agent: ${result.agentId} `);

        const ignoreCategories = ["SPAM", "SOCIAL", "OTHER", "CLOSURE", "AUTOMATED"];
        const finalCategory = ignoreCategories.includes(category) ? category : (category === "GREETING" ? "GREETING" : "BUSINESS");

        // Use explicitly requested agent first, then LLM selected, then fallback to first active
        const selectedAgentId = state.agentId || result.agentId || activeAgents[0]?.id;
        // Add orchestration thought for the trace
        const agentName = activeAgents.find(a => a.id === selectedAgentId)?.name || "Default";
        
        let constraintsMsg = "";
        if (result.extractedConstraints && result.extractedConstraints.length > 0) {
            constraintsMsg = `\nActive Constraints/Questions:\n- ${result.extractedConstraints.join('\n- ')}`;
        }

        const thoughtContent = `[Orchestrator] Category: ${finalCategory} | Assigned Agent: ${agentName} (Reason: ${reason})${constraintsMsg}`;

        const thoughtMessage = {
            role: "thought",
            content: thoughtContent
        };

        if (ignoreCategories.includes(finalCategory)) {
            const usage = (classification as any).usage_metadata || (classification as any).additional_kwargs?.tokenUsage;
            return {
                messages: [thoughtMessage],
                next: "__end__",
                category: finalCategory,
                usage,
                accumulatedUsage: {
                    prompt_tokens: (usage?.prompt_tokens || 0),
                    completion_tokens: (usage?.completion_tokens || 0),
                    total_tokens: (usage?.total_tokens || 0)
                },
                systemPrompts: [{ step: "Orchestrator", prompt: systemPromptText }]
            };
        }

        const usage = (classification as any).usage_metadata || (classification as any).additional_kwargs?.tokenUsage;
        const accumulatedUsage = {
            prompt_tokens: (usage?.prompt_tokens || 0),
            completion_tokens: (usage?.completion_tokens || 0),
            total_tokens: (usage?.total_tokens || 0)
        };
        const systemPrompts = [{ step: "Orchestrator", prompt: systemPromptText }];

        if (finalCategory === "GREETING") {
            return {
                messages: [thoughtMessage],
                next: "respond", // Bypasses research
                category: finalCategory,
                agentId: selectedAgentId,
                usage,
                accumulatedUsage,
                systemPrompts
            };
        }

        return {
            messages: [thoughtMessage],
            next: "research",
            category: finalCategory,
            agentId: selectedAgentId,
            usage,
            accumulatedUsage,
            systemPrompts
        };

    } catch (error: any) {
        if (error.status === 429 || error.lc_error_code === 'MODEL_RATE_LIMIT' || error.message?.includes('429')) {
            console.warn(`[Orchestrator] MODEL_RATE_LIMIT (429) reached. Classification aborted.`);
            throw error; // Re-throw to trigger deactivation in the Processor
        }
        console.error("[Orchestrator] Classification failed:", error.message || error);
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
        },
        channel: {
            value: (x, y) => y ?? x,
            default: () => undefined
        },
        channelAccountId: {
            value: (x, y) => y ?? x,
            default: () => undefined
        },
        bookingStatus: {
            value: (x, y) => y ?? x,
            default: () => "NONE"
        },
        sender: {
            value: (x, y) => y ?? x,
            default: () => ""
        },
        accumulatedUsage: {
            value: (x, y) => {
                if (!y) return x;
                return {
                    prompt_tokens: (x?.prompt_tokens || 0) + (y?.prompt_tokens || 0),
                    completion_tokens: (x?.completion_tokens || 0) + (y?.completion_tokens || 0),
                    total_tokens: (x?.total_tokens || 0) + (y?.total_tokens || 0)
                };
            },
            default: () => ({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 })
        },
        systemPrompts: {
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
        if (next === "respond") return "respond";
        return "__end__";
    }, {
        research: "research",
        respond: "respond",
        __end__: END
    })
    .addEdge("research", "respond")
    .addEdge("respond", END);

export const agentExecutor = workflow.compile();

export async function orchestrate(query: string, tenantId: string, sender: string, agentId?: string, channel?: string, history: BaseMessage[] = [], channelAccountId?: string, messageId?: string): Promise<AgentState> {
    try {
        const humanMsg = new HumanMessage(query);
        if (messageId) {
            humanMsg.id = messageId;
            humanMsg.additional_kwargs = { ...humanMsg.additional_kwargs, id: messageId };
        }
        
        return await agentExecutor.invoke({
            messages: [...history, humanMsg],
            tenantId,
            agentId,
            channel,
            channelAccountId,
            sender,
            next: "orchestrate",
            context: []
        }) as unknown as AgentState;
    } catch (error: any) {
        if (error.status === 429 || error.lc_error_code === 'MODEL_RATE_LIMIT' || error.message?.includes('429')) {
            console.warn(`[AgentPipeline] RATE LIMIT (429) hit during execution. Bubbling up for deactivation.`);
        }
        throw error; // Let it bubble to the Processor for deactivation
    }
}
