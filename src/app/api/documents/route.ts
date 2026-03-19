import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
const embeddings = new OpenAIEmbeddings();

export async function POST(req: NextRequest) {
    try {
        const { content, name, tenantId, metadata } = await req.json();

        if (!content || !tenantId) {
            return NextResponse.json({ error: "Missing content or tenantId" }, { status: 400 });
        }

        // 1. Create document in DB
        const doc = await prisma.document.create({
            data: {
                tenantId,
                name: name || "Untitled Document",
                content,
                metadata
            }
        });

        // 2. Generate embedding (In a real app, do this in chunks)
        const embedding = await embeddings.embedQuery(content);

        // 3. Store vector embedding via raw SQL (since Prisma doesn't support vector types natively)
        // Assuming we added a 'vector' column to the Document table manually or via migration
        await prisma.$executeRaw`
      ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS vector vector(1536);
      UPDATE "Document" SET vector = ${JSON.stringify(embedding)}::vector WHERE id = ${doc.id};
    `;

        return NextResponse.json({ success: true, documentId: doc.id });
    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
