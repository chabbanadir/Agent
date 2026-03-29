import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("--- AGENTS ---");
    const agents = await prisma.agent.findMany();
    console.log(JSON.stringify(agents, null, 2));

    console.log("\n--- AGENT CHANNELS ---");
    const channels = await prisma.agentChannel.findMany({
        include: { agent: true, channelAccount: true }
    });
    console.log(JSON.stringify(channels, null, 2));

    console.log("\n--- CHANNEL ACCOUNTS ---");
    const accounts = await prisma.channelAccount.findMany();
    console.log(JSON.stringify(accounts, null, 2));
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
