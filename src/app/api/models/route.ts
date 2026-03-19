import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const models = await (prisma as any).aIModel.findMany({
            where: { tenantId },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(models);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const body = await req.json();
        const { id, name, provider, modelType, config, status } = body;

        if (id) {
            const updated = await (prisma as any).aIModel.update({
                where: { id },
                data: { name, provider, modelType, config, status }
            });
            return NextResponse.json(updated);
        } else {
            const created = await (prisma as any).aIModel.create({
                data: {
                    tenantId,
                    name,
                    provider,
                    modelType,
                    config: config || {},
                    status: status || "ACTIVE"
                }
            });
            return NextResponse.json(created);
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await (prisma as any).aIModel.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
