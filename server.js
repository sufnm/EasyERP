import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MSSQL connection configuration
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

// MSSQL connection pool
let pool;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to MSSQL');
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }
}

// --- AUTH ENDPOINTS ---

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT UserName, MOBILE_NO
        FROM dbo.UserInfo
        WHERE UserName = @username AND Password = @password
      `);

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      console.log(`🔐 Login successful for user: ${username}`);
      res.json({ 
        success: true, 
        user: {
          username: user.UserName,
          mobile: user.MOBILE_NO
        }
      });
    } else {
      console.log(`🚫 Login failed for user: ${username}`);
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Test connection endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});


// Endpoint to search items in dbo.BARCODE
app.get('/api/items/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 20 
          B.BARCODE, 
          B.SALE_PRICE, 
          B.DESCRIPTION, 
          ISNULL(H.VAT_PERCENT, 0) as VAT_PERCENT 
        FROM dbo.BARCODE B
        LEFT JOIN dbo.HD_ITEMMASTER H ON B.ITEM_CODE = H.ITEM_CODE
        WHERE B.BARCODE LIKE @query OR B.DESCRIPTION LIKE @query
      `);

    console.log(`🔍 Item Search: Query "${q}" returned ${result.recordset.length} results`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Item search failed:", error);
    res.status(500).json({ error: 'Database search error', details: error.message });
  }
});

// Endpoint to search customers in dbo.ACCOUNTS
// --- CUSTOMER ENDPOINTS ---

// 1. Cache endpoint (Must be above :id to avoid conflict)
app.get('/api/customers/cache', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME 
      FROM dbo.ACCOUNTS 
      WHERE ACC_TYPE_CODE = 2
    `);
    console.log(`👤 Customer Cache: Loaded ${result.recordset.length} customers.`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch customers cache:", error);
    res.status(500).json({ error: 'Failed to fetch customers for cache' });
  }
});

// 2. Search customers
app.get('/api/customers/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 10 ACC_NO, ACC_NAME 
        FROM dbo.ACCOUNTS 
        WHERE ACC_TYPE_CODE = 2 AND (ACC_NO LIKE @query OR ACC_NAME LIKE @query)
      `);
    console.log(`👤 Customer Search: Query "${q}" returned ${result.recordset.length} results`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Customer search failed:", error.message);
    res.status(500).json({ error: 'Database search error' });
  }
});

// 2. Fetch single customer by ID (Numeric match)
app.get('/api/customers/:id', async (req, res) => {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT TOP 1 ACC_NO, ACC_NAME 
        FROM dbo.ACCOUNTS 
        WHERE ACC_NO = @id
      `);

    if (result.recordset && result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    console.error("DB Error in /api/customers/:id:", error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Cache endpoints for prefetching all data at once
app.get('/api/items/cache', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        B.BARCODE, 
        B.SALE_PRICE, 
        B.DESCRIPTION, 
        ISNULL(H.VAT_PERCENT, 0) as VAT_PERCENT 
      FROM dbo.BARCODE B
      LEFT JOIN dbo.HD_ITEMMASTER H ON B.ITEM_CODE = H.ITEM_CODE
    `);
    console.log(`📦 Cache: Loaded ${result.recordset.length} items from BARCODE`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch items cache:", error);
    res.status(500).json({ error: 'Failed to fetch items for cache' });
  }
});

