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

async function checkSynonym() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT base_object_name FROM sys.synonyms WHERE name = 'ACCOUNTS'
    `);
    console.log("Synonym base for ACCOUNTS:", result.recordset);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkSynonym();
