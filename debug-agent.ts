import * as dotenv from 'dotenv';
dotenv.config();

import prisma from './src/lib/prisma';
import { agentExecutor } from './src/lib/agents/orchestrator';
import { HumanMessage } from '@langchain/core/messages';


async function main() {
    const tenantId = 'default-tenant';
    const query = "I need help with my screen repair, what are your hours?";

    console.log("--- Starting Simulation Debug ---");
    try {
        const result = await agentExecutor.invoke({
            messages: [new HumanMessage(query)],
            tenantId: tenantId,
            next: "orchestrate",
            context: []
        });

        console.log("--- Result Messages ---");
        result.messages.forEach((m: any, i: number) => {
            const role = m.role || m.type || (m.constructor.name === 'HumanMessage' ? 'human' : m.constructor.name);
            console.log(`${i}: [${role}] ${m.content.toString().substring(0, 50)}...`);
        });

        const response = result.messages[result.messages.length - 1].content;
        console.log("\nFinal Response:", response);

        if (response === query) {
            console.error("BUG DETECTED: Response is identical to input query!");
        }
    } catch (error) {
        console.error("ERROR DURING EXECUTION:", error);
    }
}

main();
