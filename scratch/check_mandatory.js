
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
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'DATA_ENTRY_WEB' 
              AND IS_NULLABLE = 'NO' 
              AND COLUMN_DEFAULT IS NULL 
              AND COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 0
        `);
        
        console.log('Mandatory Columns in DATA_ENTRY_WEB:', result.recordset.map(r => r.COLUMN_NAME).join(', '));
        
        const result2 = await pool.request().query(`
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'GRID_ITEM' 
              AND IS_NULLABLE = 'NO' 
              AND COLUMN_DEFAULT IS NULL 
              AND COLUMNPROPERTY(OBJECT_ID(TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 0
        `);
        
        console.log('Mandatory Columns in GRID_ITEM:', result2.recordset.map(r => r.COLUMN_NAME).join(', '));

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
