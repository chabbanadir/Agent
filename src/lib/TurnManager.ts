import { Queue } from 'bullmq';
import { redis } from './redis';

/**
 * Common shape for stored messages
 */
export interface TurnMessagePayload {
  id: string;
  senderAddress: string;
  senderName?: string;
  channelId: string;
  tenantId: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  timestamp: number;
}

export interface TurnConfig {
  protocol: 'WHATSAPP' | 'EMAIL';
  baseTimeoutMs: number;
}

class TurnManagerService {
  public queues: { [key: string]: Queue };

  constructor() {
    this.queues = {
      'whatsapp-turns': new Queue('whatsapp-turns', { connection: redis }),
      'email-turns': new Queue('email-turns', { connection: redis }),
    };
  }

  /**
   * Generates a unique REDIS key for a given session.
   */
  private getSessionKey(sessionId: string) {
    return `session:messages:${sessionId}`;
  }

  /**
   * Adds a message to the current "Turn" and schedules/reschedules the processing job.
   */
  public async addMessage(sessionId: string, message: TurnMessagePayload, config: TurnConfig) {
    const key = this.getSessionKey(sessionId);
    
    // 1. Store the message in Redis List
    await redis.rpush(key, JSON.stringify(message));
    // Set an absolute expiry across the list just in case (e.g. 1 hour)
    await redis.expire(key, 60 * 60);

    // 2. Schedule or Reschedule the Job
    const queueName = config.protocol === 'WHATSAPP' ? 'whatsapp-turns' : 'email-turns';
    const queue = this.queues[queueName];

    // With BullMQ, if we add a job with a custom jobId, it deduplicates/replaces if configured properly.
    // We can explicitly remove the old job to reset the timer (Debounce)
    const existingJob = await queue.getJob(sessionId);
    if (existingJob) {
      // If it's WhatsApp, we want the sliding window (Debounce)
      // If it's Email, we may just let the original timer run (Batching)
      if (config.protocol === 'WHATSAPP') {
        await existingJob.remove();
        // Create new delayed job extending the timeout
        await queue.add(
          'process-turn', 
          { sessionId, protocol: config.protocol },
          { delay: config.baseTimeoutMs, jobId: sessionId } // Use sessionId as job Id to guarantee 1 job per session
        );
      }
      // For Email, if the job exists, we don't reset the timer. It will process when the first email timer pops.
    } else {
      // First message of the turn
      await queue.add(
        'process-turn',
        { sessionId, protocol: config.protocol },
        { delay: config.baseTimeoutMs, jobId: sessionId }
      );
    }
  }

  /**
   * Handles Presence updates like "composing" or "paused" from WhatsApp.
   */
  public async handlePresenceUpdate(sessionId: string, status: 'composing' | 'paused' | 'recording') {
    const queue = this.queues['whatsapp-turns'];
    const existingJob = await queue.getJob(sessionId);
    
    // If there is no active turn (no messages), we don't start a turn just for a typing presence.
    // Wait for the actual message.
    if (!existingJob) return;

    if (status === 'composing' || status === 'recording') {
      // User started typing again. Extend the timer drastically so we don't interrupt.
      await existingJob.remove();
      await queue.add(
        'process-turn', 
        { sessionId, protocol: 'WHATSAPP' },
        { delay: 45000, jobId: sessionId } // Hard Timeout of 45 seconds if they get stuck typing
      );
    } else if (status === 'paused') {
      // User stopped typing. Immediately trigger the turn in a short amount of time.
      // Wait 3s max "just in case"
      await existingJob.remove();
      await queue.add(
        'process-turn', 
        { sessionId, protocol: 'WHATSAPP' },
        { delay: 3000, jobId: sessionId } 
      );
    }
  }

  /**
   * Fetches all currently active (delayed) turns across all protocols.
   * Useful for the Dashboard UI.
   */
  public async getActiveTurns() {
    const whatsappJobs = await this.queues['whatsapp-turns'].getDelayed();
    const emailJobs = await this.queues['email-turns'].getDelayed();

    const formatJob = async (job: any, protocol: string) => {
      const sessionId = job.data.sessionId;
      const redisKey = this.getSessionKey(sessionId);
      const messagesCount = await redis.llen(redisKey);
      
      const executeAt = job.timestamp + job.delay;
      
      // Fetch some context if available (like the last message)
      const rawMessages = await redis.lrange(redisKey, -1, -1);
      const lastMessage = rawMessages.length > 0 ? JSON.parse(rawMessages[0]) : null;

      return {
        sessionId,
        protocol,
        messagesCount,
        executeAt,
        senderOriginal: lastMessage?.senderAddress || sessionId,
        lastContentSnippet: lastMessage?.content ? lastMessage.content.substring(0, 40) + '...' : ''
      };
    };

    const turns = await Promise.all([
      ...whatsappJobs.map(j => formatJob(j, 'WHATSAPP')),
      ...emailJobs.map(j => formatJob(j, 'EMAIL'))
    ]);

    return turns.sort((a, b) => a.executeAt - b.executeAt);
  }
}

// Export singleton
export const TurnManager = new TurnManagerService();
