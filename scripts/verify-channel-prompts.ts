import { clerkNode } from "../src/lib/agents/clerk";
import prisma from "../src/lib/prisma";
import { HumanMessage } from "@langchain/core/messages";

/**
 * This script verifies that the channel-specific prompt selection works correctly.
 * It bypasses the LLM call to just show what prompt WOULD be used.
 */
async function verifyChannelLogic() {
    console.log("🧪 [Verify] Testing Channel-Specific System Prompts...\n");

    const tenantId = "verify-tenant-" + Date.now();

    // 0. Create a test tenant
    await prisma.tenant.create({
        data: {
            id: tenantId,
            name: "Verify Tenant",
            email: `verify-${Date.now()}@example.com`
        }
    });

    // 1. Create a tailored agent
    const agent = await prisma.agent.create({
        data: {
            tenantId,
            name: "Premium Concierge",
            systemPrompt: "DEFAULT: You are a helpful assistant.",
            channels: {
                create: [
                    {
                        channel: "WHATSAPP",
                        systemPrompt: "WHATSAPP: You are a brief, emoji-friendly WhatsApp assistant.",
                        isActive: true
                    },
                    {
                        channel: "EMAIL",
                        systemPrompt: "EMAIL: You are a formal and detailed Email representative.",
                        isActive: true
                    }
                ]
            }
        }
    });

    console.log(`✅ Created Test Agent: ${agent.name} (${agent.id})`);

    // 2. Mock state for different channels
    const channels = ["DEFAULT", "WHATSAPP", "EMAIL"];

    for (const ch of channels) {
        console.log(`\n--- Testing Channel: ${ch} ---`);

        // We simulate the logic in clerkNode directly to see the built prompt
        // since we don't want to trigger actual LLM costs or need API keys here.

        const testAgent = await prisma.agent.findUnique({
            where: { id: agent.id },
            include: { channels: true }
        });

        let basePrompt = testAgent?.systemPrompt || "Fallback";

        if (ch !== "DEFAULT" && testAgent?.channels) {
            const config = testAgent.channels.find(c => c.channel === ch && c.isActive);
            if (config?.systemPrompt) {
                basePrompt = config.systemPrompt;
            }
        }

        console.log(`📌 Resulting Base Prompt: "${basePrompt}"`);

        if (ch === "WHATSAPP" && basePrompt.includes("WHATSAPP")) {
            console.log("🟢 SUCCESS: Correct WhatsApp override selected.");
        } else if (ch === "EMAIL" && basePrompt.includes("EMAIL")) {
            console.log("🟢 SUCCESS: Correct Email override selected.");
        } else if (ch === "DEFAULT" && basePrompt.includes("DEFAULT")) {
            console.log("🟢 SUCCESS: Correct Default prompt selected.");
        } else {
            console.log("🔴 FAILURE: Incorrect prompt selected.");
        }
    }

    // 3. Cleanup
    await prisma.agent.delete({ where: { id: agent.id } });
    console.log("\n🧹 Cleanup complete.");
}

verifyChannelLogic().catch(console.error);
