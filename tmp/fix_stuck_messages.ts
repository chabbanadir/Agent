
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️  [Fix] Starting stuck message reset...");

    // 1. Reset all PROCESSING messages to RECEIVED
    // This allows the current worker to pick them up and re-classify them
    const result = await prisma.message.updateMany({
        where: {
            status: "PROCESSING"
        },
        data: {
            status: "RECEIVED",
            retryCount: 0,
            lastProcessedAt: null
        }
    });

    console.log(`✅ [Fix] Successfully reset ${result.count} messages to RECEIVED.`);

    // 2. Identify and skip clear AUTOMATED ones immediately to avoid noise if possible
    // (Optional, but helps clear the UI faster)
    const automated = await prisma.message.updateMany({
        where: {
            status: "RECEIVED",
            OR: [
                { sender: { contains: "no-reply" } },
                { sender: { contains: "noreply" } },
                { sender: { contains: "notification" } },
                { sender: { contains: "alert" } }
            ]
        },
        data: {
            status: "SKIPPED",
            category: "AUTOMATED"
        }
    });

    console.log(`✅ [Fix] Directly marked ${automated.count} automated messages as SKIPPED.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
