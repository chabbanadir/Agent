import prisma from '../src/lib/prisma';
import { AIMessage, HumanMessage } from "@langchain/core/messages";

async function verify() {
    console.log("--- Starting Multi-Channel Verification ---");

    try {
        // 1. Create a dummy ChannelAccount if none exists
        let account = await prisma.channelAccount.findFirst();
        if (!account) {
            console.log("Creating dummy ChannelAccount...");
            account = await prisma.channelAccount.create({
                data: {
                    tenantId: "default-tenant",
                    type: "GMAIL",
                    name: "Test Email",
                    address: "test@example.com",
                    isActive: true
                }
            });
        }
        console.log(`Using ChannelAccount: ${account.id} (${account.address})`);

        // 2. Ensure we have an active agent
        const agent = await prisma.agent.findFirst({ where: { isActive: true } });
        if (!agent) {
            console.log("No active agent found. Verification cannot proceed.");
            return;
        }
        console.log(`Using Active Agent: ${agent.id} (${agent.name})`);

        // Link agent to account
        const link = await prisma.agentChannel.upsert({
            where: { agentId_channelAccountId: { agentId: agent.id, channelAccountId: account.id } },
            update: { isActive: true },
            create: {
                agentId: agent.id,
                channelAccountId: account.id,
                channel: "EMAIL",
                isActive: true
            }
        });
        console.log(`Agent-Channel Link Verified: ${link.id}`);

        // 3. Create a dummy RECEIVED message
        console.log("Creating dummy RECEIVED message...");
        const msg = await prisma.message.create({
            data: {
                tenantId: "default-tenant",
                channelAccountId: account.id,
                externalId: `test-${Date.now()}`,
                source: "email",
                sender: "customer@verification.com",
                content: "Hello, I need help with my booking. This is a multi-channel test.",
                status: "RECEIVED"
            }
        });
        console.log(`Message Created: ${msg.id} (Status: RECEIVED)`);

        // 4. Run the AgentProcessor
        console.log("Invoking AgentProcessor...");
        const { AgentProcessor } = await import("../src/lib/agents/processor");
        await AgentProcessor.processPendingMessages();

        // 5. Verify the results
        const updatedMsg = await prisma.message.findUnique({ where: { id: msg.id } });
        console.log(`Final Message Status: ${updatedMsg?.status}`);

        const reply = await prisma.message.findFirst({
            where: { parentMessageId: msg.id },
            orderBy: { createdAt: 'desc' }
        });

        if (reply) {
            console.log("✅ Verification SUCCESS: Agent reply found!");
            console.log(`Reply Content: ${reply.content}`);
            console.log(`Reply Agent: ${reply.sender}`);
        } else {
            console.log("❌ Verification FAILED: No agent reply found.");
        }
    } catch (error) {
        console.error("Verification Error:", error);
    } finally {
        process.exit(0);
    }
}

verify();
