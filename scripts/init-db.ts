import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 [Init] Checking for default tenant...");

    const defaultTenant = await prisma.tenant.upsert({
        where: { id: "default-tenant" },
        update: {},
        create: {
            id: "default-tenant",
            name: "Default Business",
            email: "default@agentclaw.com",
            isSyncEnabled: false
        }
    });

    console.log(`✅ [Init] Default tenant ready: ${defaultTenant.id}`);

    // Also ensure at least one agent exists if needed
    const agentCount = await prisma.agent.count({ where: { tenantId: "default-tenant" } });
    if (agentCount === 0) {
        await prisma.agent.create({
            data: {
                tenantId: "default-tenant",
                name: "General Assistant",
                description: "Handles general inquiries and support.",
                provider: "openai",
                model: "gpt-4o",
                isActive: false
            }
        });
        console.log("✅ [Init] Created default General Assistant agent.");
    }
}

main()
    .catch((e) => {
        console.error("❌ [Init] Failed to initialize DB:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
