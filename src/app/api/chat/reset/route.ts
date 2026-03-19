import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const { threadId } = await req.json();

        if (!threadId) {
            return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
        }

        // Reset the latest message in this thread to RECEIVED status
        const messages = await prisma.message.findMany({
            where: { tenantId, threadId },
            orderBy: { createdAt: "desc" },
            take: 1
        });

        if (messages.length > 0) {
            await prisma.message.update({
                where: { id: messages[0].id },
                data: {
                    status: "RECEIVED",
                    trace: Prisma.DbNull
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Reset API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
