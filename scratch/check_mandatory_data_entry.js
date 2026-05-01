
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
            SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'DATA_ENTRY'
            AND IS_NULLABLE = 'NO'
        `);
        console.log('Mandatory columns in DATA_ENTRY:');
        console.table(result.recordset);
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}
check();
