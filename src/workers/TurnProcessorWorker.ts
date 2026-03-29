import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { AgentProcessor } from '../lib/agents/processor'; 
import prisma from '../lib/prisma';

export const startTurnProcessorWorkers = () => {
  // WhatsApp Turn Processor
  const whatsappWorker = new Worker('whatsapp-turns', async (job) => {
    const { sessionId } = job.data;
    const redisKey = `session:messages:${sessionId}`;

    // Pop all messages from Redis list for this turn
    const rawMessages = await redis.lrange(redisKey, 0, -1);
    await redis.del(redisKey);

    if (rawMessages.length === 0) return;

    // Parse and optionally sort by internal payload timestamp
    const messages = rawMessages.map(m => JSON.parse(m)).sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[TurnWorker] Executing WhatsApp Turn for Session ${sessionId} (${messages.length} messages batched)`);
    
    // Inject presence update here (e.g. sending composing)
    try {
        const [accountId, sender] = sessionId.split(':');
        const account = await prisma.channelAccount.findUnique({ where: { id: accountId } });
        if (account) {
            const { WhatsappManager } = await import('../lib/integrations/whatsapp');
            const statusInstance = await WhatsappManager.getStatus(account.address);
            if (statusInstance) {
                // Ensure JID format
                const jid = sender.includes('@') ? sender : `${sender.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
                // Accessing internal WhatsappManager socket is possible or a new helper method
                // Let's assume we can trigger presence updates via socket directly since we have the instance if it's in the same process
                // But wait, the manager might be in another process. Let's add a helper method in WhatsappManager.
                await WhatsappManager.sendPresenceUpdate(account.address, jid, 'composing');
            }
        }
    } catch (e) {
        console.warn(`[TurnWorker] Failed to send composing presence:`, e);
    }

    try {
        await AgentProcessor.processTurn(messages, 'WHATSAPP');
    } catch (e) {
        console.error(`[TurnWorker] Failed to process WHATSAPP turn for ${sessionId}:`, e);
    }
  }, { connection: redis });

  // Email Turn Processor
  const emailWorker = new Worker('email-turns', async (job) => {
    const { sessionId } = job.data;
    const redisKey = `session:messages:${sessionId}`;

    const rawMessages = await redis.lrange(redisKey, 0, -1);
    await redis.del(redisKey);

    if (rawMessages.length === 0) return;

    const messages = rawMessages.map(m => JSON.parse(m)).sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[TurnWorker] Executing Email Turn for Session ${sessionId} (${messages.length} messages batched)`);

    try {
        await AgentProcessor.processTurn(messages, 'GMAIL');
    } catch (e) {
        console.error(`[TurnWorker] Failed to process GMAIL turn for ${sessionId}:`, e);
    }
  }, { connection: redis });

  console.log(`[TurnWorker] 🚀 Started BullMQ Workers for WhatsApp & Email Turn Protocols`);
};
