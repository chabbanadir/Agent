import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";

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
  const { messages, tenantId } = state;
  const lastMessage = messages[messages.length - 1].content;

  // 1. Generate embedding for the query
  const embeddings = await getEmbeddings();
  const queryEmbedding = await embeddings.embedQuery(lastMessage.toString());

  // 2. Search for similar chunks in pgvector
  const similarChunks: any[] = await prisma.$queryRaw`
    SELECT c.content, d.name as documentName
    FROM "DocumentChunk" c
    JOIN "Document" d ON c."documentId" = d."id"
    WHERE d."tenantId" = ${tenantId}
    ORDER BY c.vector <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT 5;
  `;

  console.log(`[Researcher] Found ${similarChunks.length} relevant context chunks.`);
  const context = similarChunks.map(chunk => `[Source: ${chunk.documentName}]\n${chunk.content}`).join("\n\n");

  return {
    context: [context],
    next: "respond"
  };
}
