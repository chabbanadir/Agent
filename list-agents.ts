import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const agents = await prisma.agent.findMany()
    console.table(agents.map(a => ({ id: a.id, name: a.name, provider: a.provider, isActive: a.isActive })))
}

main().finally(() => prisma.$disconnect())
