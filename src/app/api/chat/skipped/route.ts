import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenantId = session.user.tenantId || "default-tenant";

        // Fetch all messages for the tenant with status SKIPPED
        const messages = await prisma.message.findMany({
            where: {
                tenantId,
                status: "SKIPPED"
            },
            orderBy: { createdAt: "desc" },
            take: 100
        });

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error("Skipped Messages API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
