import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const keys = await prisma.apiKey.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(keys);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: "Key name is required" }, { status: 400 });
        }

        // Generate a secure random token
        const token = `sk_${crypto.randomBytes(24).toString('hex')}`;

        const newKey = await prisma.apiKey.create({
            data: {
                tenantId,
                name,
                key: token
            }
        });

        return NextResponse.json(newKey);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "API Key ID is required" }, { status: 400 });
        }

        // Verify ownership and delete
        const key = await prisma.apiKey.findUnique({ where: { id } });
        if (!key || key.tenantId !== tenantId) {
            return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
        }

        await prisma.apiKey.delete({ where: { id } });

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
