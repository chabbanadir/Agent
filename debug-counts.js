const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    console.log('--- Database Audit ---');
    try {
        const total = await prisma.message.count();
        const skipped = await prisma.message.count({ where: { status: 'SKIPPED' } });
        const failed = await prisma.message.count({ where: { status: 'FAILED' } });
        const completed = await prisma.message.count({ where: { status: 'COMPLETED' } });
        const automated = await prisma.message.count({ where: { category: 'AUTOMATED' } });
        const spam = await prisma.message.count({ where: { category: 'SPAM' } });
        const social = await prisma.message.count({ where: { category: 'SOCIAL' } });
        const other = await prisma.message.count({ where: { category: 'OTHER' } });
        
        console.log({
            total,
            skipped,
            failed,
            completed,
            automated,
            spam,
            social,
            other
        });
        
        if (total > 0) {
            const latest = await prisma.message.findFirst({ orderBy: { createdAt: 'desc' } });
            console.log('Latest message date:', latest.createdAt);
        }
    } catch (err) {
        console.error('Audit Error:', err.message);
    }
}
main().finally(() => process.exit(0));
