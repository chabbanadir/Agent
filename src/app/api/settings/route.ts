import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        }) as any;

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        return NextResponse.json({
            gmailEmail: tenant.gmailEmail || "",
            whatsappNumber: tenant.whatsappNumber || "",
            gmailSettings: tenant.gmailSettings || {},
            whatsappSettings: tenant.whatsappSettings || {}
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await req.json();
        const { gmailEmail, whatsappNumber, gmailSettings, whatsappSettings } = body;

        const updated = await prisma.tenant.update({
            where: { id: session.user.tenantId },
            data: {
                ...(gmailEmail !== undefined && { gmailEmail }),
                ...(whatsappNumber !== undefined && { whatsappNumber }),
                ...(gmailSettings && { gmailSettings }),
                ...(whatsappSettings && { whatsappSettings }),
            }
        });

        return NextResponse.json({
            gmailEmail: (updated as any).gmailEmail || "",
            whatsappNumber: (updated as any).whatsappNumber || "",
            gmailSettings: (updated as any).gmailSettings || {},
            whatsappSettings: (updated as any).whatsappSettings || {}
        });
    } catch (error: any) {
        console.error("[Settings POST]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
