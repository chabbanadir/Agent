const fetch = require('node-fetch');

async function testHistory() {
    // Note: This assumes the dev server is running on localhost:3000
    // and that we can bypass auth for this internal test if we simulate the session or use a mock.
    // However, since we're in the same environment, we can check the file logic directly or
    // use a mock of the grouping logic.

    // Let's mock the grouping logic with sample data to verify it works as intended.
    const extractEmail = (str) => {
        if (!str) return "unknown";
        const match = str.match(/<([^>]+)>/);
        return match ? match[1].toLowerCase() : str.toLowerCase();
    };

    const messages = [
        { id: "1", role: "user", sender: "User <user@example.com>", content: "Hello", threadId: "t1", createdAt: new Date("2024-03-22T08:00:00Z") },
        { id: "2", role: "assistant", sender: "Agent", content: "Hi there!", threadId: "t1", createdAt: new Date("2024-03-22T08:01:00Z") },
        { id: "3", role: "user", sender: "User <user@example.com>", content: "How are you?", threadId: "t1", createdAt: new Date("2024-03-22T08:02:00Z") },
        { id: "4", role: "assistant", sender: "Agent", content: "To: User <user@example.com>\nI'm good!", parentMessageId: "3", createdAt: new Date("2024-03-22T08:03:00Z") },
        { id: "5", role: "assistant", sender: "Agent", content: "To: user@example.com\nAnything else?", createdAt: new Date("2024-03-22T08:04:00Z") }, // Orphaned but with "To"
    ];

    const groups = {};
    const threadToGroup = new Map();
    const msgToGroup = new Map();
    const emailToGroup = new Map();

    // First pass
    [...messages].reverse().filter(m => m.role === 'user').forEach(msg => {
        const senderEmail = extractEmail(msg.sender);
        let gId = msg.threadId && threadToGroup.has(msg.threadId)
            ? threadToGroup.get(msg.threadId)
            : (emailToGroup.has(senderEmail) ? emailToGroup.get(senderEmail) : `email:${senderEmail}`);

        if (!groups[gId]) groups[gId] = [];
        groups[gId].push(msg);

        msgToGroup.set(msg.id, gId);
        if (msg.threadId) threadToGroup.set(msg.threadId, gId);
        emailToGroup.set(senderEmail, gId);
    });

    // Second pass
    messages.filter(m => m.role === 'assistant').forEach(msg => {
        let gId = "";
        if (msg.threadId && threadToGroup.has(msg.threadId)) {
            gId = threadToGroup.get(msg.threadId);
        } else if (msg.parentMessageId && msgToGroup.has(msg.parentMessageId)) {
            gId = msgToGroup.get(msg.parentMessageId);
        } else {
            const content = msg.content || "";
            const toMatch = content.match(/To: (.*)\n/i);
            const recipientEmail = toMatch ? extractEmail(toMatch[1]) : null;

            if (recipientEmail && emailToGroup.has(recipientEmail)) {
                gId = emailToGroup.get(recipientEmail);
            } else {
                gId = `agent:${msg.sender}`;
            }
        }

        if (!groups[gId]) groups[gId] = [];
        groups[gId].push(msg);
    });

    console.log("Groups found:", Object.keys(groups));
    for (const [id, msgs] of Object.entries(groups)) {
        console.log(`Group: ${id} (${msgs.length} messages)`);
        const sorted = msgs.sort((a, b) => a.createdAt - b.createdAt);
        sorted.forEach(m => console.log(`  [${m.role}] ${m.content.substring(0, 20)}`));
    }
}

testHistory();
