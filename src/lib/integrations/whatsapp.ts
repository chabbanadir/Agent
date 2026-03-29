import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    WASocket,
    proto,
    makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import pino from "pino";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs";
import { TurnManager } from "@/lib/TurnManager";

// Removed console.log override to see all logs during debugging


interface WAInstance {
    socket: WASocket | null;
    status: string;
    isConnecting?: boolean; // Guard to prevent multiple simultaneous connection attempts
    qr: string | null;
    updatedAt: Date;
    tenantId: string;
}

export class WhatsappManager {
    private static instances: Map<string, WAInstance> = new Map();

    /**
     * Internal: strips non-digits from address for consistent identifier.
     */
    private static sanitizeAddress(address: string): string {
        return address.replace(/[^0-9]/g, "");
    }

    /**
     * Returns session path on the filesystem for a given address.
     */
    private static getSessionPath(address: string): string {
        const sanitized = this.sanitizeAddress(address);
        return path.join(process.cwd(), "sessions", "whatsapp", sanitized);
    }

    static async getOrCreate(address: string, tenantId: string): Promise<WAInstance> {
        const id = this.sanitizeAddress(address);
        const existing = this.instances.get(id);
        if (existing && (existing.socket || existing.status === "INITIALIZING")) {
            console.log(`[WhatsApp] [${id}] Using existing instance (status: ${existing.status})`);
            return existing;
        }

        console.log(`[WhatsApp] [${id}] Creating NEW instance...`);
        const instance: WAInstance = {
            socket: null,
            status: "INITIALIZING",
            qr: null,
            updatedAt: new Date(),
            tenantId,
        };
        this.instances.set(id, instance);

        // Ensure the DB record exists using sanitized address
        await prisma.whatsAppSession.upsert({
            where: { address: id },
            create: { address: id, tenantId, status: "INITIALIZING" },
            update: { status: "INITIALIZING", qr: null },
        });

        // Start the connection in background
        this.connectSocket(id, tenantId, instance).catch((err) => {
            console.error(`[WhatsApp] [${id}] Failed to connect:`, err.message);
        });

        return instance;
    }

    /**
     * Internal: connect and manage a Baileys socket.
     */
    private static async connectSocket(address: string, tenantId: string, instance: WAInstance) {
        const id = this.sanitizeAddress(address);
        
        if (instance.isConnecting && instance.socket) {
            console.log(`[WhatsApp] [${id}] Connection already in progress, skipping duplicate call.`);
            return;
        }

        try {
            instance.isConnecting = true;
            console.log(`[WhatsApp] [${id}] Starting connection sequence...`);
            const sessionPath = this.getSessionPath(address);
            fs.mkdirSync(sessionPath, { recursive: true });

            const logger = pino({ level: "silent" }); // Silenced everything to stop crypto ratchet spam
            const { state, saveCreds } = await useMultiFileAuthState(this.getSessionPath(id));
            
            // Use dynamic version fetching with a robust latest fallback to avoid 405 Conflict
            let version: [number, number, number] = [2, 3000, 1035194821];
            try {
                const { version: latestVersion } = await fetchLatestBaileysVersion();
                version = latestVersion;
            } catch (err) {
                console.warn(`[WhatsApp] [${address}] Failed to fetch version, using fallback: ${version.join('.')}`);
            }

            console.log(`[WhatsApp] [${address}] Creating socket (version: ${version.join('.')})...`);

            // Explicitly end any existing socket for this instance to prevent multi-socket conflicts
            if (instance.socket) {
                console.log(`[WhatsApp] [${id}] Ending existing socket before new connection...`);
                try { instance.socket.end(undefined); } catch {}
                instance.socket = null;
            }

            const socket = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                logger,
                browser: ["Ubuntu", "Chrome", "20.0.0.0"],
                printQRInTerminal: false,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false, 
                connectTimeoutMs: 120000, // Increased timeout for slower environments
                getMessage: async (key) => {
                    return undefined; // Placeholder for message context resolution
                }
            });

            instance.socket = socket;
            console.log(`[WhatsApp] [${id}] Socket created, waiting for events...`);

