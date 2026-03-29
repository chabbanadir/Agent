import { GmailService } from "./integrations/gmail";
import prisma from "./prisma";
import { AgentProcessor } from "./agents/processor";

import fs from "fs";
import path from "path";
import { startTurnProcessorWorkers } from "../workers/TurnProcessorWorker";

declare global {
    var __isLoopRunning: boolean | undefined;
}

const LOCK_FILE = path.join(process.cwd(), ".worker.lock");

/**
 * Starts a background loop to poll for new emails across all tenants.
 * This ensures the agent is truly "autonomous".
 */
export function startAutonomousWorker() {
    if (globalThis.__isLoopRunning) return;
    
    // Check for physical file lock to handle multi-process scenarios (Next.js dev/cluster)
    if (fs.existsSync(LOCK_FILE)) {
        try {
            const content = fs.readFileSync(LOCK_FILE, "utf-8");
            const [lockPidStr, lockTimeStr] = content.split(":");
            const lockPid = parseInt(lockPidStr);
            const lockTime = parseInt(lockTimeStr);
            
            // Check if process is still alive
            process.kill(lockPid, 0); 
            
            // If we got here, process is alive. Check if it updated the lock recently (30s)
            if (Date.now() - lockTime < 30 * 1000) {
                console.log(`🚀 [Worker] Active worker detected (PID: ${lockPid}). [This Process: ${process.pid}]. Skipping initialization.`);
                return;
            }
            console.log(`🚀 [Worker] Stale lock detected (PID: ${lockPid} not heartbeating). [This Process: ${process.pid}] Taking over.`);
        } catch (err) {
            // Process dead or file corrupted, we can take over.
        }
    }

    globalThis.__isLoopRunning = true;
    
    // Write lock with PID and current time
    const updateLock = () => {
        try {
            fs.writeFileSync(LOCK_FILE, `${process.pid}:${Date.now()}`);
        } catch {}
    };
    
    updateLock();
    // Heartbeat every 10 seconds
    const heartbeat = setInterval(updateLock, 10000);
    heartbeat.unref(); // Don't keep process alive just for the heartbeat

    console.log("🚀 [Worker] Starting autonomous agent sync loop (PID: " + process.pid + ")...");
    
    // Start BullMQ workers
    startTurnProcessorWorkers();
    
    // Clean up lock on exit
    const cleanup = () => {
        try { 
            if (fs.existsSync(LOCK_FILE)) {
                const content = fs.readFileSync(LOCK_FILE, "utf-8");
                if (content.startsWith(`${process.pid}:`)) {
                    fs.unlinkSync(LOCK_FILE);
                }
            }
        } catch {}
        process.exit();
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    // Run immediately on start
    runSyncForAllTenants();
    
    // Also initialize all WhatsApp sessions
    import("./integrations/whatsapp").then(({ WhatsappManager }) => {
        WhatsappManager.initializeAllSessions(true); 
    });

    // Then run every 2 minutes
    setInterval(() => {
        runSyncForAllTenants();
        import("./integrations/whatsapp").then(({ WhatsappManager }) => {
            WhatsappManager.initializeAllSessions();
        });
    }, 2 * 60 * 1000);
}

let isSyncing = false;
async function runSyncForAllTenants() {
    if (isSyncing) {
        console.log(`🚀 [Worker] [PID: ${process.pid}] Sync already in progress, skipping this cycle.`);
        return;
    }
    isSyncing = true;

    try {
        // 1. Re-register watch for all GMAIL accounts that need it (every 6 days)
        const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
        const accountsToWatch = await prisma.channelAccount.findMany({
            where: {
                type: "GMAIL",
                isActive: true,
                OR: [
                    { lastWatchAt: null },
                    { lastWatchAt: { lt: sixDaysAgo } }
                ]
            }
        });

        for (const account of accountsToWatch) {
            try {
                console.log(`🚀 [Worker] Registering/Refreshing watch for ${account.address}...`);
                const gmailService = new GmailService(account.tenantId);
                await gmailService.registerWatch(account);
            } catch (err: any) {
                console.error(`🚀 [Worker] Failed to watch ${account.address}:`, err.message);
            }
        }

        // 2. Poll for all active tenants (fallback sync)
        const activeAccounts = await prisma.channelAccount.findMany({
            where: { isActive: true },
            select: { tenantId: true }
        });

        const distinctTenantIds = Array.from(new Set(activeAccounts.map(a => a.tenantId)));

        if (distinctTenantIds.length > 0) {
            console.log(`🚀 [Worker] Fallback poll for ${distinctTenantIds.length} tenants in parallel...`);
            await Promise.allSettled(distinctTenantIds.map(async (tenantId) => {
                try {
                    const gmailService = new GmailService(tenantId);
                    const result = await gmailService.pollAndProcess();
                    if (result.processed > 0) {
                        console.log(`🚀 [Worker] Tenant ${tenantId} synced ${result.processed} new emails.`);
                    }
                } catch (err: any) {
                    console.error(`🚀 [Worker] Sync failed for tenant ${tenantId}:`, err.message);
                }
            }));
        }

        // 3. Trigger processing for all pending messages across all tenants
        await AgentProcessor.processPendingMessages();

        // 4. Run long-term memory compression
        const { runGlobalContextArchiver } = await import("./agents/contextArchiver");
        await runGlobalContextArchiver();

    } catch (error) {
        console.error("❌ [Worker] Error in autonomous sync loop:", error);
    } finally {
        isSyncing = false;
    }
}
