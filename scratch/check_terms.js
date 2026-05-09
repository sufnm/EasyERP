import { getPool } from '../db.js';

async function checkIdentity() {
  try {
    const pool = await getPool();
    const res = await pool.request().query(`
      SELECT COLUMNPROPERTY(OBJECT_ID('dbo.QUOT_TERM_DET'), 'ID', 'IsIdentity') AS IsIdentity
    `);
    console.log('📌 Is QUOT_TERM_DET ID an Identity Column?:', res.recordset[0].IsIdentity === 1 ? 'YES' : 'NO');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking identity:', err);
    process.exit(1);
  }
}

checkIdentity();
