import sql from 'mssql';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Eazy@123',
  database: process.env.DB_NAME || 'EazySoftDB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT OBJECT_DEFINITION(object_id) as TriggerDefinition
      FROM sys.triggers
      WHERE parent_id = OBJECT_ID('dbo.DATA_ENTRY_WEB')
    `);
    
    let output = '';
    if (result.recordset.length > 0) {
      result.recordset.forEach((t, i) => {
        output += '--- Trigger ' + (i+1) + ' ---\n';
        output += t.TriggerDefinition + '\n';
      });
    } else {
      output = 'No triggers found on dbo.DATA_ENTRY_WEB';
    }
    fs.writeFileSync('trigger_output.txt', output, 'utf8');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
