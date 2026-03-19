import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import prisma from "@/lib/prisma";

export async function getModel(tenantId: string): Promise<BaseChatModel> {
    // 1. Fetch the active agent config for this tenant
    const agent = await prisma.agent.findFirst({
        where: { tenantId, isActive: true }
    });

    // Default provider set to ollama if OpenAI key is missing
    const provider = agent?.provider || (process.env.OPENAI_API_KEY ? "openai" : "ollama");
    const modelName = agent?.model || (provider === "ollama" ? "qwen3.5:9b" : "gpt-4o");

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
                // Use host.docker.internal for Linux host connectivity when running in Docker
                baseUrl: process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
            });

        case "openai":
        default: {
            // Auto-fallback: if OpenAI key is missing, try Ollama
            if (!process.env.OPENAI_API_KEY) {
                if (process.env.GOOGLE_API_KEY) {
                    console.warn("[LLM] OPENAI_API_KEY not set, falling back to Gemini");
                    return new ChatGoogleGenerativeAI({
                        model: "gemini-1.5-flash",
                        apiKey: process.env.GOOGLE_API_KEY,
                    });
                }

                // If no keys, always default to local Ollama
                return new ChatOllama({
                    model: "qwen3.5:9b",
                    // Use host.docker.internal for Linux host connectivity when running in Docker
                    baseUrl: process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434",
                });
            }
            return new ChatOpenAI({ modelName, apiKey: process.env.OPENAI_API_KEY });
        }
    }
}
