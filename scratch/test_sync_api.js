import { sql, getPool } from '../db.js';

async function testSync() {
  const payload = {
    menus: [
      { Head: 'Stock Master', Menu_Code: 'test-menu-item-code', Menu_type: 2, Menu_Name: 'Test Menu Item', Form_name: 'test-menu-item-code', FLAG: 'A', Head_Det: 1 }
    ]
  };

  const url = 'http://localhost:3001/api/user-privileges/sync';
  console.log(`📡 Sending test POST to ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`STATUS: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.log('RESPONSE:', data);

    // Clean up test insert from DB
    const pool = await getPool();
    await pool.request().query("DELETE FROM dbo.Menu_Master_Web WHERE Menu_Code = 'test-menu-item-code'");
    console.log('🗑️ Cleaned up test menu item from Menu_Master_Web');

    process.exit(0);
  } catch (err) {
    console.error('❌ Request failed:', err.message);
    process.exit(1);
  }
}

testSync();
