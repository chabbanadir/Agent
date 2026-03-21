import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const docs = await prisma.document.findMany({
        select: { id: true, name: true, tenantId: true }
    })
    console.log('--- Documents ---')
    console.table(docs)

    const chunks = await prisma.documentChunk.findMany({
        take: 5,
        select: { content: true, document: { select: { name: true } } }
    })
    console.log('--- Sample Chunks ---')
    chunks.forEach(c => {
        console.log(`[${c.document.name}] ${c.content.substring(0, 100)}...`)
    })
}

main().finally(() => prisma.$disconnect())
