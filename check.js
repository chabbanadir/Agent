const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Connecting to Prisma...');
  try {
    const docs = await prisma.document.count();
    console.log('SUCCESS: Documents count:', docs);
  } catch (err) {
    console.error('ERROR connecting to Prisma:', err.message);
  }
}
main().finally(() => {
  console.log('Done.');
  process.exit(0);
});
