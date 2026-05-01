
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
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = 'DATA_ENTRY' AND CONSTRAINT_NAME = 'aaaaaDATA_ENTRY_PK'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('PK Columns:', result.recordset.map(r => r.COLUMN_NAME).join(', '));
        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
