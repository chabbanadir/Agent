import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const agent = await prisma.agent.findFirst({
            where: { tenantId, isActive: true }
        });

        return NextResponse.json(agent || {
            provider: "openai",
            model: "gpt-4o",
            persuasionLevel: 0.8,
            systemPrompt: ""
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const body = await req.json();
        const { provider, model, persuasionLevel, systemPrompt } = body;

        // Upsert agent for this tenant
        const agent = await prisma.agent.findFirst({
            where: { tenantId, isActive: true }
        });

        if (agent) {
            const updated = await prisma.agent.update({
                where: { id: agent.id },
                data: { provider, model, persuasionLevel, systemPrompt }
            });
            return NextResponse.json(updated);
        } else {
            const created = await prisma.agent.create({
                data: {
                    tenantId,
                    name: "Primary Agent",
                    provider,
                    model,
                    persuasionLevel,
                    systemPrompt,
                    isActive: true
                }
            });
            return NextResponse.json(created);
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
