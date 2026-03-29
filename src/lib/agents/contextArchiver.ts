import prisma from "@/lib/prisma";
import { getModel } from "../llm/gateway";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export async function archiveContext(tenantId: string, senderUri: string, channelAccountId?: string) {
    console.log(`[ContextArchiver] Running for tenant: ${tenantId}, sender: ${senderUri}`);
    
    // We only archive older messages. For simplicity of the agent evolution plan,
    // we take the oldest 10 messages for a user that haven't been summarized or deleted.
    // (In a full prod system, we'd add an "archived" flag to messages, but we'll fetch them here to simulate).
    const messagesToArchive = await prisma.message.findMany({
        where: {
            tenantId,
            sender: senderUri
        },
        orderBy: { createdAt: 'asc' },
        take: 10
    });

    if (messagesToArchive.length <= 5) {
        console.log(`[ContextArchiver] Not enough messages to archive (Memory compression not needed) for ${senderUri}`);
        return;
    }

    const payload = messagesToArchive.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n");

    const model = await getModel(tenantId);

    const systemPromptText = `
Role: Context Archiver Agent.
Goal: Compress verbose conversational history into dense, enduring facts.

Instructions:
1. Read the following conversation history.
2. Extract all permanent facts about the user (e.g., name, preferences, constraints, open issues).
3. Extract the current state of their request or problem.
4. Output ONLY a concise bulleted list of facts. No greetings or fluff.

Example Output:
- User Name: John
- Budget: $500
- Open Issue: Waiting for API key reset
`;

    try {
        const result = await model.invoke([
            new SystemMessage(systemPromptText),
            new HumanMessage(payload)
        ]);
        
        const factSummary = result.content.toString();

        await prisma.conversationFact.create({
            data: {
                tenantId,
                channelAccountId,
                senderUri,
                factSummary
            }
        });

        console.log(`[ContextArchiver] Fact created for ${senderUri}:\n${factSummary}`);
        
        // Optional: Delete the processed messages to save DB space
        // await prisma.message.deleteMany({ where: { id: { in: messagesToArchive.map(m => m.id) } } });
        
    } catch (e: any) {
        console.error("[ContextArchiver] Failed to generate summary:", e.message || e);
    }
}

export async function runGlobalContextArchiver() {
    console.log(`[ContextArchiver] Running global compaction sweep...`);
    try {
        const recentSenders = await prisma.message.groupBy({
            by: ['tenantId', 'sender', 'channelAccountId'],
            _count: { id: true },
            having: { id: { _count: { gt: 5 } } }
        });
        
        for (const senderConfig of recentSenders) {
            await archiveContext(senderConfig.tenantId, senderConfig.sender, senderConfig.channelAccountId ?? undefined);
        }
    } catch (e) {
        console.error("[ContextArchiver] Global loop failed:", e);
    }
}
