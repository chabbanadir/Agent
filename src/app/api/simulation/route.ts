import { NextRequest, NextResponse } from "next/server";
import { agentExecutor } from "@/lib/agents/orchestrator";
import { HumanMessage } from "@langchain/core/messages";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AgentState } from "@/types/agent";
import prisma from "@/lib/prisma";


export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        console.log(`[Simulation] Fetching history for tenant: ${tenantId}`);

        const history = await prisma.simulation.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return NextResponse.json(history);
    } catch (error: any) {
        console.error("[Simulation] GET Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";
        const { sender, message, agentId } = await req.json() as { sender: string; message: string; agentId?: string };

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        console.log(`[Simulation] Invoking streaming agent for tenant ${tenantId} | Sender: ${sender} | Agent: ${agentId}`);

        const encoder = new TextEncoder();
        const startTime = Date.now();

        const stream = new ReadableStream({
            async start(controller) {
                const send = (data: any) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    let finalResult: AgentState | null = null;

                    const eventStream = await agentExecutor.stream({
                        messages: [new HumanMessage(message)],
                        tenantId: tenantId,
                        agentId: agentId,
                        next: "orchestrate",
                        context: []
                    }, {
                        streamMode: "values"
                    });

                    for await (const chunk of eventStream) {
                        finalResult = chunk as unknown as AgentState;
                        const lastMessage = finalResult.messages?.[finalResult.messages.length - 1];

                        // Send intermediate progress (node transitions)
                        if (finalResult.next) {
                            send({ type: 'progress', node: finalResult.next, message: lastMessage?.content?.toString().substring(0, 100) + "..." });
                        }
                    }

                    if (finalResult) {
                        const endTime = Date.now();
                        const latency = (endTime - startTime) / 1000;

                        // Token Extraction
                        let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
                        finalResult.messages?.forEach((m: any) => {
                            const usage = m.usage_metadata ||
                                m.response_metadata?.tokenUsage ||
                                m.additional_kwargs?.tokenUsage ||
                                m.response_metadata?.usage;

                            if (usage) {
                                totalUsage.prompt_tokens += usage.promptTokens || usage.prompt_tokens || 0;
                                totalUsage.completion_tokens += usage.completionTokens || usage.completion_tokens || 0;
                                totalUsage.total_tokens += usage.totalTokens || usage.total_tokens || 0;
                            }
                        });

                        const responseContent = finalResult.messages?.[finalResult.messages.length - 1]?.content || "";

                        // Save to DB
                        try {
                            const saved = await prisma.simulation.create({
                                data: {
                                    tenantId,
                                    agentId,
                                    sender,
                                    input: message,
                                    output: typeof responseContent === 'string' ? responseContent : JSON.stringify(responseContent),
                                    latency,
                                    tokens: totalUsage as any,
                                    trace: finalResult as any,
                                }
                            });
                            console.log(`[Simulation] Saved history record: ${saved.id}`);
                        } catch (e) {
                            console.error("[Simulation] DB Save error:", e);
                        }

                        send({
                            type: 'done',
                            response: responseContent,
                            latency: `${latency.toFixed(2)}s`,
                            usage: totalUsage,
                            trace: finalResult
                        });
                    }
                } catch (error: any) {
                    console.error("Streaming error:", error);
                    send({ type: 'error', message: error.message });
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("Simulation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
