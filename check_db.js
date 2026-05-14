import { getPool } from './db.js';
try {
  const pool = await getPool();
  const result = await pool.request().query('SELECT TOP 1 * FROM dbo.DATA_ENTRY_WEB');
  console.log('COLUMNS:', Object.keys(result.recordset[0]));
  process.exit(0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
