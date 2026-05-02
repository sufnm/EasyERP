import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = { 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  server: process.env.DB_SERVER || process.env.DB_HOST, 
  database: process.env.DB_NAME, 
  options: { encrypt: false, trustServerCertificate: true } 
};

async function checkTrg() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('trg_data_entry_web_ins_upd')
    `);
    console.log(result.recordset[0].definition);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkTrg();
