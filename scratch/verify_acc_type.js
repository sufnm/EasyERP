import { getPool } from '../db.js';

async function verifyMapping() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 10 ACC_NO, ACC_NAME, ACC_TYPE FROM ACCOUNTS_INFO WHERE ACC_TYPE IN (1, 2)");
        console.log("Mapping:", JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyMapping();
