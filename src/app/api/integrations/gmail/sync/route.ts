import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { GmailService } from "@/lib/integrations/gmail";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const gmail = new GmailService(tenantId);
        const result = await gmail.pollAndProcess(1);

        if (result.status === "already_running") {
            return NextResponse.json({
                success: true,
                status: "Sync already in progress in the background. Please wait.",
                details: result
            });
        }

        return NextResponse.json({
            success: true,
            status: result.processed > 0 ? "Sync completed" : "No new messages to sync",
            details: result
        });
    } catch (error: any) {
        console.error("[Sync API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
