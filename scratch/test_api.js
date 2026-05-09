import http from 'http';

http.get('http://localhost:3001/api/quotations/terms', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('STATUS CODE:', res.statusCode);
    console.log('HEADERS:', res.headers);
    console.log('BODY:', data);
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('ERROR FETCHING:', err.message);
  process.exit(1);
});
