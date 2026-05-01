
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
            SELECT name, OBJECT_DEFINITION(object_id) as definition
            FROM sys.triggers
            WHERE parent_id = OBJECT_ID('dbo.DATA_ENTRY_WEB')
        `);
        
        result.recordset.forEach(t => {
            console.log('Trigger:', t.name);
            console.log('Definition:', t.definition);
        });

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
