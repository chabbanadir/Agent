import { NextResponse } from "next/server";
import { TurnManager } from "@/lib/TurnManager";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // Optional: Ensure only authenticated admins can see this
        // const session = await getServerSession(authOptions);
        // if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const activeTurns = await TurnManager.getActiveTurns();
        
        return NextResponse.json({ success: true, turns: activeTurns });
    } catch (error: any) {
        console.error("[API] Failed to fetch active turns:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
