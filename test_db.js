const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { trustServerCertificate: true }
};

sql.connect(config).then(pool => {
  pool.query('SELECT TOP 1 * FROM dbo.BARCODE').then(res => {
    console.log("BARCODE table schema:", res.recordset[0]);
    pool.query('SELECT TOP 1 * FROM dbo.HD_ITEMMASTER').then(res2 => {
      console.log("ITEMMASTER table schema:", res2.recordset[0]);
      process.exit();
    });
  });
}).catch(console.error);
