import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await prisma.channelAccount.findMany({
        where: { tenantId: session.user.tenantId },
        orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(accounts);
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        let { type, name, address, credentials, config } = body;

        if (!type || !address) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Sanitize WhatsApp address
        if (type === 'WHATSAPP') {
            address = address.replace(/[^0-9]/g, "");
        }

        let account = await prisma.channelAccount.findFirst({
            where: {
                tenantId: session.user.tenantId,
                type,
                address
            }
        });

        if (account) {
            account = await prisma.channelAccount.update({
                where: { id: account.id },
                data: {
                    name,
                    credentials: credentials || account.credentials,
                    config: config || account.config,
                    isActive: true
                }
            });
            console.log(`[Channels API] Reconnected existing account for ${address}`);
        } else {
            account = await prisma.channelAccount.create({
                data: {
                    tenantId: session.user.tenantId,
                    type,
                    name,
                    address,
                    credentials: credentials || {},
                    config: config || {},
                    isActive: true
                }
            });
            console.log(`[Channels API] Created new account for ${address}`);
        }

        return NextResponse.json(account);
    } catch (error: any) {
        console.error("[Channels API] Create error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        console.log(`[Channels API] DELETE invoked for ID: ${id} by user: ${session.user.id}`);

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const deleted = await prisma.channelAccount.delete({
            where: {
                id,
                tenantId: session.user.tenantId
            }
        });

        console.log(`[Channels API] Successfully deleted channel ID: ${id}`);

        // Trigger WhatsApp cleanup if necessary
        if (deleted.type === 'WHATSAPP') {
            try {
                const { WhatsappManager } = await import("@/lib/integrations/whatsapp");
                await WhatsappManager.initializeAllSessions();
            } catch (err: any) {
                console.error("[Channels API] WhatsApp cleanup failed:", err.message);
            }
        }

        return NextResponse.json({ success: true, deleted: deleted.id });
    } catch (error: any) {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        console.error(`[Channels API] DELETE failed for ID: ${id}:`, error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, isActive, name, config, action } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        if (action === 'refresh_watch') {
            const account = await prisma.channelAccount.findUnique({
                where: { id, tenantId: session.user.tenantId }
            });
            if (account?.type === 'GMAIL') {
                const { GmailService } = await import("@/lib/integrations/gmail");
                const gmail = new GmailService(account.tenantId);
                const success = await gmail.registerWatch(account);
                return NextResponse.json({ success, message: success ? "Watch refreshed" : "Failed to refresh watch" });
            }
            return NextResponse.json({ error: "Account not found or not GMAIL" }, { status: 404 });
        }

        const updated = await prisma.channelAccount.update({
            where: {
                id,
                tenantId: session.user.tenantId
            },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(name !== undefined && { name }),
                ...(config !== undefined && { config })
            }
        });

        // Trigger watch registration if activated
        if (isActive === true && updated.type === 'GMAIL') {
            try {
                const { GmailService } = await import("@/lib/integrations/gmail");
                const gmail = new GmailService(updated.tenantId);
                await gmail.registerWatch(updated);
            } catch (err: any) {
                console.error("[Channels API] Auto-watch registration failed:", err.message);
            }
        }

        // Trigger WhatsApp session refresh if necessary
        if (updated.type === 'WHATSAPP') {
            try {
                const { WhatsappManager } = await import("@/lib/integrations/whatsapp");
                await WhatsappManager.initializeAllSessions();
            } catch (err: any) {
                console.error("[Channels API] WhatsApp session refresh failed:", err.message);
            }
        }

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("[Channels API] PATCH error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
