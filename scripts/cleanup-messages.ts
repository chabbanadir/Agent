import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up database messages...');
  const deleted = await prisma.message.deleteMany({});
  console.log(`Successfully deleted ${deleted.count} messages and skipped records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
