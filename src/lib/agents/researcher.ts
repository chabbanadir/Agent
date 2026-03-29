import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { SystemMessage } from "@langchain/core/messages";
import { getModel } from "../llm/gateway";

async function getEmbeddings() {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings();
  }
  return new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
  });
}

export async function researcherNode(state: any) {
  const { messages, tenantId, agentId } = state;
  const lastMessage = messages[messages.length - 1].content;

  // 1. Extract requirements smartly using the LLM & history
  const model = await getModel(tenantId, agentId);
    const extractionPromptText = `
    Role: Internal Research Assistant.
    Goal: Identify the CORE REQUIREMENTS or questions from the LATEST user message(s) in the batch.
    Rule 1: Focus ONLY on the most recent user turn. Do NOT extract queries for questions that were explicitly asked and answered in the previous history.
    Rule 2: Extract keywords exclusively to gather information to answer the NEW, unanswered question.
    Context: Read the history ONLY to understand if the latest message is a follow-up (e.g., "what about for 3 days?" refers to the previously mentioned topic). Do NOT search for the history topics themselves.
    Output: Return ONLY the raw search query string or list of keywords. Do not explain. Do not answer the question.
  `;
  const extractionPrompt = new SystemMessage(extractionPromptText);

  // Filter out internal telemetry 'thought' objects so LangChain doesn't crash trying to coerce them
  const chatHistory = messages.filter((m: any) => m.role !== 'thought' && m.type !== 'thought');

  // Architectural Fix: Only feed the last 4 messages (e.g., 2 user turns and 2 AI turns) to the researcher.
  // Feeding the entire 15-message history overwhelms weak LLMs and causes them to lose focus on the immediate short reply.
  const recentHistory = chatHistory.slice(-4);

  const extractionResult = await model.invoke([extractionPrompt, ...recentHistory]);
  let extractedQuery = extractionResult.content.toString().trim();
  
  // Anti-Amnesia Phase 1: Fallback if LLM extracts empty or brackets (common for short follow-ups)
  if (!extractedQuery || extractedQuery === "[empty]" || extractedQuery.toLowerCase() === "empty" || extractedQuery.length < 3 || extractedQuery.startsWith("[")) {
      extractedQuery = typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage);
      console.log(`[Researcher] LLM extraction failed/empty. Falling back to raw user message: "${extractedQuery}"`);
  }

  const thoughts = [
    {
      role: "thought",
      content: `[Researcher] Analyzing history to avoid redundancy. Extracted search focus: "${extractedQuery}"`
    }
  ];

  // 2. Generate embedding for the focused query
  const embeddings = await getEmbeddings();
  const queryEmbedding = await embeddings.embedQuery(extractedQuery);

  // 3. Agent Document Isolation
  let allowedDocIds: string[] | null = null;
  if (agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    const config = agent?.config as any;
    if (config?.allowedDocuments && Array.isArray(config.allowedDocuments) && config.allowedDocuments.length > 0) {
      allowedDocIds = config.allowedDocuments;
    }
  }

  const allowedDocsCondition = allowedDocIds
    ? Prisma.sql`AND d."id" IN (${Prisma.join(allowedDocIds)})`
    : Prisma.sql``;

  // 4. Search for similar chunks in pgvector
  const similarityThreshold = 0.5; // Adjusted for cosine distance (<=>). Lower is closer.

  const similarChunks: any[] = await prisma.$queryRaw`
    SELECT c.content, d.name as documentName, (1 - (c.vector <=> ${JSON.stringify(queryEmbedding)}::vector)) as similarity
    FROM "DocumentChunk" c
    JOIN "Document" d ON c."documentId" = d."id"
    WHERE d."tenantId" = ${tenantId}
    ${allowedDocsCondition}
    AND (1 - (c.vector <=> ${JSON.stringify(queryEmbedding)}::vector)) > ${similarityThreshold}
    ORDER BY c.vector <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 5;
  `;

  const restrictionMessage = allowedDocIds
    ? `Security rules applied. Search STRICTLY ISOLATED to Document IDs: [${allowedDocIds.join(', ')}].`
    : `No document restrictions explicitly set for this agent. Searching globally across the Tenant.`;

  console.log(`[Researcher] Found ${similarChunks.length} relevant context chunks above threshold ${similarityThreshold}. Agent restriction applied: ${!!allowedDocIds}`);

  thoughts.push({
    role: "thought",
    content: `[Researcher] ${restrictionMessage} Found ${similarChunks.length} chunks with similarity > ${similarityThreshold} from internal database.`
  });

  const context = similarChunks.length > 0
    ? similarChunks.map(chunk => `[Source: ${chunk.documentName}]\n${chunk.content}`).join("\n\n")
    : "No relevant documents found in knowledge base.";

  const usage = (extractionResult as any).usage_metadata || (extractionResult as any).additional_kwargs?.tokenUsage;
  const accumulatedUsage = {
    prompt_tokens: (usage?.prompt_tokens || 0),
    completion_tokens: (usage?.completion_tokens || 0),
    total_tokens: (usage?.total_tokens || 0)
  };
  const systemPrompts = [{ step: "Researcher", prompt: extractionPromptText }];

  return {
    messages: thoughts,
    context: [context],
    next: "respond",
    usage,
    accumulatedUsage,
    systemPrompts
  };

}
