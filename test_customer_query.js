const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { trustServerCertificate: true }
};

async function test() {
  try {
    let pool = await sql.connect(config);
    console.log("Testing search for 'CASH'...");
    let result = await pool.request()
      .input('query', sql.VarChar, '%CASH%')
      .query(`
        SELECT ACC_NO, ACC_NAME
        FROM dbo.ACCOUNTS
        WHERE ACC_TYPE_CODE = 2 
        AND (ACC_NO LIKE @query OR ACC_NAME LIKE @query)
      `);
    console.log("Query Results:", result.recordset);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
