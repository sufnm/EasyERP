const sql = require('mssql');
require('dotenv').config();

async function run() {
  try {
    const pool = await sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: { encrypt: false, trustServerCertificate: true }
    });
    
    const result = await pool.request().query("SELECT TOP 1 * FROM Inv_Image1 ORDER BY CUR_DATE DESC");
    console.log(result.recordset[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
  }
}

run();
