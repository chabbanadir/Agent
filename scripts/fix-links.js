const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Checking for orphaned agents...");
    const agents = await prisma.agent.findMany();
    const channels = await prisma.channelAccount.findMany();

    console.log(`Found ${agents.length} agents and ${channels.length} channels.`);

    for (const agent of agents) {
        // Find if this agent has ANY channel linked
        const existing = await prisma.agentChannel.findFirst({
            where: { agentId: agent.id }
        });

        if (!existing) {
            // Find a channel in the SAME tenant
            const targetChannel = channels.find(c => c.tenantId === agent.tenantId);
            if (targetChannel) {
                console.log(`🔗 Linking Agent '${agent.name}' (${agent.id}) to Channel '${targetChannel.address}' (${targetChannel.id})`);
                await prisma.agentChannel.create({
                    data: {
                        agentId: agent.id,
                        channelAccountId: targetChannel.id,
                        channel: 'EMAIL',
                        isActive: true
                    }
                });
            } else {
                console.log(`⚠️ No matching channel found for Agent '${agent.name}' on tenant ${agent.tenantId}`);
            }
        } else {
            console.log(`✅ Agent '${agent.name}' is already linked to a channel.`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
