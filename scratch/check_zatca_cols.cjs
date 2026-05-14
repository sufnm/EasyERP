const sql = require('mssql');
require('dotenv').config();

async function run() {
  try {
    const config = {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
    await sql.connect(config);
    
    console.log('--- ZATCA_CREDENTIAL TOP 1 ---');
    let res = await sql.query(`
      SELECT TOP 1 CSID, secret_csid, x509_certificate, Vat_number 
      FROM dbo.ZATCA_CREDENTIAL
    `);
    console.log(res.recordset);

  } catch (err) {
    console.error(err);
  } finally {
    await sql.close();
  }
}
run();
