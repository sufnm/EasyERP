
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
            SELECT invoice_no, TRN_TYPE, ORG_DUP, BRN_CODE, NYEAR
            FROM dbo.DATA_ENTRY
            WHERE invoice_no = '10' AND TRN_TYPE = 6 AND ORG_DUP = 'ORG' AND BRN_CODE = 1 AND NYEAR = 2026
        `);
        
        console.log('Existing Record:', result.recordset);
        
        const result2 = await pool.request().query(`
            SELECT MAX(CAST(invoice_no AS INT)) as maxInv
            FROM dbo.DATA_ENTRY
            WHERE TRN_TYPE IN (6, 7) AND ISNUMERIC(invoice_no) = 1
        `);
        console.log('Actual Max Numeric Invoice No for type 6,7:', result2.recordset[0].maxInv);

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
