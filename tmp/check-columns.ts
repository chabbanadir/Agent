import { Pool } from 'pg';

async function main() {
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agent_db";
    const pool = new Pool({ connectionString });

    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ChannelAccount';
        `);
        console.log("Columns in 'ChannelAccount' table:");
        res.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));
    } catch (err) {
        console.error("Failed to query columns:", err);
    } finally {
        await pool.end();
    }
}

main();
