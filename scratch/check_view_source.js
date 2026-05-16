import { getPool } from '../db.js';

async function checkView() {
    try {
        const pool = await getPool();
        const result = await pool.request().query("EXEC sp_helptext 'CUS_SUP_TRN_DET'");
        console.log("View Source:");
        result.recordset.forEach(r => process.stdout.write(r.Text));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkView();
