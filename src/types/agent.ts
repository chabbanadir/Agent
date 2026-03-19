import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
    messages: BaseMessage[];
    tenantId: string;
    next?: string;
    context?: string[];
    persuasionLevel?: number;
}
