const sql = require('mssql');
require('dotenv').config();

async function run() {
  try {
    const pool = await sql.connect({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      server: process.env.DB_SERVER,
      database: process.env.DB_NAME,
      options: { encrypt: false, trustServerCertificate: true }
    });

    console.log('Testing credit query exactly as user suggested...');
    try {
      const q2 = await pool.request()
        .input('customerAcc', sql.NVarChar(50), '111')
        .query(`
          SELECT 
            b.ACC_NO as acc_no, 
            b.ACC_NAME as acc_name, 
            b.ACC_ANAME as acc_aname,  
            isnull(street_name,'') as street_name,
            '' as street_aname,  
            isnull(city_name,'') as city_name, 
            isnull(city_aname,'') as city_aname,
            isnull(city_subdivision_name,'') as city_subdivision_name,
            '' as  city_subdivision_aname, 
            isnull(building_no,'')  as cus_building_no, 
            isnull(postal_zone,'') as postal_zone,
            '' as regsitered_name 
          FROM ACCOUNTS_INFO as b 
          WHERE b.acc_no = @customerAcc
        `);
      console.log('Credit query successful');
    } catch (e) { console.error('Credit query error:', e.message); }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
