import prisma from "./src/lib/prisma";

async function main() {
    const accounts = await prisma.channelAccount.findMany({
        select: { id: true, address: true, type: true, lastHistoryId: true, isActive: true }
    });
    console.log("--- Channel Accounts ---");
    console.log(JSON.stringify(accounts, null, 2));

    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, sender: true, channelAccountId: true, createdAt: true, status: true }
    });
    console.log("--- Recent Messages ---");
    console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error);
