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

  // Group messages into conversations
  const groups: Record<string, any[]> = {};
  messages.forEach(msg => {
      const groupId = msg.threadId || `sender:${msg.sender}`;
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(msg);
  });

  const finalResults = Object.entries(groups).map(([id, msgs]) => ({
      id,
      lastMessage: msgs[0],
      messages: msgs.reverse(), // History in chronological order
      sender: msgs[0].sender,
      source: msgs[0].source,
      count: msgs.length,
      updatedAt: msgs[0].createdAt
  }));
  console.log(JSON.stringify(finalResults, null, 2));
}
main().finally(() => prisma.$disconnect())
