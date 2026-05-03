const sql = require('mssql');
const cfg = {
  user: 'sa', password: 'sa0101',
  server: 'cloudsrv.dyndns.org', database: 'Eazysoftdb',
  options: { encrypt: false, trustServerCertificate: true }
};

sql.connect(cfg).then(async p => {

  // First - show the EXACT SP parameters from DB
  console.log('=== EXACT SP Parameters from sys.parameters ===');
  const params = await p.request().query(`
    SELECT par.parameter_id, par.name, tp.name AS type, par.max_length, par.has_default_value, par.is_output
    FROM sys.parameters par
    JOIN sys.types tp ON par.user_type_id = tp.user_type_id
    WHERE par.object_id = OBJECT_ID('dbo.SP_TRN_ENTRY_SAVE')
    ORDER BY par.parameter_id
  `);
  console.table(params.recordset);

  // Second - get a real invoice to use for the test
  console.log('\n=== Sample invoice from DATA_ENTRY ===');
  const inv = await p.request().query(`SELECT TOP 1 INVOICE_NO, ACCODE, TRN_TYPE FROM DATA_ENTRY WHERE trn_type IN (6,7)`);
  console.table(inv.recordset);

  const invoice = inv.recordset[0];
  if (!invoice) { console.log('No invoice found!'); await p.close(); return; }

  // Third - test the actual call
  console.log('\n=== Testing SP call ===');
  try {
    const req = p.request();
    req.input('ID',             sql.Numeric(18,0), null);
    req.input('ENTRY_DATE',     sql.DateTime,      new Date());
    req.input('DOC_NO',         sql.VarChar(50),   String(invoice.INVOICE_NO));
    req.input('DOC_TRN_TYPE',   sql.Int,           invoice.TRN_TYPE);
    req.input('TRN_TYPE',       sql.Int,           100);
    req.input('PAY_FROM_ACC',   sql.Numeric(18,0), invoice.ACCODE);
    req.input('PAY_TO_ACC',     sql.Numeric(18,0), 1);
    req.input('TRN_NO',         sql.Numeric(18,0), null);
    req.input('TRN_NO2',        sql.Numeric(18,0), null);
    req.input('DESCRIPTION',    sql.NVarChar(150), 'Test');
    req.input('PAY_AMOUNT',     sql.Real,          100);
    req.input('CURRENCY_NO',    sql.Int,           1);
    req.input('CURRENCY_RATE',  sql.Real,          1);
    req.input('RETURN_INVOICE', sql.Bit,           0);
    req.input('USER_ID',        sql.Int,           2);
    const r = await req.execute('dbo.SP_TRN_ENTRY_SAVE');
    console.log('✅ SUCCESS! Result:', r.recordset);
  } catch(e) {
    console.error('❌ SP ERROR:', e.message);
  }

  await p.close();
}).catch(e => console.error('CONNECT ERROR:', e.message));
