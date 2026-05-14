import { getPool } from './db.js';
try {
  const pool = await getPool();
  const result = await pool.request().query('SELECT TOP 5 INVOICE_NO, NET_AMOUNT, CRATE, CURRENCY FROM dbo.DATA_ENTRY_WEB ORDER BY REC_NO DESC');
  console.log('SALES:', JSON.stringify(result.recordset, null, 2));
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
