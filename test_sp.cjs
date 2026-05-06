const db = require('./db.js');
async function test() {
  const pool = await db.getPool();
  try {
    const r = await pool.request().query("exec sp_help 'TRN_ENTRY'");
    console.log(r.recordsets[1].map(c => c.Column_name).join(', '));
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
}
test();
