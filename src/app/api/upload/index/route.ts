import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";

/**
 * Extract clean text from a file buffer using pdf-parse.
 */
async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
    // PDF: use pdf-parse for robust text extraction
    if (mimeType === "application/pdf") {
        // Polyfills for pdf-parse/pdf.js in Node.js environment
        if (typeof (global as any).DOMMatrix === "undefined") {
            (global as any).DOMMatrix = class DOMMatrix { constructor() { } };
        }
        if (typeof (global as any).ImageData === "undefined") {
            (global as any).ImageData = class ImageData { constructor() { } };
        }
        if (typeof (global as any).Path2D === "undefined") {
            (global as any).Path2D = class Path2D { constructor() { } };
        }

        try {
            const pdfParseModule = require("pdf-parse");
            const PDFParse = pdfParseModule.PDFParse;

            if (!PDFParse) {
                throw new Error("PDFParse class not found in module.");
            }

            // Correct API: data passed in constructor, then call getText()
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            const text = result.text || "";

            // Cleanup to prevent memory leaks in Long-running Next.js process
            await parser.destroy();

            return text
                .replace(/[ \t]+/g, " ")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
        } catch (error: any) {
            console.error("PDF Parse Internal Error:", error);
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
    }

    // Plain text / markdown / CSV etc.
    if (mimeType.startsWith("text/")) {
        return buffer.toString("utf-8").replace(/\0/g, "").trim();
    }

    // Unsupported binary type
    throw new Error(`Unsupported file type: ${mimeType}. Please upload a PDF or plain text file.`);
}

async function getEmbeddings() {
    if (process.env.OPENAI_API_KEY) {
        return new OpenAIEmbeddings();
    }
    return new OllamaEmbeddings({
        model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
        baseUrl: process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
    });
}

/**
 * Simple recursive character text splitter implementation
 */
function chunkText(text: string, chunkSize: number = 1000, chunkOverlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;
        chunks.push(text.slice(start, end));
        start += chunkSize - chunkOverlap;
    }

    return chunks;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const { documentId } = await req.json();

        if (!documentId) {
            return NextResponse.json({ error: "No documentId provided" }, { status: 400 });
        }

        // 1. Fetch document and set status to INDEXING
        const doc = await prisma.document.findUnique({
            where: { id: documentId, tenantId }
        });

        if (!doc) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        let content = doc.content;

        // If content is empty and we have raw content, parse it now (deferred parsing)
        if (!content && doc.rawContent) {
            try {
                content = await extractText(doc.rawContent, doc.mimeType || "application/pdf");
                // Update the document with the extracted content
                await prisma.document.update({
                    where: { id: documentId },
                    data: { content }
                });
            } catch (err: any) {
                await prisma.document.update({
                    where: { id: documentId },
                    data: { status: "ERROR" }
                });
                return NextResponse.json({ error: `Parsing failed: ${err.message}` }, { status: 422 });
            }
        }

        if (!content || content.length < 10) {
            return NextResponse.json({ error: "No meaningful text found to index." }, { status: 422 });
        }

        await prisma.document.update({
            where: { id: documentId },
            data: { status: "INDEXING" }
        });

        // 2. Chunk the text
        const chunks = chunkText(content);
        const embeddings = await getEmbeddings();

        // 3. Delete old chunks if any (re-indexing)
        await prisma.documentChunk.deleteMany({
            where: { documentId }
        });

        // 4. Generate embeddings and save chunks
        let processed = 0;
        for (const chunkContent of chunks) {
            const vector = await embeddings.embedQuery(chunkContent);

            // Raw SQL for Unsupported('vector')
            await prisma.$executeRaw`
                INSERT INTO "DocumentChunk" ("id", "documentId", "content", "vector")
                VALUES (
                    ${crypto.randomUUID()}, 
                    ${documentId}, 
                    ${chunkContent}, 
                    ${JSON.stringify(vector)}::vector
                )
            `;
            processed++;
        }

        // 5. Update document status to INDEXED
        await prisma.document.update({
            where: { id: documentId },
            data: { status: "INDEXED" }
        });

        return NextResponse.json({ success: true, chunks: processed });
    } catch (error: any) {
        console.error("Indexing Error:", error);
        // Set status to ERROR if failed
        try {
            const body = await req.json().catch(() => ({}));
            const documentId = body.documentId;
            if (documentId) {
                await prisma.document.update({
                    where: { id: documentId },
                    data: { status: "ERROR" }
                });
            }
        } catch { }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

