// Re-initializing Prisma Client for schema parity
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
    // In Prisma 7+, you *must* provide a database adapter.
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agent_db";
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool as any);
    return new PrismaClient({ adapter });
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
