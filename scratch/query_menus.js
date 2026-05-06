import { sql, getPool } from '../db.js';

const pool = await getPool();
const r = await pool.request().query("SELECT DISTINCT Head FROM dbo.MENU_MASTER WHERE Head IS NOT NULL AND Head <> '' AND Head <> '...' ORDER BY Head");
console.log(JSON.stringify(r.recordset));
process.exit();
