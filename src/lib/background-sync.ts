import { GmailService } from "./integrations/gmail";
import prisma from "./prisma";

let isLoopRunning = false;

/**
 * Starts a background loop to poll for new emails across all tenants.
 * This ensures the agent is truly "autonomous".
 */
export function startAutonomousWorker() {
    if (isLoopRunning) return;
    isLoopRunning = true;

    console.log("🚀 [Worker] Starting autonomous agent sync loop...");

    // Run immediately on start
    runSyncForAllTenants();

    // Then run every 2 minutes
    setInterval(() => {
        runSyncForAllTenants();
    }, 2 * 60 * 1000);
}

async function runSyncForAllTenants() {
    try {
        const tenants = await prisma.tenant.findMany({
            where: { gmailEmail: { not: null } }
        });

        console.log(`🚀 [Worker] Polling for ${tenants.length} tenants...`);

        for (const tenant of tenants) {
            const gmailService = new GmailService(tenant.id);
            const result = await gmailService.pollAndProcess();
            if (result.processed > 0) {
                console.log(`🚀 [Worker] Tenant ${tenant.id} processed ${result.processed} emails.`);
            }
        }
    } catch (error) {
        console.error("❌ [Worker] Error in autonomous sync loop:", error);
    }
}
