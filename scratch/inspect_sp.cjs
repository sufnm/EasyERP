// Inspect the actual stored procedure definition and the GRID_ITEM table structure
const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Sana1994',
  server: 'localhost',
  database: 'EazySoftDB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function inspect() {
  const pool = await sql.connect(config);
  
  // 1. Check actual stored procedure definition
  console.log('=== Stored Procedure Definition ===');
  try {
    const spRes = await pool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.usp_InsertUpdate_GridItem')) AS sp_text
    `);
    console.log(spRes.recordset[0]?.sp_text || 'SP NOT FOUND');
  } catch(e) {
    console.log('SP query error:', e.message);
  }
  
  // 2. Check GRID_ITEM table structure
  console.log('\n=== GRID_ITEM Table Columns ===');
  try {
    const colsRes = await pool.request().query(`
      SELECT c.name, t.name AS type, c.max_length, c.is_nullable, c.is_identity
      FROM sys.columns c 
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('dbo.GRID_ITEM')
      ORDER BY c.column_id
    `);
    console.table(colsRes.recordset);
  } catch(e) {
    console.log('GRID_ITEM query error:', e.message);
  }
  
  // 3. Check DATA_ENTRY_GRID table structure  
  console.log('\n=== DATA_ENTRY_GRID Table Columns ===');
  try {
    const colsRes = await pool.request().query(`
      SELECT c.name, t.name AS type, c.max_length, c.is_nullable, c.is_identity
      FROM sys.columns c 
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('dbo.DATA_ENTRY_GRID')
      ORDER BY c.column_id
    `);
    console.table(colsRes.recordset);
  } catch(e) {
    console.log('DATA_ENTRY_GRID query error:', e.message);
  }

  await pool.close();
}

inspect().catch(console.error);
