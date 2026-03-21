const { Client } = require('pg');

async function main() {
    console.log("🌱 [Init] Checking for default tenant via pg...");

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();

        // Check if tenant exists
        const res = await client.query('SELECT id FROM "Tenant" WHERE id = $1', ['default-tenant']);

        if (res.rows.length === 0) {
            console.log("🌱 [Init] Creating default-tenant...");
            await client.query(
                `INSERT INTO "Tenant" (id, name, email, "isSyncEnabled", "updatedAt") 
                 VALUES ($1, $2, $3, $4, NOW())`,
                ['default-tenant', 'Default Business', 'default@agentclaw.com', true]
            );
            console.log("✅ [Init] Default tenant created.");
        } else {
            console.log("✅ [Init] Default tenant already exists.");
        }

        // Check if at least one agent exists
        const agentRes = await client.query('SELECT id FROM "Agent" WHERE "tenantId" = $1 LIMIT 1', ['default-tenant']);
        if (agentRes.rows.length === 0) {
            console.log("🌱 [Init] Creating default agent...");
            await client.query(
                `INSERT INTO "Agent" (id, "tenantId", name, description, provider, model, "isActive", "updatedAt") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [
                    'default-agent-' + Math.random().toString(36).substring(7),
                    'default-tenant',
                    'General Assistant',
                    'Handles general inquiries and support.',
                    'openai',
                    'gpt-4o',
                    true
                ]
            );
            console.log("✅ [Init] Default agent created.");
        }

    } catch (err) {
        console.error("❌ [Init] Database error:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
