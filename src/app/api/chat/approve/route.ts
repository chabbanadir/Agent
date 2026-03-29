import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { GmailService } from "@/lib/integrations/gmail";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { messageId } = await req.json();

        if (!messageId) {
            return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
        }

        // 1. Find the ghost message
        const ghostMessage = await prisma.message.findUnique({
            where: { id: messageId },
            include: { 
                channelAccount: true,
                parentMessage: true 
            }
        });

        if (!ghostMessage || !ghostMessage.isGhostReply || !ghostMessage.draftContent) {
            return NextResponse.json({ error: "Ghost message not found or not a valid draft" }, { status: 404 });
        }

        // 2. Perform the actual delivery
        const responseContent = ghostMessage.draftContent;
        let deliverySuccess = false;

        if (ghostMessage.channelAccount?.type === 'GMAIL') {
            const gmail = new GmailService(ghostMessage.tenantId);
            deliverySuccess = await gmail.sendEmail(
                ghostMessage.channelAccount,
                ghostMessage.parentMessage?.sender || ghostMessage.sender,
                `Re: ${ghostMessage.parentMessage?.content?.substring(0, 50) || 'Inquiry'}`,
                responseContent,
                ghostMessage.threadId || undefined
            );
        } else if (ghostMessage.channelAccount?.type === 'WHATSAPP') {
            try {
                const { WhatsappManager } = await import('@/lib/integrations/whatsapp');
                await WhatsappManager.sendMessage(
                    ghostMessage.channelAccount.address, 
                    ghostMessage.parentMessage?.sender || ghostMessage.sender, 
                    responseContent
                );
                deliverySuccess = true;
            } catch (err: any) {
                console.error("[Approve API] WhatsApp delivery failed:", err.message);
                deliverySuccess = false;
            }
        }

        if (!deliverySuccess) {
            return NextResponse.json({ error: "Failed to deliver message" }, { status: 500 });
        }

        // 3. Update the message state
        const updated = await prisma.message.update({
            where: { id: messageId },
            data: {
                content: responseContent,
                draftContent: null,
                isGhostReply: false,
                status: "COMPLETED"
            }
        });

        // 4. Also update the parent message status if it was stuck in PROCESSING
        if (ghostMessage.parentMessageId) {
            await prisma.message.update({
                where: { id: ghostMessage.parentMessageId },
                data: { status: "COMPLETED" }
            });
        }

        return NextResponse.json({ success: true, message: updated });

    } catch (error: any) {
        console.error("[Approve API] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
