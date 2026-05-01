import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function getWarehouses() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT WR_CODE, WR_NAME 
      FROM dbo.WRHOUSE_MASTER
    `);
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

getWarehouses();
