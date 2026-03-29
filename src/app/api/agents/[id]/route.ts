import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> } // Await the entire params object per Next.js 15+ patterns
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findFirst({
            where: { email: session.user.email },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const resolvedParams = await params;
        const agentId = resolvedParams.id;

        if (!agentId) {
            return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
        }

        // Verify the agent belongs to the tenant
        const existingAgent = await prisma.agent.findFirst({
            where: {
                id: agentId,
                tenantId: tenant.id,
            },
        });

        if (!existingAgent) {
            return NextResponse.json({ error: 'Agent not found or unauthorized' }, { status: 404 });
        }

        // Delete the agent
        await prisma.agent.delete({
            where: {
                id: agentId,
            },
        });

        return NextResponse.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error: any) {
        console.error('[Agent DELETE] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
