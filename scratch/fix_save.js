app.post('/api/receivable/save', async (req, res) => {
  const data = req.body;
  try {
    const pool = await getPool();
    const request = pool.request();

    // Procedure Parameters — verified against sys.parameters (SP_TRN_ENTRY_SAVE)
    request.input('ID', sql.Numeric(18, 0), data.ID || null);                   // 1  — NULL = INSERT
    request.input('ENTRY_DATE', sql.DateTime, new Date(data.ENTRY_DATE));   // 2
    request.input('DOC_NO', sql.VarChar(50), String(data.DOC_NO));         // 3
    request.input('DOC_TRN_TYPE', sql.Int, data.DOC_TRN_TYPE || 6);      // 4
    request.input('TRN_TYPE', sql.Int, 100);        // 5
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), data.PAY_FROM_ACC);           // 6
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), data.PAY_TO_ACC);             // 7
    request.input('TRN_NO', sql.Numeric(18, 0), null);                   // 8
    request.input('TRN_NO2', sql.Numeric(18, 0), null);                   // 9
    request.input('DESCRIPTION', sql.NVarChar(300), data.DESCRIPTION || '');      // 10
    request.input('PAY_AMOUNT', sql.Real, data.PAY_AMOUNT);             // 11
    request.input('CURRENCY_NO', sql.Int, data.CURRENCY || 1);       // 12
    request.input('CURRENCY_RATE', sql.Real, data.CURRENCY_RATE || 1);     // 13
    request.input('RETURN_INVOICE', sql.Bit, data.RETURN_INVOICE ? 1 : 0);      // 14
    request.input('USER_ID', sql.Int, data.USER_ID || 1);           // 15
    request.input('REF_NO', sql.VarChar(50), data.REF_NO || '');    // 16
    request.input('cost_center', sql.VarChar(50), data.COST_CENTER || ''); // 17
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);        // 18

    const result = await request.execute('dbo.SP_TRN_ENTRY_SAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID || result.recordset[0]?.ID;

    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save receivable entry:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});
