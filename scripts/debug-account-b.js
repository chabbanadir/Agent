const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const accountB = await prisma.channelAccount.findFirst({
        where: { address: { contains: 'moh' } }
    });

    if (!accountB) {
        console.log("Account B not found");
        return;
    }

    const messages = await prisma.message.findMany({
        where: { channelAccountId: accountB.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`--- Messages for ${accountB.address} ---`);
    console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
