import prisma from "../src/lib/prisma";

async function main() {
    const messages = await prisma.message.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { channelAccount: true }
    });

    for (const msg of messages) {
        console.log(`[${msg.createdAt.toISOString()}] ID: ${msg.id} | Role: ${msg.role} | Sender: ${msg.sender} | Status: ${msg.status}`);
        console.log(`   Account Address: ${msg.channelAccount?.address}`);
        console.log(`   Content: ${msg.content.substring(0, 50).replace(/\n/g, ' ')}...`);
        console.log(`   ThreadId: ${msg.threadId}`);
    }

    const sysCounts = await prisma.message.groupBy({
        by: ['role', 'sender', 'status'],
        _count: true,
    });
    console.log("Counts:", sysCounts);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
