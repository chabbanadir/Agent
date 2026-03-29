import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { GmailService } from "@/lib/integrations/gmail";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const gmail = new GmailService(tenantId);
        const syncResult = await gmail.syncAllAccounts();

        // Trigger agent processing for any RECEIVED messages
        const { AgentProcessor } = await import("@/lib/agents/processor");
        await AgentProcessor.processPendingMessages();

        return NextResponse.json({
            success: true,
            status: syncResult.processed > 0 ? "Sync and processing completed" : "No new messages to sync",
            details: syncResult
        });
    } catch (error: any) {
        console.error("[Sync API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
