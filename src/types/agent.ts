import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
    messages: BaseMessage[];
    tenantId: string;
    agentId?: string;
    next?: string;
    context?: string[];
    persuasionLevel?: number;
    channel?: string;
    channelAccountId?: string;
    sender?: string;
    category?: string;
    bookingStatus?: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    accumulatedUsage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    systemPrompts?: { step: string; prompt: string }[];
    isEscalation?: boolean;
}
