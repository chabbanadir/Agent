import { WhatsappManager } from '../src/lib/integrations/whatsapp';
import prisma from '../src/lib/prisma';
import 'dotenv/config';

async function main() {
    const targetNumber = '212661210726@s.whatsapp.net';
    const testContent = 'Hello Nadir! This is an automated connectivity test from your Agent system. Reach out if you see this! 🚀';

    console.log("🔍 Checking active WhatsApp sessions...");
    
    // We need to wait for sessions to be initialized by the app
    // In a script context, we might need to manually trigger initialization if not running in the container
    // However, since we are in the same volume, we can just call it.
    
    await WhatsappManager.initializeAllSessions();
    
    // Wait a bit for connections to open
    console.log("⏳ Waiting 10s for connections to stabilize...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
        console.log(`📤 Sending test message to ${targetNumber}...`);
        await WhatsappManager.sendTestMessage(targetNumber, testContent);
        console.log("✅ Message sent successfully!");

        console.log(`📥 Reading last unread messages from ${targetNumber}...`);
        const messages = await WhatsappManager.getUnreadMessages(targetNumber);
        
        console.log(`\n--- Recent Messages from ${targetNumber} ---`);
        messages.forEach((m: any, i: number) => {
            const content = m.message?.conversation || m.message?.extendedTextMessage?.text || "[Non-text message]";
            const fromMe = m.key.fromMe ? " (YOU)" : "";
            console.log(`${i+1}. [${new Date(m.messageTimestamp * 1000).toLocaleString()}]${fromMe}: ${content}`);
        });
        console.log("------------------------------------------\n");

    } catch (err) {
        console.error("❌ Test failed:", err);
    } finally {
        // Since WhatsappManager keeps sockets open, we might need to exit manually
        process.exit(0);
    }
}

main();
