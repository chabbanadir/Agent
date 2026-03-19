import prisma from './src/lib/prisma';

async function main() {
    console.log("Testing Prisma connection...");
    try {
        const documents = await prisma.document.findMany({ take: 1 });
        console.log("Connection successful! Found documents:", documents.length);
    } catch (error) {
        console.error("Prisma error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
