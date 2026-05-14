import { getPool } from '../db.js';
import fs from 'fs';

async function checkMainTriggers() {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        t.name AS TriggerName,
        m.definition AS TriggerDefinition
      FROM sys.triggers t
      JOIN sys.sql_modules m ON t.object_id = m.object_id
      WHERE t.parent_id = OBJECT_ID('dbo.DATA_ENTRY')
    `);
    
    let output = '';
    if (result.recordset.length > 0) {
      result.recordset.forEach((t, i) => {
        output += '--- Trigger: ' + t.TriggerName + ' ---\n';
        output += t.TriggerDefinition + '\n\n';
      });
    } else {
      output = 'No triggers found on dbo.DATA_ENTRY';
    }
    fs.writeFileSync('main_trigger_output.txt', output, 'utf8');
    console.log('✅ Trigger info saved to main_trigger_output.txt');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkMainTriggers();
