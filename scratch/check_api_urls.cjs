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

    const result = await pool.request().query('SELECT TOP 1 API_URL_XML, API_URL_SUBMIT FROM dbo.AC_OPTIONS WHERE ID = 1');
    console.log('URLs in Database:', result.recordset[0]);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
