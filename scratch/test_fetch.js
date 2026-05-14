process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  try {
    console.log('Testing connection to https://localhost:51215...');
    const res = await fetch('https://localhost:51215/api/Zatca/create_zatcaxml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log('Response Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text.substring(0, 100));
  } catch (err) {
    console.error('Fetch failed specifically due to:', err.cause ? err.cause.code : err.message, err);
  }
}

run();