app.get('/api/accounts/cache', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT acc_no as ACC_NO, acc_name as ACC_NAME 
      FROM dbo.ACCOUNTS 
      INNER JOIN dbo.AC_OPTIONS ON dbo.ACCOUNTS.LEVEL3_NO = dbo.AC_OPTIONS.CASH_ac_type 
      AND dbo.AC_OPTIONS.ID = 1 
      AND acc_level = 4 
      AND acc_no <> def_cash_ac
      ORDER BY acc_name
    `);
    console.log(`🏦 Accounts Cache: Loaded ${result.recordset.length} accounts.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/warehouses/list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT WR_CODE, WR_NAME 
      FROM dbo.WRHOUSE_MASTER
      ORDER BY WR_NAME
    `);
    console.log(`🏭 Warehouses: Loaded ${result.recordset.length} warehouses.`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch warehouses:", error);
    res.status(500).json({ error: 'Failed to fetch warehouses' });
  }
});

// Alias for list if needed by legacy parts
app.get('/api/accounts/list', (req, res) => res.redirect('/api/accounts/cache'));

// Get Extended Customer Info
app.get('/api/customers/:accNo/info', async (req, res) => {
  const { accNo } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('accNo', sql.VarChar, accNo)
      .query(`
        SELECT 
          street_name, 
          building_no, 
          city_name, 
          postal_zone, 
          city_subdivision_name as district
        FROM dbo.ACCOUNTS_INFO
        WHERE ACC_NO = @accNo
      `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error(`❌ Address Lookup Error for ${accNo}:`, error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Next Invoice Number
app.get('/api/invoice/next', async (req, res) => {
  try {
    const pool = await getPool();

    // Pull only from DATA_ENTRY as requested
    const deResult = await pool.request().query(`
      SELECT MAX(CAST(INVOICE_NO AS INT)) as maxInv 
      FROM dbo.DATA_ENTRY_WEB 
      WHERE 1=1 AND ISNUMERIC(INVOICE_NO) = 1
    `);

    const maxInv = deResult.recordset[0].maxInv || 0;
    const nextInvoice = maxInv + 1;

    res.json({ nextInvoice: String(nextInvoice) });
  } catch (error) {
    console.error("Failed to fetch next invoice:", error.message);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/sales/save', async (req, res) => {
  const {
    INVOICE_NO, ACCODE, ENAME, G_TOTAL, DISC_AMT,
    NET_AMOUNT, VAT_AMOUNT, VAT_NUMBER, ROWS, PAYMENT_METHOD,
    TAX_INCLUDED = true,
    CASH_PAID = 0,
    OTHER_PAID = 0,
    USERNAME,
    WR_CODE = 1
  } = req.body;

  // Final Validation for Invoice Number
  if (!INVOICE_NO || isNaN(parseInt(INVOICE_NO))) {
    return res.status(400).json({ error: 'Invalid Invoice Number', details: 'Invoice number must be numeric.' });
  }

  const trnType = PAYMENT_METHOD === 'Cash' ? 6 : 7;

  try {
    console.log(`💾 Starting sale save for Invoice #${INVOICE_NO}...`);
    const pool = await getPool();

    // Determine Cash Account
    let cashAcc = null;
    if (USERNAME) {
      const userRes = await pool.request()
        .input('uname', sql.VarChar, USERNAME)
        .query('SELECT SALE_CASH_AC FROM dbo.UserInfo WHERE UserName = @uname');
      cashAcc = userRes.recordset[0]?.SALE_CASH_AC;
    }

    if (!cashAcc) {
      const optRes = await pool.request()
        .query('SELECT DEF_CASH_AC FROM dbo.AC_OPTIONS WHERE ID = 1');
      cashAcc = optRes.recordset[0]?.DEF_CASH_AC;
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Header Insertion
      const headerRequest = new sql.Request(transaction);
      const headerResult = await headerRequest
        .input('invoiceNo', sql.VarChar, String(INVOICE_NO))
        .input('accode', sql.VarChar, String(ACCODE || '011'))
        .input('ename', sql.VarChar, String(ENAME || ''))
        .input('gTotal', sql.Decimal(18, 2), G_TOTAL || 0)
        .input('discAmt', sql.Decimal(18, 2), DISC_AMT || 0)
        .input('netAmount', sql.Decimal(18, 2), NET_AMOUNT || 0)
        .input('vatAmount', sql.Decimal(18, 2), VAT_AMOUNT || 0)
        .input('cashPaid', sql.Decimal(18, 2), CASH_PAID || 0)
        .input('otherPaid', sql.Decimal(18, 2), OTHER_PAID || 0)
        .input('cashAcc', sql.VarChar, String(cashAcc || ''))
        .input('brnCode', sql.Int, 1)
        .input('trnType', sql.Int, trnType)
        .input('orgDup', sql.Int, 1)
        .input('wrCode', sql.SmallInt, Number(WR_CODE))
        .query(`
            INSERT INTO dbo.DATA_ENTRY_WEB (
              INVOICE_NO, ACCODE, ENAME, G_TOTAL, DISC_AMT, NET_AMOUNT, VAT_AMOUNT,
              CASH_PAID, OTHER_PAID, CASH_ACC,
              BRN_CODE, TRN_TYPE, ORG_DUP, WR_CODE, CURDATE
            )
            VALUES (
              @invoiceNo, @accode, @ename, @gTotal, @discAmt, @netAmount, @vatAmount,
              @cashPaid, @otherPaid, @cashAcc,
              @brnCode, @trnType, @orgDup, @wrCode, GETDATE()
            );
            SELECT SCOPE_IDENTITY() AS REC_NO;
          `);

      if (!headerResult.recordset || headerResult.recordset.length === 0 || !headerResult.recordset[0].REC_NO) {
        throw new Error('Database failed to return a valid Record Number (REC_NO) after header insertion.');
      }

      const REC_NO = headerResult.recordset[0].REC_NO;
      console.log(`✅ Header saved. REC_NO: ${REC_NO}`);

      // 2. Items Insertion
      if (ROWS && Array.isArray(ROWS)) {
        let rowNum = 1;
        for (const row of ROWS) {
          if (!row.itemCode) continue;

          const detailRequest = new sql.Request(transaction);
          const unitPrice = Number(row.unit) || Number(row.price) || 0;
          const qty = Number(row.qty) || 0;
          const vatPercent = Number(row.vatPercent) || 0;

          let grossTotal, vatAmount;

          if (TAX_INCLUDED) {
            grossTotal = qty * unitPrice;
            vatAmount = grossTotal - (grossTotal / (1 + (vatPercent / 100)));
          } else {
            const netSubtotal = qty * unitPrice;
            vatAmount = netSubtotal * (vatPercent / 100);
            grossTotal = netSubtotal + vatAmount;
          }

          await detailRequest
            .input('recNo', sql.Numeric(18, 0), REC_NO)
            .input('rowNum', sql.Int, rowNum++)
            .input('barcode', sql.VarChar, String(row.itemCode || ''))
            .input('qty', sql.Decimal(18, 2), qty)
            .input('price', sql.Decimal(18, 2), unitPrice)
            .input('unit', sql.VarChar, String(row.unit_name || 'Pcs'))
            .input('description', sql.VarChar, String(row.description || ''))
            .input('total', sql.Decimal(18, 2), grossTotal)
            .input('vatPercent', sql.Decimal(18, 2), vatPercent)
            .input('vatAmount', sql.Decimal(18, 2), vatAmount)
            .input('trnType', sql.Int, trnType)
            .input('invoiceNo', sql.VarChar, String(INVOICE_NO))
            .input('wrCode', sql.SmallInt, Number(WR_CODE))
            .query(`
                INSERT INTO dbo.GRID_ITEM (
                  REC_NO, ROWNUM, BARCODE, QTY, price, UNIT, DESCRIPTION,
                  TOTAL, vat_percent, VAT_AMOUNT, TRN_TYPE, INVOICE_NO, WR_CODE
                )
                VALUES (
                  @recNo, @rowNum, @barcode, @qty, @price, @unit, @description,
                  @total, @vatPercent, @vatAmount, @trnType, @invoiceNo, @wrCode
                )
              `);
        }
      }

      await transaction.commit();
      console.log(`🎉 Sale saved successfully: Invoice #${INVOICE_NO}`);
      res.json({ success: true, message: 'Sale saved successfully', REC_NO });

    } catch (err) {
      console.error("❌ SQL Transaction Error:", err.message);
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackErr) {
          console.error("❌ Rollback failed:", rollbackErr.message);
        }
      }
      throw err;
    }

  } catch (error) {
    console.error("💥 Final Save Failure:", error);
    res.status(500).json({
      error: 'Database transaction failed',
      message: error.message,
      details: error.originalError ? error.originalError.message : error.message
    });
  }
});

// Endpoint to verify recent entries in dbo.DATA_ENTRY_WEB
app.get('/api/sales/:recNo/items', async (req, res) => {
  const { recNo } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('recNo', sql.Numeric(18, 0), recNo)
      .query(`
        SELECT 
          BARCODE, 
          DESCRIPTION, 
          UNIT,
          QTY, 
          price as UNIT_PRICE, 
          vat_percent as VAT_PERCENT,
          VAT_AMOUNT,
          TOTAL as ITM_TOTAL
        FROM dbo.GRID_ITEM 
        WHERE REC_NO = @recNo 
        ORDER BY ROWNUM
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch sale items:", error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    console.log('📡 Fetching sales history...');
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        REC_NO,
        INVOICE_NO, 
        ACCODE, 
        ENAME, 
        G_TOTAL, 
        NET_AMOUNT, 
        VAT_AMOUNT,
        DISC_AMT,
        TRN_TYPE,
        CURDATE 
      FROM dbo.DATA_ENTRY_WEB 
      ORDER BY CURDATE DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch recent sales:", error);
    res.status(500).json({ error: 'Failed to fetch recent sales' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Global Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await getPool();
    console.log('✅ Successfully connected to the Microsoft SQL Server database!');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error.message);
  }
});
