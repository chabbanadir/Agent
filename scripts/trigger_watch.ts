import { GmailService } from "../src/lib/integrations/gmail";
import prisma from "../src/lib/prisma";

async function main() {
    const accounts = await prisma.channelAccount.findMany({
        where: { type: "GMAIL", isActive: true }
    });

    console.log(`Found ${accounts.length} active Gmail accounts.`);

    for (const account of accounts) {
        console.log(`Registering watch for ${account.address}...`);
        const gmailService = new GmailService(account.tenantId);
        const success = await gmailService.registerWatch(account);
        console.log(`Result for ${account.address}: ${success ? 'SUCCESS' : 'FAILED'}`);
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    });
