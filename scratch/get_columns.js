import sql from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Eazy@123',
  database: process.env.DB_NAME || 'EazySoftDB',
  options: { encrypt: false, trustServerCertificate: true }
};

async function getColumns() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DATA_ENTRY_GRID'
      ORDER BY ORDINAL_POSITION
    `);
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

getColumns();
