import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agent_db";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🚀 Starting database update for Gemini 2.0 Flash...");
    
    // Update all active agents to use Gemini 2.0 Flash if they are currently on a google/gemini model
    const agents = await prisma.agent.updateMany({
        where: {
            OR: [
                { provider: 'google' },
                { model: { contains: 'gemini' } }
            ]
        },
        data: {
            provider: 'google',
            model: 'gemini-2.0-flash'
        }
    });

    console.log(`✅ Updated ${agents.count} agent(s) to Gemini 2.0 Flash.`);

    // Also ensure AIModel table has the entries
    const tenants = await prisma.tenant.findMany();
    for (const tenant of tenants) {
        await prisma.aIModel.upsert({
            where: { id: `gemini-2.0-flash-${tenant.id}`, tenantId: tenant.id },
            update: { status: 'ACTIVE' },
            create: {
                id: `gemini-2.0-flash-${tenant.id}`,
                tenantId: tenant.id,
                name: 'Gemini 2.0 Flash',
                provider: 'google',
                modelType: 'CHAT',
                status: 'ACTIVE'
            }
        });
        
        await prisma.aIModel.upsert({
            where: { id: `gemini-1.5-pro-${tenant.id}`, tenantId: tenant.id },
            update: { status: 'ACTIVE' },
            create: {
                id: `gemini-1.5-pro-${tenant.id}`,
                tenantId: tenant.id,
                name: 'Gemini 1.5 Pro',
                provider: 'google',
                modelType: 'CHAT',
                status: 'ACTIVE'
            }
        });
    }
    
    console.log("✨ Database migration complete.");
}

main()
    .catch((e) => {
        console.error("❌ Error during migration:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
