import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { WhatsappManager } from '@/lib/integrations/whatsapp';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let address = searchParams.get('address')?.trim();

    if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

    // Sanitize to digits only
    address = address.replace(/[^0-9]/g, "");

    try {
        const waSession = await WhatsappManager.getStatus(address);
        if (!waSession) return NextResponse.json({ status: 'NOT_FOUND' });

        let qrDataUrl = null;
        if (waSession.qr) {
            qrDataUrl = await QRCode.toDataURL(waSession.qr);
        }

        return NextResponse.json({
            status: waSession.status,
            qr: qrDataUrl,
            updatedAt: waSession.updatedAt
        });
    } catch (err: any) {
        console.error(`[WhatsApp API] Error: ${err.message}`);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { address } = await req.json();
        if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

        // Spin up the instance (it will update status in DB asynchronously)
        WhatsappManager.getOrCreate(address, session.user.tenantId);

        return NextResponse.json({ success: true, message: "Initialization started" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

    try {
        await WhatsappManager.deleteSession(address);
        return NextResponse.json({ success: true, message: "Session deleted" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
