import { getPool } from '../db.js';

async function checkInvoice() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TOP 5 TRAN_NO, invoice_no, CURDATE FROM dbo.DATA_ENTRY WHERE invoice_no IS NOT NULL ORDER BY TRAN_NO DESC");
    console.table(result.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkInvoice();
