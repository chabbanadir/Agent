import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Emergency Reset: Marking all RECEIVED/PROCESSING messages as SKIPPED...");
    const result = await prisma.message.updateMany({
        where: {
            status: { in: ['RECEIVED', 'PROCESSING'] }
        },
        data: {
            status: 'SKIPPED',
            category: 'SYSTEM_RESET',
            trace: { reason: "Emergency reset to stop spam loop" } as any
        }
    });
    console.log(`Success! Reset ${result.count} messages.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
