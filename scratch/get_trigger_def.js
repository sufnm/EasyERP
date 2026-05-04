
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

async function getTriggerFullDef() {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.trg_grid_item_ins_upd')) AS def
    `);
    console.log(result.recordset[0].def);
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

getTriggerFullDef();
