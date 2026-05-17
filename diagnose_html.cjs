const nodemailer = require('nodemailer');
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'EasyERP123',
  server: process.env.DB_SERVER || 'cloudsrv.dyndns.org',
  database: process.env.DB_DATABASE || 'EASYERP_WEB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function main() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  console.log('Connecting to DB to fetch real invoice data...');
  const pool = await sql.connect(dbConfig);
  
  // Fetch real invoice header
  const headerRes = await pool.request()
    .query(`
      SELECT TOP 1
        D.INVOICE_NO, D.CURDATE, D.ENAME, D.ACCODE,
        D.G_TOTAL, D.DISC_AMT, D.VAT_AMOUNT, D.NET_AMOUNT,
        D.CASH_PAID, D.OTHER_PAID, D.TRN_TYPE,
        D.CRATE, D.VAT_NUMBER,
        ISNULL(CM.Currency_code, 'SAR') AS CURRENCY_CODE
      FROM dbo.DATA_ENTRY_WEB D
      LEFT JOIN dbo.CURRENCY_MASTER CM ON D.CURRENCY = CM.Currency_No
      ORDER BY D.CURDATE DESC
    `);
  
  if (headerRes.recordset.length === 0) {
    console.error('No invoice found in DB!');
    return;
  }
  const inv = headerRes.recordset[0];
  console.log('Fetched Invoice:', inv.INVOICE_NO, 'Customer:', inv.ENAME);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: { rejectUnauthorized: false },
    debug: true,
    logger: true
  });

  const htmlBody = `
<!DOCTYPE html>
<html>
<body>
  <h2>Invoice #${inv.INVOICE_NO} from EasyERP</h2>
  <p>Bill To: ${inv.ENAME || 'Cash Customer'}</p>
  <p>Net Amount: ${inv.CURRENCY_CODE} ${inv.NET_AMOUNT}</p>
</body>
</html>`;

  try {
    console.log('Sending real HTML invoice email...');
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'EasyERP'}" <${smtpUser}>`,
      to: 'muhdsufyanmujeeb@gmail.com',
      subject: `Invoice #${inv.INVOICE_NO} from EasyERP`,
      html: htmlBody
    });

    console.log('✅ HTML Send success!');
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ HTML send failed:', err);
  } finally {
    await sql.close();
  }
}

main();