            // Handle connection updates
            socket.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect, qr } = update;
                console.log(`[WhatsApp] [${id}] Connection update: ${connection || 'none'}, status: ${instance.status}`);

                if (qr) {
                    console.log(`[WhatsApp] [${id}] New QR code received.`);
                    instance.qr = qr;
                    instance.status = "QR_READY";
                    instance.updatedAt = new Date();
                    await prisma.whatsAppSession.upsert({
                        where: { address: id },
                        create: { address: id, tenantId, status: "QR_READY", qr },
                        update: { status: "QR_READY", qr },
                    });
                }

                if (connection === "open") {
                    console.log(`[WhatsApp] [${id}] SUCCESSFULLY CONNECTED!`);
                    instance.status = "CONNECTED";
                    instance.isConnecting = false;
                    instance.qr = null;
                    instance.updatedAt = new Date();
                    await prisma.whatsAppSession.upsert({
                        where: { address: id },
                        create: { address: id, tenantId, status: "CONNECTED", qr: null },
                        update: { status: "CONNECTED", qr: null },
                    });
                }

                if (connection === "close") {
                    const error = lastDisconnect?.error as any;
                    const statusCode = error?.output?.statusCode || error?.statusCode || 0;
                    const loggedOut = statusCode === DisconnectReason.loggedOut;
                    const reason = error?.message || "No error message";
                    
                    console.log(`[WhatsApp] [${id}] Connection CLOSED. Reason: ${reason}, Code: ${statusCode}, LoggedOut: ${loggedOut}`);

                    instance.socket = null;
                    instance.isConnecting = false;
                    const isConflict = String(statusCode) === "440" || String(statusCode) === "405";
                    instance.status = loggedOut ? "DISCONNECTED" : (isConflict ? "ERROR" : "RECONNECTING");
                    instance.updatedAt = new Date();

                    // Sync status to DB
                    await prisma.whatsAppSession.upsert({
                        where: { address: id },
                        create: { address: id, tenantId, status: instance.status, qr: null },
                        update: { status: instance.status, qr: null },
                    });

                    if (loggedOut) {
                        console.log(`[WhatsApp] [${id}] Logged out. Session needs re-pairing.`);
                        this.instances.delete(id);
                        try {
                            const sessionPath = this.getSessionPath(id);
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                        } catch {}
                        return;
                    }

                    if (isConflict) {
                        console.log(`[WhatsApp] [${id}] Fatal 440/405 Conflict. Stopping auto-reconnect to allow WhatsApp state to clear. Manual reset required.`);
                        return;
                    }

                    // Auto-reconnect after 15s delay for non-fatal errors
                    setTimeout(() => {
                        console.log(`[WhatsApp] [${id}] Attempting scheduled reconnection...`);
                        this.connectSocket(id, tenantId, instance).catch(() => {});
                    }, 15000);
                }
            });

            // Handle credential updates
            socket.ev.on("creds.update", saveCreds);

            // Handle presence updates (Typing Indicators)
            socket.ev.on("presence.update", async (update) => {
                const remoteJid = update.id;
                const presenceData = update.presences[remoteJid];
                if (!presenceData) return;
                
                const status = presenceData.lastKnownPresence;
                if (status === 'composing' || status === 'recording' || status === 'paused') {
                    const channelAccount = await prisma.channelAccount.findFirst({
                        where: { address: id, type: "WHATSAPP", tenantId },
                    });
                    if (!channelAccount) return;
                    
                    const cleanSender = remoteJid.includes('@s.whatsapp.net') ? `+${remoteJid.split('@')[0]}` : remoteJid;
                    const sessionId = `${channelAccount.id}_${cleanSender}`;
                    
                    await TurnManager.handlePresenceUpdate(sessionId, status);
                }
            });

            // Handle incoming messages
            socket.ev.on("messages.upsert", async ({ messages: incoming, type }) => {
                console.log(`[WhatsApp] [${id}] messages.upsert received. Type: ${type}, Count: ${incoming.length}`);
                if (type !== "notify") return;

                for (const msg of incoming) {
                    if (!msg.message) continue;

                    const textContent =
                        msg.message?.conversation ||
                        msg.message?.extendedTextMessage?.text ||
                        msg.message?.imageMessage?.caption ||
                        msg.message?.videoMessage?.caption ||
                        "";

                    if (!textContent.trim() && !msg.key.fromMe) {
                        continue;
                    }

                    // Allow 'fromMe' messages ONLY if they contain a manager intervention REF tag
                    if (msg.key.fromMe) {
                        if (!textContent.includes('REF-')) {
                            continue;
                        }
                    }

                    try {
                        const remoteJid = msg.key.remoteJid;
                        if (!remoteJid) continue;

                        // NEW: Ignore Group messages and Broadcasts
                        if (remoteJid.endsWith('@g.us') || remoteJid.includes('@broadcast')) {
                            console.log(`[WhatsApp] Ignoring group/broadcast message from ${remoteJid}`);
                            continue;
                        }

                        // NEW: Ignore messages older than 2 minutes (prevents bot from answering missed messages upon startup)
                        const messageTimestamp = msg.messageTimestamp;
                        const now = Math.floor(Date.now() / 1000);
                        if (messageTimestamp && now - Number(messageTimestamp) > 120) {
                            console.log(`[WhatsApp] Skipping old message from ${remoteJid} (Timestamp: ${messageTimestamp})`);
                            continue;
                        }

                        // NEW: Clean sender ID and capture name
                        const pushName = msg.pushName || "";
                        const cleanSender = remoteJid.includes('@s.whatsapp.net')
                            ? `+${remoteJid.split('@')[0]}`
                            : remoteJid;

                        // Find the channel account for this address. 
                        let channelAccount = await prisma.channelAccount.findFirst({
                            where: { address: id, type: "WHATSAPP", tenantId },
                        });

                        if (!channelAccount) {
                            const allWhatsApp = await prisma.channelAccount.findMany({
                                where: { type: "WHATSAPP", tenantId }
                            });
                            const found = allWhatsApp.find(a => this.sanitizeAddress(a.address) === id);
                            if (found) channelAccount = found;
                        }

                        if (!channelAccount) {
                            console.warn(`[WhatsApp] [${id}] No ChannelAccount found for incoming message sender ${remoteJid}`);
                            continue;
                        }

                        // NEW: Check Blacklist
                        const isBlacklisted = await prisma.blacklistedNumber.findUnique({
                            where: {
                                tenantId_channel_address: {
                                    tenantId,
                                    channel: "WHATSAPP",
                                    address: cleanSender
                                }
                            }
                        });

                        if (isBlacklisted) {
                            console.log(`[WhatsApp] Ignoring message from blacklisted number: ${cleanSender}`);
                            continue;
                        }

                        const createdMessage = await prisma.message.create({
                            data: {
                                tenantId,
                                channelAccountId: channelAccount.id,
                                externalId: msg.key.id || undefined,
                                threadId: remoteJid,
                                source: "WHATSAPP",
                                sender: remoteJid,
                                content: textContent,
                                role: "user",
                                status: "RECEIVED",
                            },
                        });
                        console.log(`[WhatsApp] [${id}] Message persisted: from=${pushName || cleanSender} (${cleanSender}), text="${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}"`);
                        
                        // NEW: Route to TurnManager instead of immediate processing
                        const sessionId = `${channelAccount.id}_${cleanSender}`;
                        await TurnManager.addMessage(sessionId, createdMessage as any, { protocol: 'WHATSAPP', baseTimeoutMs: 10000 });
                        
                    } catch (err: any) {
                        // Ignore unique constraint (duplicate message)
                        if (err.code === "P2002") {
                            console.log(`[WhatsApp] [${id}] Message already exists (duplicate), skipping persistence.`);
                            continue;
                        }
                        console.error(`[WhatsApp] [${id}] Failed to persist message:`, err.message);
                    }
                }
            });
        } catch (err: any) {
            instance.isConnecting = false;
            console.error(`[WhatsApp] [${id}] Fatal error in connectSocket:`, err.message);
            instance.status = "ERROR";
            await prisma.whatsAppSession.upsert({
                where: { address: id },
                create: { address: id, tenantId, status: "ERROR" },
                update: { status: "ERROR" },
            });
        }
    }

    /**
     * Get the current status for a given address.
     */
    static async getStatus(address: string): Promise<WAInstance | null> {
        const id = this.sanitizeAddress(address);
        // Check in-memory first
        const memInstance = this.instances.get(id);
        if (memInstance) return memInstance;

        // Fallback: check DB
        const dbSession = await prisma.whatsAppSession.findUnique({ where: { address: id } });
        if (!dbSession) return null;

        return {
            socket: null,
            status: dbSession.status,
            qr: dbSession.qr,
            updatedAt: dbSession.updatedAt,
            tenantId: dbSession.tenantId,
        };
    }

    /**
     * Delete a session (logout & cleanup).
     */
    static async deleteSession(address: string) {
        const id = this.sanitizeAddress(address);
        const instance = this.instances.get(id);
        if (instance?.socket) {
            try {
                await instance.socket.logout();
            } catch {}
            instance.socket = null;
        }
        this.instances.delete(id);

        // Clean up filesystem
        const sessionPath = this.getSessionPath(id);
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch {}

        // Clean up DB
        await prisma.whatsAppSession.deleteMany({ where: { address: id } });
    }

    /**
     * Initialize all previously connected WhatsApp sessions on startup.
     */
    static async initializeAllSessions(forceRetry: boolean = false) {
        try {
            console.log(`[WhatsApp] Checking for sessions to restore (Force retry: ${forceRetry})...`);
            
            // 0. Auto-sanitize existing ChannelAccount addresses for WhatsApp
            const accounts = await prisma.channelAccount.findMany({ where: { type: "WHATSAPP" } });
            for (const acc of accounts) {
                const sanitized = this.sanitizeAddress(acc.address);
                if (sanitized !== acc.address) {
                    try {
                        console.log(`[WhatsApp] Auto-sanitizing ChannelAccount in DB: ${acc.address} -> ${sanitized}`);
                        await prisma.channelAccount.update({
                            where: { id: acc.id },
                            data: { address: sanitized }
                        });
                        acc.address = sanitized;
                    } catch (err: any) {
                        console.error(`[WhatsApp] Failed to sanitize account ${acc.address}:`, err.message);
                    }
                }
            }

            // 1. Fetch and sanitize all potentially active sessions
            const rawSessions = await prisma.whatsAppSession.findMany({
                where: forceRetry 
                    ? { status: { not: "LOGGED_OUT" } }
                    : { status: { notIn: ["LOGGED_OUT", "ERROR"] } },
            });

            // Sanitize WhatsAppSession table and deduplicate by address
            const sessionsMap = new Map<string, typeof rawSessions[0]>();
            for (const session of rawSessions) {
                const id = this.sanitizeAddress(session.address);
                if (id !== session.address) {
                    try {
                        // Check if a session already exists for the sanitized address
                        const exists = await prisma.whatsAppSession.findUnique({
                            where: { address: id }
                        });
                        
                        if (exists) {
                            console.log(`[WhatsApp] Deleting duplicate unsanitized session: ${session.address} (Already exists as ${id})`);
                            await prisma.whatsAppSession.delete({ where: { id: session.id } });
                            continue; // Move to next
                        } else {
                            console.log(`[WhatsApp] Auto-sanitizing WhatsAppSession in DB: ${session.address} -> ${id}`);
                            await prisma.whatsAppSession.update({
                                where: { id: session.id },
                                data: { address: id }
                            });
                            session.address = id;
                        }
                    } catch (err: any) {
                        console.error(`[WhatsApp] Failed to sanitize/deduplicate session ${session.address}:`, err.message);
                        continue;
                    }
                }
                
                // Deduplicate in-memory to ensure only one per ID is processed in the loop below
                if (!sessionsMap.has(id)) {
                    sessionsMap.set(id, session);
                } else {
                    console.log(`[WhatsApp] Skipping in-memory duplicate session for ${id}`);
                }
            }

            const sessions = Array.from(sessionsMap.values());

            if (sessions.length === 0) {
                console.log("[WhatsApp] No potential sessions to restore.");
                return;
            }

            // 2. Cross-reference with ChannelAccount.isActive
            for (const session of sessions) {
                const id = session.address; // Already sanitized
                const account = await prisma.channelAccount.findFirst({
                    where: { 
                        address: id, // Use EXACT sanitized ID
                        type: "WHATSAPP",
                        tenantId: session.tenantId
                    }
                });

                const isRunning = this.instances.has(id);

                if (!account || !account.isActive) {
                    if (isRunning) {
                        console.log(`[WhatsApp] Channel for ${id} is now INACTIVE. Closing socket...`);
                        const instance = this.instances.get(id);
                        if (instance?.socket) {
                            try { instance.socket.end(undefined); } catch {}
                        }
                        this.instances.delete(id);
                    }
                    continue;
                }

                // If already running and active, skip
                if (isRunning && this.instances.get(id)?.socket) continue;

                // 3. Restore session if active
                const sessionPath = this.getSessionPath(id);
                if (!fs.existsSync(sessionPath)) {
                    console.log(`[WhatsApp] No session files for ${id}, marking DISCONNECTED`);
                    await prisma.whatsAppSession.update({
                        where: { id: session.id },
                        data: { status: "DISCONNECTED", qr: null },
                    });
                    continue;
                }

                console.log(`[WhatsApp] Restoring active session for ${id}...`);
                try {
                    await this.getOrCreate(id, session.tenantId!);
                } catch (err: any) {
                    console.error(`[WhatsApp] Failed to restore session for ${id}:`, err.message);
                }
            }

            // 4. Cleanup any orphan instances (if account was deleted or address changed)
            for (const address of this.instances.keys()) {
                const stillExists = sessions.some(s => s.address === address);
                if (!stillExists) {
                    console.log(`[WhatsApp] Cleaning up orphan instance for ${address}`);
                    const instance = this.instances.get(address);
                    if (instance?.socket) try { instance.socket.end(undefined); } catch {}
                    this.instances.delete(address);
                }
            }
        } catch (err: any) {
            console.error("[WhatsApp] Failed to initialize sessions:", err.message);
        }
    }

    /**
     * Send a WhatsApp message through an active session.
     */
    static async sendMessage(accountAddress: string, recipientJid: string, text: string) {
        const id = this.sanitizeAddress(accountAddress);
        const instance = this.instances.get(id);
        if (!instance?.socket) {
            throw new Error(`No active WhatsApp session for ${id}`);
        }

        // Ensure the JID is in proper format
        let jid = recipientJid;
        if (!jid.includes("@")) {
            jid = jid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }

        await instance.socket.sendMessage(jid, { text });
    }

    /**
     * Send a Presence Update (e.g. 'composing', 'paused')
     */
    static async sendPresenceUpdate(accountAddress: string, recipientJid: string, status: 'composing' | 'paused' | 'recording') {
        const id = this.sanitizeAddress(accountAddress);
        const instance = this.instances.get(id);
        if (!instance?.socket) return;

        let jid = recipientJid;
        if (!jid.includes("@")) {
            jid = jid.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }

        await instance.socket.sendPresenceUpdate(status as any, jid);
    }

    /**
     * Sync recent chat history for a specific contact from WhatsApp.
     * This is called on-demand when a conversation is opened in the dashboard.
     */
    static async syncRecentHistory(
        channelAccountId: string,
        remoteJid: string,
        tenantId: string
    ) {
        // This is best-effort; if no active socket, we just skip silently
        const account = await prisma.channelAccount.findUnique({
            where: { id: channelAccountId },
        });
        if (!account) return;

        const id = this.sanitizeAddress(account.address);
        const instance = this.instances.get(id);
        if (!instance?.socket) return;

        // Baileys doesn't provide a simple "fetch history" API for WhatsApp Web multi-device.
        // History is received via the messages.upsert event when the socket connects.
        // This method is a no-op placeholder that silences the on-demand sync warning.
    }
}
