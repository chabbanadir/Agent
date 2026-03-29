import { makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';

async function testWhatsapp() {
    console.log("Starting whatsapp test...");
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./tmp/baileys_auth_info');

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'info' }),
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("\nGot QR!\n", qr);
        }
        if (connection === 'close') {
            console.log("Connection closed", lastDisconnect?.error);
        } else if (connection === 'open') {
            console.log("Connection opened");
            process.exit(0);
        }
    });
}

testWhatsapp();
