import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import prisma from "@/lib/prisma";

export async function getModel(tenantId: string, agentId?: string): Promise<BaseChatModel> {
    // 1. Fetch the active agent config for this tenant
    const agent = agentId
        ? await prisma.agent.findUnique({ where: { id: agentId } })
        : await prisma.agent.findFirst({
            where: { tenantId, isActive: true }
        });

    // Default provider prioritization: OpenRouter > OpenAI > Ollama
    const provider = agent?.provider ||
        (process.env.OPENROUTER_API_KEY ? "openrouter" :
            process.env.OPENAI_API_KEY ? "openai" : "ollama");

    const modelName = agent?.model ||
        (provider === "openrouter" ? "google/gemini-2.0-flash-001" :
            provider === "ollama" ? "qwen3.5:9b" : "gpt-4o");

    console.log(`[LLM Gateway] Provider: ${provider} | Model: ${modelName}`);


    switch (provider.toLowerCase()) {
        case "anthropic":
            return new ChatAnthropic({
                modelName,
                apiKey: process.env.ANTHROPIC_API_KEY,
            });

        case "gemini":
        case "google":
            return new ChatGoogleGenerativeAI({
                model: modelName,
                apiKey: process.env.GOOGLE_API_KEY,
            });

        case "ollama":
            return new ChatOllama({
                model: modelName,
                // Robust URL selection: Env > localhost (default) > Docker internal
                baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
            });

        case "openai":
        case "openrouter":
        default: {
            // Auto-fallback: if OpenAI key is missing, try Ollama
            if (provider.toLowerCase() === "openrouter") {
                return new ChatOpenAI({
                    modelName: modelName || "openai/gpt-3.5-turbo",
                    apiKey: process.env.OPENROUTER_API_KEY,
                    configuration: {
                        baseURL: "https://openrouter.ai/api/v1",
                        defaultHeaders: {
                            "HTTP-Referer": "https://github.com/chabbanadir/Agent", // Optional, for OpenRouter ranking
                            "X-Title": "Agent Platform", // Optional, for OpenRouter ranking
                        },
                    },
                });
            }

            if (!process.env.OPENAI_API_KEY) {
                // If OpenAI key is missing, check for OpenRouter or Gemini fallback
                if (process.env.OPENROUTER_API_KEY) {
                    return new ChatOpenAI({
                        modelName: "google/gemini-2.0-flash-001",
                        apiKey: process.env.OPENROUTER_API_KEY,
                        configuration: { baseURL: "https://openrouter.ai/api/v1" },
                    });
                }

                if (process.env.GOOGLE_API_KEY) {
                    console.warn("[LLM] OPENAI_API_KEY not set, falling back to Gemini");
                    return new ChatGoogleGenerativeAI({
                        model: "gemini-1.5-flash",
                        apiKey: process.env.GOOGLE_API_KEY,
                    });
                }

                // If no keys, always default to local Ollama (local host first)
                return new ChatOllama({
                    model: "qwen3.5:9b",
                    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
                });
            }
            return new ChatOpenAI({ modelName, apiKey: process.env.OPENAI_API_KEY });
        }
    }
}
