import { getPool } from '../db.js';

async function checkData() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT DISTINCT ACC_NO, ACC_NAME, ACC_TYPE FROM CUS_SUP_TRN_DET");
        console.log("Data in View:", JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
