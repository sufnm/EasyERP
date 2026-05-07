const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'sa0101',
  server: 'cloudsrv.dyndns.org',
  database: 'Eazysoftdb',
  options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
  const pool = await sql.connect(config);

  console.log('\n=== STEP 1: UserInfo for MUJEEB ===');
  const u = await pool.request()
    .input('un', sql.VarChar, 'MUJEEB')
    .query('SELECT UserName, USERID, GROUP_NAME FROM dbo.UserInfo WHERE UserName = @un');
  console.table(u.recordset);

  if (u.recordset.length === 0) {
    console.log('❌ User MUJEEB NOT FOUND in UserInfo!');
    await pool.close();
    return;
  }

  const groupName = u.recordset[0].GROUP_NAME;
  console.log('✅ GROUP_NAME:', groupName);

  console.log('\n=== STEP 2: screen_name for trn_code=100 ===');
  const t = await pool.request()
    .query('SELECT trn_code, screen_name FROM dbo.trn_type WHERE trn_code = 100');
  console.table(t.recordset);

  if (t.recordset.length === 0) {
    console.log('❌ No trn_type row found for trn_code=100!');
    await pool.close();
    return;
  }

  const screenName = t.recordset[0].screen_name;
  console.log('✅ screen_name:', screenName);

  console.log('\n=== STEP 3: UserPriv_Web row for group + screen ===');
  const p = await pool.request()
    .input('mn', sql.VarChar, screenName)
    .input('gn', sql.VarChar, groupName)
    .query('SELECT GROUP_NAME, form_id, ins AS [INSERT], upd AS [UPDATE], del AS [DELETE], dsp AS [VIEW], Menu_Name FROM dbo.UserPriv_Web WHERE Menu_Name = @mn AND group_name = @gn');
  console.table(p.recordset);

  if (p.recordset.length === 0) {
    console.log('⚠️  NO PRIVILEGE ROW found for group_name="' + groupName + '" + Menu_Name="' + screenName + '"');

    console.log('\n=== ALL UserPriv_Web rows for group "' + groupName + '" ===');
    const all = await pool.request()
      .input('gn', sql.VarChar, groupName)
      .query('SELECT GROUP_NAME, Menu_Name, ins AS [INSERT], upd AS [UPDATE], del AS [DELETE], dsp AS [VIEW] FROM dbo.UserPriv_Web WHERE group_name = @gn ORDER BY Menu_Name');
    console.table(all.recordset);
  } else {
    const r = p.recordset[0];
    console.log('\n=== RESULT ===');
    console.log('VIEW   (dsp):', r.VIEW   ? '✅ YES' : '❌ NO');
    console.log('INSERT (ins):', r.INSERT ? '✅ YES' : '❌ NO');
    console.log('UPDATE (upd):', r.UPDATE ? '✅ YES' : '❌ NO');
    console.log('DELETE (del):', r.DELETE ? '✅ YES' : '❌ NO');
  }

  await pool.close();
}

run().catch(e => console.error('ERROR:', e.message));
