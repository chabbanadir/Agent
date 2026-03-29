import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { getModel } from "../llm/gateway";
import prisma from "@/lib/prisma";
import { escalateToManager } from "./escalation";
import { getProtocol } from "@/lib/protocols";

export async function clerkNode(state: any) {
    const { messages, context, persuasionLevel = 0.8, tenantId, agentId, channel, channelAccountId, sender } = state;
    const lastMessage = messages[messages.length - 1].content;

    // Fetch the agent and its channels
    const agent = agentId
        ? await prisma.agent.findUnique({
            where: { id: agentId },
            include: { channels: true }
        })
        : await prisma.agent.findFirst({
            where: { tenantId, isActive: true },
            include: { channels: true }
        });

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
    });

    const clerk = await getModel(tenantId, agentId);

    // Build the 3-tier System Prompt
    const timeNow = new Date().toLocaleString();
const protocol = getProtocol(channel);
    let basePrompt = `[CORE SYSTEM DIRECTIVES]
You are an AI assistant operating within the AgentClaw ecosystem.
Current System Time: ${timeNow}
System Identity: ${tenant?.name || "Business Entity"}
${tenant?.companyDescription ? `Company Description: ${tenant.companyDescription}\n` : ''}
${protocol.systemPromptPrefix ? `\n[CHANNEL PROTOCOL: ${protocol.channel}]\n${protocol.systemPromptPrefix}\n` : ''}

[COMMUNICATION STRUCTURE]
- Conversation History: Previous exchanges for context. Do not repeat greeting if already established.
- New Messages: The current input you must answer. 

IMPORTANT: If the "New Messages" contains multiple points or a batch of messages (e.g., Message 1, Message 2), you MUST address ALL of them in a single, cohesive response. Group your answers logically to provide a premium user experience.

[CONTEXTUAL KNOWLEDGE]
Your goal is to answer the user's question(s) using the provided context and history.
Persuasion Level: ${persuasionLevel} (out of 1).

Context info:
${context.join("\n") || "No specialized internal knowledge found for this query."}

[AGENT IDENTITY & BEHAVIOR]
${protocol.channel === 'WHATSAPP' 
    ? `You are a helpful team member. Do NOT sign messages with any name or brand.`
    : `Agent Name: ${agent?.name || "Representative"}`
}
${agent?.systemPrompt ? (() => {
    let globalBehavior = agent.systemPrompt;
    // On WhatsApp, strip signature directives from the global prompt
    if (protocol.channel === 'WHATSAPP') {
        globalBehavior = globalBehavior
            .split('\n')
            .filter((line: string) => {
                const lower = line.toLowerCase();
                return !lower.includes('signature') && !lower.includes('sign-off') && !lower.includes('sign off') && !lower.includes('sign as') && !lower.includes('always sign');
            })
            .join('\n')
            .trim();
    }
    return globalBehavior ? `CRITICAL GLOBAL BEHAVIOR: ${globalBehavior}` : '';
})() : ''}
`;

    if (channelAccountId && agent?.channels) {
        const channelConfig = agent.channels.find(c => c.channelAccountId === channelAccountId && c.isActive);
        if (channelConfig?.systemPrompt) {
            basePrompt += `\n[SPECIFIC CHANNEL INSTRUCTION]\n${channelConfig.systemPrompt}\n`;
        }
    } else if (channel && agent?.channels) {
        const channelConfig = agent.channels.find(c => (c.channel || "").toUpperCase() === channel.toUpperCase() && c.isActive);
        if (channelConfig?.systemPrompt) {
            basePrompt += `\n[SPECIFIC CHANNEL INSTRUCTION]\n${channelConfig.systemPrompt}\n`;
        }
    }

    // Add Escalation Awareness
    const managerContact = agent?.escalationChannel === "WHATSAPP" ? agent?.managerWhatsapp : agent?.managerEmail;
    if (managerContact) {
        basePrompt += `\n[ESCALATION PROCEDURES]
If you cannot fulfill the request due to missing technical details (pricing, availability, specific personalizations), you should inform the user that you are escalating the matter to your manager.
Your manager's contact address is: ${managerContact} (${agent?.escalationChannel}).
You will trigger an internal notification to them automatically when you can't answer.\n`;
    }

    // Build channel-aware output rules
    const channelUpper = (channel || 'WEB').toUpperCase();
    let outputRules: string;

    if (channelUpper === 'WHATSAPP') {
        outputRules = `[FINAL OUTPUT RULES — WHATSAPP]
- You are chatting on WhatsApp. Keep responses SHORT, direct, and conversational.
- Write like a human texting: 2-4 sentences max per message. No walls of text.
- DO NOT sign off with a name or brand signature. 
- CRITICAL: Never include the name "${agent?.name || 'Representative'}" or any other name at the end of your message.
- DO NOT add a formal Call-To-Action (CTA). Just be natural and helpful.
- Use casual punctuation. Light emoji usage is fine (1-2 max).
- Match the user's language and energy level.
- NEVER format like an email. This is a chat, not a letter.`;
    } else if (channelUpper === 'GMAIL' || channelUpper === 'EMAIL') {
        outputRules = `[FINAL OUTPUT RULES — EMAIL]
- Be helpful and professional with clear paragraph structure.
- ALWAYS respect the "CRITICAL GLOBAL BEHAVIOR" constraints provided above.
- SIGN-OFF: Always sign off using the Brand/Agent Name (${agent?.name || "Representative"}).
- CRITICAL IDENTITY RULE: Never use the name of the business owner or tenant (e.g., "Nadir Chabba") in your signature. You represent the brand (${agent?.name || "the business"}), not the individual.
- BRANDING: Use "${agent?.name || "the team"}" in your signature. DO NOT include "Org" or the full tenant name if it sounds like a personal name.
- FORMATTING: Use clear paragraphs. Avoid excessive emojis in professional replies.
- Always include a professional Call-To-Action (CTA) at the end.`;
    } else {
        outputRules = `[FINAL OUTPUT RULES]
- Be helpful and concise.
- ALWAYS respect the "CRITICAL GLOBAL BEHAVIOR" constraints provided above.
- Sign off naturally using "${agent?.name || "Representative"}" if appropriate.
- Keep responses focused and professional but not overly formal.`;
    }

    const systemPrompt = `${basePrompt.trim()}\n\n${outputRules}`;

    console.log(`[Clerk] Generating response for channel: ${channelUpper}`);
    // console.log(`[Clerk] FINAL SYSTEM PROMPT:\n${systemPrompt}`); // Useful for deep debugging

    // Add thought about response generation
    const thoughtMessage = {
        role: "thought",
        content: `[Clerk] Generating response using ${context.length > 0 ? context.length : "NO"} context chunks. ${context.length === 0 ? "Advising user that specialized domain knowledge is unavailable." : ""}`
    };

    // Filter messages to only include those compatible with LLM providers (Human, AI, System)
    // We remove our custom 'thought' messages from the history sent to the LLM
    const chatHistory = messages.filter((m: any) => m.role !== 'thought' && m.role !== 'system_thought' && m.type !== 'thought');

    // 1. Check for Information Sufficiency — using LLM for nuance
    const category = state.category || "";
    let isEscalation = false;
    let managerBriefing = "";
    let referenceId = "";

    if (category === "BUSINESS") {
        try {
            const evaluator = await getModel(tenantId, agentId);
            const queryStr = typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage);
            const contextStr = context.length > 0 ? context.slice(0, 5).join("\n\n") : "None";
            const sufficiencyPrompt = `
                Role: Escalation Manager / Business Data Auditor.
                Goal: Determine if this user inquiry REQUIRES human manager intervention.
                
                USER INQUIRY: "${queryStr}"
                AVAILABLE CONTEXT: ${contextStr}
                
                ESCALATION RULES (When to trigger manager intervention):
                You MUST ESCALATE (output "ESCALATE") ONLY IF the user is explicitly asking for:
                1. Confirmation of real-time availability for specific booking dates.
                2. Custom prices, custom packages, or personalized offers/discounts.
                3. Information that is strictly dependent on human approval or live capacity checking, which is NOT present in the AVAILABLE CONTEXT.
                
                DO NOT ESCALATE (output "NO_ESCALATION") if:
                - The user is asking general questions (location, standard services, "how does it work?").
                - The AVAILABLE CONTEXT contains the answer.
                - It is a casual conversational turn or a simple follow-up.
                
                OUTPUT:
                - Output ONLY the word "ESCALATE" if a manager must intervene.
                - Output ONLY the word "NO_ESCALATION" if the agent should handle it or it's a general question.
            `.trim();

            const sufficiencyRes = await evaluator.invoke([new HumanMessage(sufficiencyPrompt)]);
            const result = sufficiencyRes.content.toString().trim().toUpperCase();
            // More resilient parsing: if it says ESCALATE but doesn't explicitly choose NO_ESCALATION
            const hasEscalate = result.includes("ESCALATE");
            const hasNoEscalate = result.includes("NO_ESCALATION") || result.includes("NO ESCALATION");
            
            // If it outputs purely "ESCALATE", hasNoEscalate is false, triggers. If it outputs both, it's ambiguous, but if it starts with ESCALATE, trigger.
            if ((hasEscalate && !hasNoEscalate) || result.startsWith("ESCALATE")) {
                console.log(`[Clerk] Escalation required based on rules. Models Output: ${result}`);
                isEscalation = true;
            } else {
                // Deterministic Fallback for weak models and Contextual Anti-Amnesia for short replies
                const userQueryLower = queryStr.toLowerCase();
                const needsManagerKeywords = ["custom price", "custom quote", "group rate", "group of", "discount", "manager", "human", "talk to someone", "special price"];
                
                const aiMsgs = messages.filter((m: any) => m.role === 'assistant' || m.type === 'ai');
                const lastAiMsg = aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].content : "";
                const lastAiStr = typeof lastAiMsg === 'string' ? lastAiMsg : JSON.stringify(lastAiMsg);
                const aiWasNegotiating = /(quote|price|rate|cost|adjust|\\$|€|package)/i.test(lastAiStr);
                
                if (needsManagerKeywords.some(k => userQueryLower.includes(k)) || (aiWasNegotiating && userQueryLower.length > 0 && userQueryLower.length < 50)) {
                    console.log(`[Clerk] Escalation forced by Keyword or Contextual Anti-Amnesia Fallback.`);
                    isEscalation = true;
                }
            }
        } catch (e) {
            console.error("[Clerk] Sufficiency evaluator failed:", e);
            isEscalation = false;
        }
    }

    // Generate Manager Briefing and Reference ID if escalating
    if (isEscalation) {
        try {
            const briefer = await getModel(tenantId, agentId);
            const chatLog = chatHistory.slice(-5).map((m: any) => `${(m._getType ? m._getType() : (m.role || 'UNKNOWN')).toUpperCase()}: ${m.content}`).join("\n");
            const cleanSenderForBrief = sender ? sender.split('@')[0].replace(/[^a-zA-Z0-9+]/g, '') : "Unknown";
            const briefingPrompt = `
                Role: Senior Business Manager Assistant.
                Goal: Extract the context and summary for a manager escalation.
                
                LATEST REQUEST: "${lastMessage}"
                HISTORY: ${chatLog}
                
                OUTPUT FORMAT:
                You must output exactly two sections separated by "|||":
                [Context part]|||[Summary part]
                
                Rules for Context part: 1-2 sentences explaining what the client needs based on our knowledge (e.g., asking for custom pricing, or dates).
                Rules for Summary part: 1 sentence summarizing the client's latest core request.
                
                Example output:
                Client needs custom duration of 10 days for surfing which we cannot confirm from the knowledge base.|||Client wants to know if there's any availability for a 10-day surfing package starting next Monday.
            `.trim();
            
            const briefingRes = await briefer.invoke([new HumanMessage(briefingPrompt)]);
            managerBriefing = briefingRes.content.toString();
            
            // Generate a simple short reference ID
            referenceId = `REF-${Math.random().toString(36).substring(2, 5).toUpperCase()}${Date.now().toString().slice(-3)}`;
        } catch (e) {
            console.error("[Clerk] Failed to generate manager briefing:", e);
        }
        console.log("[Clerk] Escalation triggered for a BUSINESS query.");
    }

    // If escalation is needed, modify the prompt to prevent fabrication
    let finalSystemPrompt = systemPrompt + `\n\n[GLOBAL CONSTRAINT]\nNEVER fabricate or invent custom prices, group rates, or quotes. Do not perform math to calculate totals without a manager's explicit input. If the user asks for a quote or rate you don't have, YOU MUST say you are checking with the manager.`;
    
    if (isEscalation) {
        finalSystemPrompt += `\n\n[CRITICAL — INSUFFICIENT INFORMATION]
You do NOT have the specific information needed to answer this query (pricing, availability, dates, etc.).
DO NOT invent, fabricate, or assume any information you don't have.
Instead:
1. Acknowledge the user's request warmly
2. Explain that you need to check with the team for accurate information
3. Tell them you are waiting for the manager's confirmation to finalize their request.
Keep it brief and reassuring. Do NOT make up prices, dates, or availability.`;
    }

    if (protocol.channel === 'WHATSAPP') {
        finalSystemPrompt += `\n\n[STRICT WHATSAPP PROTOCOL]
- ABSOLUTELY NO SIGNATURE: Do not append your name, the agent name, or "Adrenalin Surf Maroc Team" at the end.
- END THE MESSAGE CLEANLY: The last character of your message should be a punctuation mark or an emoji, NEVER a name.
- IGNORE ALL PREVIOUS SIGNATURE RULES: This WhatsApp-specific rule overrides everything else.`;
    }

    const response = await clerk.invoke([
        new SystemMessage(finalSystemPrompt),
        ...chatHistory
    ]);

    console.log(`[Clerk] generated response: ${response.content.toString().substring(0, 50)}...`);

    // 2. Booking classification
    const bookingClassifier = await getModel(tenantId, agentId);
    const bookingQuery = `
      Evaluate the assistant's previous response to the user's last message. 
      Determine if a booking or reservation was successfully CONFIRMED in this turn.
      Output exclusively "BOOKED" if the assistant confirmed a booking, otherwise output "NONE".
      
      Chat History:
      ${chatHistory.map((m: any) => `${m._getType ? m._getType() : m.role}: ${m.content}`).join("\\n")}
      
      Assistant Response:
      ${response.content}
    `;

    let bookingStatus = "NONE";
    let bookingRes: any = null;
    try {
        bookingRes = await bookingClassifier.invoke([new HumanMessage(bookingQuery)]);
        bookingStatus = bookingRes.content.toString().trim() === "BOOKED" ? "BOOKED" : "NONE";
        console.log(`[Clerk] Booking status evaluated as: ${bookingStatus}`);
    } catch (e) {
        console.error("[Clerk] Booking classification failed", e);
    }

    // Type 2 Escalation (Booking confirmed)
    if (!isEscalation && bookingStatus === "BOOKED") {
        isEscalation = true;
        referenceId = `REF-BOOK${Math.random().toString(36).substring(2, 5).toUpperCase()}${Date.now().toString().slice(-3)}`;
        managerBriefing = `Client booking has been confirmed. Notification for manager.|||Booking confirmed for this discussion.`;
    }

    // Safety net: if the main AI explicitly states it's interacting with a human proxy (manager, team, availability check with someone)
    const outStr = response.content.toString().toLowerCase();
    const indicatesEscalation = /(manager|team|human|ping|check with|reach out|ask|contact).*(manager|team|human|availability)/i.test(outStr) 
        || outStr.includes("manager") 
        || outStr.includes("escalat") 
        || outStr.includes("team members");

    if (!isEscalation && indicatesEscalation) {
        isEscalation = true;
        referenceId = `REF-AUTO${Math.random().toString(36).substring(2, 5).toUpperCase()}${Date.now().toString().slice(-3)}`;
        managerBriefing = `Agent automatically deferred to manager based on missing context.|||Client needs custom details or availability the bot cannot provide.`;
        console.log("[Clerk] Safety Net triggered: Agent response implied escalation (Regex matched).");
    }

    // 3. Update the message in the database with results
    let lastHumanMessageId: string | undefined;
    try {
        const humanMessages = messages.filter((m: any) => m.role === 'user' || m.type === 'human' || m._getType?.() === 'human');
        const lastHumanMessage = humanMessages.length > 0 ? humanMessages[humanMessages.length - 1] : null;

        if (lastHumanMessage && ((lastHumanMessage as any).id || (lastHumanMessage as any).additional_kwargs?.id)) {
             lastHumanMessageId = (lastHumanMessage as any).id || (lastHumanMessage as any).additional_kwargs?.id;
              await prisma.message.update({
                where: { id: lastHumanMessageId },
                data: { 
                    bookingStatus,
                    isEscalation,
                    trace: {
                        ...(lastHumanMessage.trace as any),
                        isEscalation,
                        referenceId,
                        managerBriefing
                    } as any
                }
            });
        }
    } catch (dbErr) {
        console.error("[Clerk] Failed to update message status in DB", dbErr);
    }

    const usage = (response as any).usage_metadata || (response as any).additional_kwargs?.tokenUsage;
    const bookingUsage = bookingRes ? ((bookingRes as any).usage_metadata || (bookingRes as any).additional_kwargs?.tokenUsage) : null;

    const totalUsage = {
        prompt_tokens: (usage?.prompt_tokens || 0) + (bookingUsage?.prompt_tokens || 0),
        completion_tokens: (usage?.completion_tokens || 0) + (bookingUsage?.completion_tokens || 0),
        total_tokens: (usage?.total_tokens || 0) + (bookingUsage?.total_tokens || 0)
    };

    // If it's an escalation, handle notification
    if (isEscalation) {
        if (lastHumanMessageId) {
            console.log(`[Clerk] Escalation triggered for message ${lastHumanMessageId}. Manager will be notified.`);
            await escalateToManager(lastHumanMessageId, tenantId, {
                briefing: managerBriefing,
                referenceId: referenceId
            });
        } else {
            console.log(`[Clerk] Escalation triggered (Simulation Mode). ${referenceId ? `Ref ID: ${referenceId}` : ""}`);
            const lastHumanMsg = messages.filter((m: any) => m.role === 'user' || m.type === 'human').pop();
            await escalateToManager(null, tenantId, {
                sender: sender || (lastHumanMsg as any)?.sender || "Simulation User",
                content: (lastHumanMsg as any)?.content || lastMessage,
                channelAccountId,
                briefing: managerBriefing,
                referenceId: referenceId
            });
        }
    }

    const accumulatedUsage = {
        prompt_tokens: (usage?.prompt_tokens || 0) + (bookingUsage?.prompt_tokens || 0),
        completion_tokens: (usage?.completion_tokens || 0) + (bookingUsage?.completion_tokens || 0),
        total_tokens: (usage?.total_tokens || 0) + (bookingUsage?.total_tokens || 0)
    };
    const systemPrompts = [{ step: "Clerk", prompt: systemPrompt }];
    if (bookingQuery) {
        systemPrompts.push({ step: "BookingClassifier", prompt: bookingQuery });
    }

    return {
        messages: [thoughtMessage, response],
        bookingStatus,
        isEscalation,
        next: "END",
        usage: totalUsage,
        accumulatedUsage,
        systemPrompts
    };
}
