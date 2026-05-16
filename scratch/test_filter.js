import { getPool } from '../db.js';

async function testFilter() {
    try {
        const pool = await getPool();
        console.log("Testing ACC_TYPE = 1 (Customers)...");
        const res1 = await pool.request()
            .input('accType', 1)
            .query("SELECT COUNT(*) as count FROM CUS_SUP_TRN_DET WHERE ACC_TYPE = @accType");
        console.log("Count for 1:", res1.recordset[0].count);

        console.log("Testing ACC_TYPE = 2 (Suppliers)...");
        const res2 = await pool.request()
            .input('accType', 2)
            .query("SELECT COUNT(*) as count FROM CUS_SUP_TRN_DET WHERE ACC_TYPE = @accType");
        console.log("Count for 2:", res2.recordset[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

testFilter();
