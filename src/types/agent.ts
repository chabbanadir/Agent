import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
    messages: BaseMessage[];
    tenantId: string;
    agentId?: string;
    next?: string;
    context?: string[];
    persuasionLevel?: number;
    category?: string;
}
