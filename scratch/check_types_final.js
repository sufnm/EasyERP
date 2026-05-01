
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

async function test() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected');
        
        const res1 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DATA_ENTRY_WEB' AND COLUMN_NAME = 'WR_CODE'
        `);
        console.log('DATA_ENTRY_WEB WR_CODE Type:', res1.recordset[0]?.DATA_TYPE);

        const res2 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DATA_ENTRY' AND COLUMN_NAME = 'WR_CODE'
        `);
        console.log('DATA_ENTRY WR_CODE Type:', res2.recordset[0]?.DATA_TYPE);

        const res3 = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DATA_ENTRY' AND COLUMN_NAME = 'invoice_no'
        `);
        console.log('DATA_ENTRY invoice_no Type:', res3.recordset[0]?.DATA_TYPE);

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
