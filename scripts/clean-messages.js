const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agent_db";

async function main() {
    console.log("🧹 Initializing database cleanup...");

    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const count = await prisma.message.count();
        console.log(`🔍 Found ${count} messages in the database.`);

        // 1. For each GMAIL account, get the CURRENT historyId from Gmail
        const accounts = await prisma.channelAccount.findMany({
            where: { type: "GMAIL", isActive: true }
        });

        const { google } = require('googleapis');
        for (const account of accounts) {
            try {
                const creds = account.credentials;
                if (!creds || !creds.access_token) continue;

                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
                oauth2Client.setCredentials({
                    access_token: creds.access_token,
                    refresh_token: creds.refresh_token,
                });

                const gmail = google.gmail({ version: "v1", auth: oauth2Client });
                const profile = await gmail.users.getProfile({ userId: "me" });
                const currentHistoryId = profile.data.historyId;

                await prisma.channelAccount.update({
                    where: { id: account.id },
                    data: {
                        lastHistoryId: currentHistoryId,
                        lastWatchAt: new Date()
                    }
                });
                console.log(`📌 Pinned history ID ${currentHistoryId} for ${account.address}`);
            } catch (err) {
                console.error(`⚠️ Failed to pin history for ${account.address}:`, err.message);
            }
        }

        if (count > 0) {
            await prisma.message.deleteMany();
            console.log("✅ Successfully truncated the Message table.");
        } else {
            console.log("ℹ️ Message table is already empty.");
        }

        // Also clear any stuck synchronization flags if they exist in Tenant or elsewhere
        await prisma.tenant.updateMany({
            data: { isSyncing: false }
        });
        console.log("✅ Reset synchronization locks for all tenants.");

    } catch (error) {
        console.error("❌ Cleanup failed:", error.message);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

main();
