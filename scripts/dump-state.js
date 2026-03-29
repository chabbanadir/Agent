const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        include: { channelAccounts: true }
    });

    console.log("--- SYSTEM STATE DUMP ---");
    for (const t of tenants) {
        console.log(`Tenant: ${t.name} (${t.id}) - Owner: ${t.email}`);
        for (const ca of t.channelAccounts) {
            console.log(`  - Account: ${ca.address} (${ca.type}) - Active: ${ca.isActive} - LastHist: ${ca.lastHistoryId}`);
        }
    }

    const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, sender: true, channelAccountId: true, createdAt: true, status: true }
    });
    console.log("\n--- RECENT MESSAGES ---");
    console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
