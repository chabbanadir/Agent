import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tenantId = 'cmmxc6md700020tph3m4i1kg4'
  const messages = await prisma.message.findMany({
    where: {
      tenantId,
      NOT: {
        category: { in: ["SPAM", "SOCIAL", "OTHER"] }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200
  })

  console.log(`Found ${messages.length} messages. Categories: ${[...new Set(messages.map(m => m.category))].join(", ")}`);
}

main().finally(() => prisma.$disconnect())
