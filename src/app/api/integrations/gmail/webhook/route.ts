import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GmailService } from "@/lib/integrations/gmail";

/**
 * Public Webhook for Google Cloud Pub/Sub
 * This endpoint is called when a new email arrives if Gmail watch() is configured.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("[Gmail Webhook] Received notification:", body);

        // Pub/Sub messages are base64 encoded in the 'message.data' field
        // But for testing or simple setups, we just trigger a broad sync

        // Find all tenants that have Gmail configured
        const tenants = await (prisma as any).tenant.findMany({
            where: {
                gmailEmail: { not: null }
            }
        });

        console.log(`[Gmail Webhook] Triggering sync for ${tenants.length} tenants`);

        const results = await Promise.all(tenants.map(async (tenant: any) => {
            const gmail = new GmailService(tenant.id);
            return gmail.pollAndProcess(10);
        }));

        return NextResponse.json({
            success: true,
            processed: results.reduce((acc, r) => acc + r.processed, 0),
            tenants: tenants.length
        });

    } catch (error: any) {
        console.error("[Gmail Webhook Error]:", error);
        // Always return 200 to Pub/Sub to avoid retries on simple failures
        return NextResponse.json({ error: error.message }, { status: 200 });
    }
}
