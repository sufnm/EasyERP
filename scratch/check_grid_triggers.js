
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

async function checkGridTriggers() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT name FROM sysobjects WHERE type = 'TR' AND parent_obj = OBJECT_ID('dbo.DATA_ENTRY_GRID')
    `);
    console.log('Triggers on DATA_ENTRY_GRID:', result.recordset);
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

checkGridTriggers();
