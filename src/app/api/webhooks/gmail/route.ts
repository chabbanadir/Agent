import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GmailService } from "@/lib/integrations/gmail";
import { AgentProcessor } from "@/lib/agents/processor";

/**
 * Handle Gmail Pub/Sub push notifications.
 * GCP Topic: projects/smpt-agent/topics/AdrenalinSurfMaroc
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!body.message?.data) {
            console.warn("[Gmail Webhook] Received malformed Pub/Sub message");
            return NextResponse.json({ error: "No data in message" }, { status: 400 });
        }

        // Decode the data from base64
        const decodedString = Buffer.from(body.message.data, "base64").toString("utf-8");
        const decodedData = JSON.parse(decodedString);
        const { emailAddress, historyId } = decodedData;

        console.log(`[Gmail Webhook] Notification for ${emailAddress}, historyId: ${historyId}`);

        // 1. Find the channel account(s) associated with this email
        const account = await prisma.channelAccount.findFirst({
            where: {
                address: { equals: emailAddress, mode: 'insensitive' },
                type: "GMAIL",
                isActive: true
            }
        });

        if (!account) {
            console.warn(`[Gmail Webhook] No active GMAIL account found for ${emailAddress}`);
            return NextResponse.json({ message: "No matching account" }, { status: 200 });
        }

        // 2. Trigger sync by history
        const gmail = new GmailService(account.tenantId);

        // We pass the updated account object with the historyId from the notification if available
        // Note: Gmail's notification historyId is often ahead of what we have
        const result = await gmail.syncByHistory(account);

        console.log(`[Gmail Webhook] Sync result for ${emailAddress}: ${result.processed} new messages.`);

        // 3. If new messages were found, trigger the processor
        if (result.processed > 0) {
            // Run processing in background to avoid timeout from GCP
            AgentProcessor.processPendingMessages().catch(err => {
                console.error("[Gmail Webhook] Async Processor failed:", err);
            });
        }

        return NextResponse.json({
            success: true,
            processed: result.processed,
            account: account.address
        });

    } catch (error: any) {
        console.error("[Gmail Webhook] Error processing webhook:", error.message);
        // We return 200 even on some errors to avoid GCP retrying indefinitely if it's a logic error
        // But for transient errors, a 500 is appropriate
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
