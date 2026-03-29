import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const blacklisted = await prisma.blacklistedNumber.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(blacklisted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const body = await req.json();
        const { address, channel = "WHATSAPP", reason } = body;

        if (!address) {
            return NextResponse.json({ error: "Address is required" }, { status: 400 });
        }

        let cleanAddress = address;
        if (channel === "WHATSAPP") {
            cleanAddress = address.replace(/[^0-9+]/g, "");
            if (!cleanAddress.startsWith("+") && cleanAddress.length > 8) {
               cleanAddress = "+" + cleanAddress;
            }
        }

        const blacklisted = await prisma.blacklistedNumber.upsert({
            where: {
                tenantId_channel_address: {
                    tenantId,
                    channel,
                    address: cleanAddress
                }
            },
            update: { reason },
            create: { tenantId, channel, address: cleanAddress, reason }
        });

        return NextResponse.json(blacklisted);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const tenantId = session?.user?.tenantId || "default-tenant";

        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        await prisma.blacklistedNumber.delete({
            where: { id, tenantId }
        });

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
