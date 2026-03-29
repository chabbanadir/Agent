import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const result = await prisma.message.updateMany({
        where: {
            sender: { contains: 'Driss Maouni', mode: 'insensitive' },
            status: { not: 'COMPLETED' }
        },
        data: {
            status: 'RECEIVED',
            retryCount: 0
        }
    })
    console.log(`Updated ${result.count} messages from Driss Maouni to RECEIVED status.`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
