import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get("agentId");
        const limit = parseInt(searchParams.get("limit") || "50");

        // Get messages with traces (includes assistant replies and classified user messages)
        const whereClause: any = {
            tenantId,
            trace: { not: null as any },
        };

        if (agentId) {
            whereClause.sender = (await prisma.agent.findUnique({ where: { id: agentId } }))?.name;
        }

        const messages = await prisma.message.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                parentMessage: true,
            },
        });

        // Get agents for reference
        const agents = await prisma.agent.findMany({
            where: { tenantId },
            select: { id: true, name: true, provider: true, model: true, isActive: true },
        });

        // Build telemetry entries
        const entries = messages.map((msg) => {
            const trace = msg.trace as any;
            return {
                id: msg.id,
                agentName: msg.sender,
                category: msg.category,
                status: msg.status,
                source: msg.source,
                createdAt: msg.createdAt,
                // From trace
                latency: trace?.latency,
                totalTokens: trace?.total_tokens || trace?.usage?.total_tokens || 0,
                promptTokens: trace?.usage?.prompt_tokens || trace?.usage?.input_tokens || 0,
                completionTokens: trace?.usage?.completion_tokens || trace?.usage?.output_tokens || 0,
                batchSize: trace?.batchSize || 1,
                // Reasoning/thoughts
                thoughts: trace?.messages?.filter((m: any) => m.role === "thought" || m.type === "thought")?.map((m: any) => typeof m.content === "string" ? m.content : JSON.stringify(m.content)) || [],
                // Tool calls
                toolCalls: trace?.messages?.filter((m: any) => m.tool_calls)?.flatMap((m: any) => m.tool_calls?.map((tc: any) => ({ name: tc.function?.name, args: tc.function?.arguments }))) || [],
                // Multiple system prompts from different nodes
                systemPrompts: trace?.systemPrompts || (trace?.messages?.find((m: any) => m.role === "system") ? [{ step: "Default", prompt: trace?.messages?.find((m: any) => m.role === "system")?.content }] : []),
                // Category/routing info
                routingCategory: trace?.category,
                routingReason: trace?.reason || trace?.messages?.find((m: any) => m.role === "thought")?.content || null,
                // Original input
                inputPreview: msg.parentMessage?.content?.substring(0, 200) || null,
                // Response preview
                responsePreview: msg.content?.substring(0, 300),
                // Full trace for raw view
                rawTrace: trace,
            };
        });

        // Aggregate stats
        const totalTokens = entries.reduce((acc, e) => acc + e.totalTokens, 0);
        const avgLatency = entries.length > 0
            ? entries.reduce((acc, e) => acc + (e.latency || 0), 0) / entries.filter(e => e.latency).length
            : 0;
        const categoryCounts = entries.reduce((acc: Record<string, number>, e) => {
            const cat = e.category || "UNKNOWN";
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});

        return NextResponse.json({
            entries,
            agents,
            stats: {
                totalInteractions: entries.length,
                totalTokens,
                avgLatency: avgLatency ? parseFloat(avgLatency.toFixed(2)) : 0,
                categoryCounts,
            },
        });
    } catch (error: any) {
        console.error("[Telemetry API]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
