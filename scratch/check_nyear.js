
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
        
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DATA_ENTRY_WEB' AND COLUMN_NAME = 'NYEAR'
        `);
        
        console.log('NYEAR Default:', result.recordset[0]?.COLUMN_DEFAULT);
        
        const result2 = await pool.request().query(`
            SELECT TOP 1 NYEAR FROM dbo.DATA_ENTRY_WEB ORDER BY REC_NO DESC
        `);
        console.log('Last NYEAR in DATA_ENTRY_WEB:', result2.recordset[0]?.NYEAR);

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
