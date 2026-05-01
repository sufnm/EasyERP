
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

async function check() {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('trg_data_entry_web_ins_upd')) as TriggerCode
        `);
        console.log('Current Trigger Code:');
        console.log(result.recordset[0].TriggerCode);
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}
check();
