import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const agents = await prisma.agent.findMany({
            where: { tenantId },
            include: { channels: true }
        });

        // Return list cleanly, even if empty
        return NextResponse.json(agents);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const body = await req.json();
        const { id, name, description, provider, model, persuasionLevel, systemPrompt, isActive, channels, config, escalationChannel, managerWhatsapp, managerEmail } = body;

        let agent;
        if (id) {
            agent = await prisma.agent.update({
                where: { id, tenantId },
                data: {
                    name,
                    description,
                    provider,
                    model,
                    persuasionLevel,
                    systemPrompt,
                    config,
                    isActive: isActive !== undefined ? isActive : true,
                    escalationChannel,
                    managerWhatsapp,
                    managerEmail
                }
            });
        } else {
            agent = await prisma.agent.create({
                data: {
                    tenantId,
                    name: name || "New Agent",
                    description,
                    provider,
                    model,
                    persuasionLevel,
                    systemPrompt,
                    config,
                    isActive: true,
                    escalationChannel: escalationChannel || "EMAIL",
                    managerWhatsapp,
                    managerEmail
                }
            });
        }

        // Handle channels if provided
        if (channels && Array.isArray(channels)) {
            // Remove existing channels first for a clean state or handle individually
            // For simplicity and since we manage them in one go in the modal:
            await prisma.agentChannel.deleteMany({
                where: { agentId: agent.id }
            });

            for (const ch of channels) {
                await prisma.agentChannel.create({
                    data: {
                        agentId: agent.id,
                        channelAccountId: ch.channelAccountId || null,
                        channel: ch.channel || "EMAIL",
                        systemPrompt: ch.systemPrompt,
                        config: ch.config,
                        isActive: ch.isActive !== undefined ? ch.isActive : true
                    }
                });
            }
        }

        // Trigger processing immediately if the agent is active
        if (isActive === true || agent.isActive === true) {
            const { AgentProcessor } = await import("@/lib/agents/processor");
            // Run in background (non-blocking)
            AgentProcessor.processPendingMessages().catch(console.error);
        }

        const finalAgent = await prisma.agent.findUnique({
            where: { id: agent.id },
            include: {
                channels: {
                    include: { channelAccount: true }
                }
            }
        });

        return NextResponse.json(finalAgent);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
