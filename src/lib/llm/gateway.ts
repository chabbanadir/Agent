import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import prisma from "@/lib/prisma";

const DEFAULT_MODELS: Record<string, string> = {
    openrouter: "stepfun/step-3.5-flash:free",
    openai: "gpt-4o",
    gemini: "gemini-2.0-flash",
    google: "gemini-2.0-flash",
    ollama: "qwen3.5:9b",
    anthropic: "claude-3-5-sonnet-latest"
};

export async function getModel(tenantId: string, agentId?: string): Promise<BaseChatModel> {
    console.log(`[LLM Gateway] getModel: tenantId=${tenantId}, agentId=${agentId || 'NONE'}`);
    // 1. Fetch the active agent config for this tenant
    const agent = agentId
        ? await prisma.agent.findUnique({ where: { id: agentId } })
        : await prisma.agent.findFirst({
            where: { tenantId, isActive: true }
        });

    console.log(`[LLM Gateway] Resolved Agent: ${agent?.name || 'Default'} | Provider: ${agent?.provider || 'AUTO'} | Model: ${agent?.model || 'AUTO'}`);

    if (agentId) console.log(`[LLM Gateway] ID Lookup: ${agentId} -> Found: ${agent?.name || 'NOT FOUND'}`);

    // Default provider prioritization: OpenRouter > OpenAI > Ollama
    const provider = agent?.provider ||
        (process.env.OPENROUTER_API_KEY ? "openrouter" :
            process.env.OPENAI_API_KEY ? "openai" : "ollama");

    const modelName = agent?.model || DEFAULT_MODELS[provider.toLowerCase()] || "gpt-4o";

    // Fetch API keys from DB if not in env
    const dbKeys = await prisma.apiKey.findMany({ where: { tenantId } });
    const getApiKey = (envVar: string, dbName: string) => {
        if (process.env[envVar]) return process.env[envVar];
        const dbKey = dbKeys.find(k => k.name.toUpperCase() === dbName.toUpperCase());
        return dbKey?.key || undefined;
    };

    const googleKey = getApiKey("GOOGLE_API_KEY", "GOOGLE_API_KEY") || getApiKey("GEMINI_API_KEY", "GEMINI_API_KEY");
    const openAIKey = getApiKey("OPENAI_API_KEY", "OPENAI_API_KEY");
    const anthropicKey = getApiKey("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY");
    const openRouterKey = getApiKey("OPENROUTER_API_KEY", "OPENROUTER_API_KEY");

    console.log(`[LLM Gateway] Provider: ${provider} | Model: ${modelName}`);


    switch (provider.toLowerCase()) {
        case "anthropic":
            return new ChatAnthropic({
                modelName,
                apiKey: anthropicKey,
                maxRetries: 5,
            });

        case "gemini":
        case "google":
            return new ChatGoogleGenerativeAI({
                model: modelName,
                apiKey: googleKey,
                maxRetries: 5,
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
            // Auto-fallback logic
            if (provider.toLowerCase() === "openrouter") {
                return new ChatOpenAI({
                    modelName: modelName || DEFAULT_MODELS.openrouter,
                    apiKey: openRouterKey,
                    maxRetries: 3,
                    configuration: {
                        baseURL: "https://openrouter.ai/api/v1",
                        defaultHeaders: {
                            "HTTP-Referer": "https://github.com/chabbanadir/Agent",
                            "X-Title": "Agent Platform",
                        },
                    },
                });
            }

            if (!openAIKey) {
                // If OpenAI key is missing, check for OpenRouter or Gemini fallback
                if (openRouterKey) {
                    return new ChatOpenAI({
                        modelName: modelName || DEFAULT_MODELS.openrouter,
                        apiKey: openRouterKey,
                        maxRetries: 3,
                        configuration: { baseURL: "https://openrouter.ai/api/v1" },
                    });
                }

                if (googleKey) {
                    console.warn("[LLM] OpenAI key not set, falling back to Gemini");
                    return new ChatGoogleGenerativeAI({
                        model: modelName.includes("gemini") ? modelName : DEFAULT_MODELS.google,
                        apiKey: googleKey,
                        maxRetries: 3,
                    });
                }

                // If no keys, always default to local Ollama
                return new ChatOllama({
                    model: DEFAULT_MODELS.ollama,
                    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
                });
            }
            return new ChatOpenAI({ modelName, apiKey: openAIKey, maxRetries: 3 });
        }
    }
}
