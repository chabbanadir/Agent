import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const agents = await prisma.agent.findMany({
            where: { tenantId }
        });

        // Return list or a default if empty
        return NextResponse.json(agents.length > 0 ? agents : [{
            id: 'default',
            name: 'Default Agent',
            provider: "openai",
            model: "gpt-4o",
            persuasionLevel: 0.8,
            systemPrompt: ""
        }]);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const body = await req.json();
        const { id, name, provider, model, persuasionLevel, systemPrompt } = body;

        if (id) {
            const updated = await prisma.agent.update({
                where: { id, tenantId },
                data: { name, provider, model, persuasionLevel, systemPrompt }
            });
            return NextResponse.json(updated);
        } else {
            const created = await prisma.agent.create({
                data: {
                    tenantId,
                    name: name || "New Agent",
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
