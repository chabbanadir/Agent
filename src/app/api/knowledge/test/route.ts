import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
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

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const { query, topK = 5 } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "No query provided" }, { status: 400 });
        }

        const embeddings = await getEmbeddings();
        const queryEmbedding = await embeddings.embedQuery(query);

        // Search for similar chunks in pgvector
        const results: any[] = await prisma.$queryRaw`
            SELECT 
                c.content, 
                d.name as "documentName",
                d.id as "documentId",
                1 - (c.vector <=> ${JSON.stringify(queryEmbedding)}::vector) as "similarity"
            FROM "DocumentChunk" c
            JOIN "Document" d ON c."documentId" = d."id"
            WHERE d."tenantId" = ${tenantId}
            ORDER BY c.vector <=> ${JSON.stringify(queryEmbedding)}::vector
            LIMIT ${topK};
        `;

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error("RAG Test Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
