import { getPool } from '../db.js';

async function checkData() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT TOP 5 * FROM CUS_SUP_TRN_DET");
        console.log("Data:", JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
