
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

async function inspectTriggers() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('Connected to DB');

    const result = await pool.request().query(`
      SELECT 
        sysobjects.name AS trigger_name, 
        OBJECT_NAME(parent_obj) AS table_name,
        OBJECT_DEFINITION(id) AS trigger_definition
      FROM sysobjects 
      WHERE type = 'TR' 
      AND OBJECT_NAME(parent_obj) IN ('DATA_ENTRY_WEB', 'GRID_ITEM')
    `);

    console.log('Triggers found:', result.recordset.length);
    result.recordset.forEach(tr => {
      console.log('---');
      console.log('Trigger:', tr.trigger_name, 'on Table:', tr.table_name);
      console.log('Definition Snippet:', tr.trigger_definition.substring(0, 500) + '...');
    });

    await pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

inspectTriggers();
