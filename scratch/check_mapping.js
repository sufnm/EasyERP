import { getPool } from '../db.js';

async function checkMapping() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 5 
        W.REC_NO as WEB_REC_NO, 
        W.INVOICE_NO as WEB_INV, 
        D.TRAN_NO as MAIN_TRAN_NO, 
        D.invoice_no as MAIN_INV
      FROM dbo.DATA_ENTRY_WEB W
      LEFT JOIN dbo.DATA_ENTRY D ON W.REC_NO = D.TRAN_NO
      ORDER BY W.REC_NO DESC
    `);
    console.table(result.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkMapping();
