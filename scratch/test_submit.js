process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function run() {
  try {
    const res = await fetch('http://localhost:3001/api/zatca/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceNo: '1',
        trnType: 7
      })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
