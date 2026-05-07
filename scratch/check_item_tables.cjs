const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'sa0101',
  server: process.env.DB_SERVER || 'cloudsrv.dyndns.org',
  database: process.env.DB_NAME || 'Eazysoftdb',
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

async function run() {
  try {
    await sql.connect(config);
    const tables = [
      'HD_ITEMMASTER',
      'ITEM_CAT',
      'UnitMaster',
      'ITEM_TYPE',
      'BARCODE',
      'WR_STOCK_MASTER',
      'WRHOUSE_MASTER',
      'STOCK_ITEM',
      'STOCK_MASTER',
      'Item_Image'
    ];

    for (const table of tables) {
      try {
        const res = await sql.query(`SELECT TOP 1 * FROM dbo.${table}`);
        console.log(`✅ Table [dbo.${table}] exists. Column count: ${Object.keys(res.recordset[0] || {}).length}`);
      } catch (e) {
        console.log(`❌ Table [dbo.${table}] error: ${e.message}`);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await sql.close();
  }
}

run();
