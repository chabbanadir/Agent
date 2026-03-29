import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Just create the document record with the raw buffer, don't parse yet
        const doc = await prisma.document.create({
            data: {
                tenantId,
                name: file.name,
                content: "", // Placeholder, will be filled during parsing/indexing
                rawContent: buffer,
                mimeType: file.type,
                status: "UPLOADED",
                metadata: {
                    size: file.size,
                    type: file.type,
                }
            }
        });

        return NextResponse.json(doc);
    } catch (error: any) {
        console.error("Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const docs = await prisma.document.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(docs);
    } catch (error: any) {
        console.error("GET Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get('documentId');

        if (!documentId) {
            return NextResponse.json({ error: "documentId is required" }, { status: 400 });
        }

        // Verify the document belongs to the tenant
        const doc = await prisma.document.findUnique({
            where: { id: documentId }
        });

        if (!doc || doc.tenantId !== tenantId) {
            return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
        }

        // Delete the document (cascade delete on chunks)
        await prisma.document.delete({
            where: { id: documentId }
        });

        return NextResponse.json({ success: true, deletedId: documentId });
    } catch (error: any) {
        console.error("DELETE Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
