import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

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
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const embeddings = await getEmbeddings();
        const vector = await embeddings.embedQuery(text);

        // Optional: Perform a test search to show real results
        const similarChunks: any[] = await prisma.$queryRaw`
            SELECT c.content, d.name as documentName, (1 - (c.vector <=> ${JSON.stringify(vector)}::vector)) as similarity
            FROM "DocumentChunk" c
            JOIN "Document" d ON c."documentId" = d."id"
            WHERE d."tenantId" = ${tenantId}
            ORDER BY c.vector <=> ${JSON.stringify(vector)}::vector
            LIMIT 3;
        `;

        return NextResponse.json({
            success: true,
            vectorSize: vector.length,
            sample: vector.slice(0, 10),
            matches: similarChunks
        });
    } catch (error: any) {
        console.error("[Embedding Test Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
