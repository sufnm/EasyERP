import { getPool } from '../db.js';

async function checkIdentity() {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT COLUMN_NAME, COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IsIdentity FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DATA_ENTRY' AND COLUMN_NAME = 'TRAN_NO'");
    console.table(result.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkIdentity();
