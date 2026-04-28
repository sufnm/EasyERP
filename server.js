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

// Test connection endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Endpoint to fetch sales data
app.get('/api/sales', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    // Adjusting query to TRN_MASTER for sales history
    const result = await pool.request().query('SELECT TOP 10 * FROM dbo.TRN_MASTER');
    res.json(result.recordset);
  } catch (error) {
    console.error("Database connection failed for /api/sales:", error.message);
    res.status(500).json({ error: 'Database connection error', details: error.message });
  }
});

// Endpoint to search items in dbo.BARCODE
app.get('/api/items/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('barcode', sql.VarChar, `${q}%`)
      .query(`
        SELECT TOP 10 
          B.BARCODE, 
          B.SALE_PRICE, 
          H.DESCRIPTION, 
          H.VAT_PERCENT 
        FROM dbo.BARCODE B 
        LEFT JOIN dbo.HD_ITEMMASTER H ON B.ITEM_CODE = H.ITEM_CODE 
        WHERE B.BARCODE LIKE @barcode
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error("Item search failed:", error);
    res.status(500).json({ error: 'Database search error', details: error.message });
  }
});

// Endpoint to search customers in dbo.ACCOUNTS
// --- CUSTOMER ENDPOINTS ---

// 1. Search customers
app.get('/api/customers/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 10 ACC_NO, ACC_NAME 
        FROM dbo.ACCOUNTS 
        WHERE ACC_TYPE_CODE = 2 
        AND (ACC_NO LIKE @query OR ACC_NAME LIKE @query)
      `);
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
    const pool = await sql.connect(dbConfig);
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
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT 
        B.BARCODE, 
        B.SALE_PRICE, 
        H.DESCRIPTION, 
        H.VAT_PERCENT 
      FROM dbo.BARCODE B 
      LEFT JOIN dbo.HD_ITEMMASTER H ON B.ITEM_CODE = H.ITEM_CODE
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch items cache:", error);
    res.status(500).json({ error: 'Failed to fetch items for cache' });
  }
});

// --- ACCOUNT ENDPOINTS ---

// Fetch specific accounts based on the provided logic
app.get('/api/accounts/list', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT acc_no, acc_name as Acc_name 
      FROM accounts 
      INNER JOIN ac_options ON accounts.LEVEL3_NO = ac_options.CASH_ac_type 
      AND ac_options.ID = 1 
      AND acc_level = 4 
      AND acc_no <> def_cash_ac
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch accounts list:", error.message);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/customers/cache', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME 
      FROM dbo.ACCOUNTS 
      WHERE ACC_TYPE_CODE = 2
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch customers cache:", error);
    res.status(500).json({ error: 'Failed to fetch customers for cache' });
  }
});

// Endpoint to save sale to TRN_MASTER and TRN_DETAIL
app.post('/api/sales/save', async (req, res) => {
  const { 
    INVOICE_NO, 
    ACCODE, 
    ENAME, 
    G_TOTAL, 
    DISC_AMT, 
    NET_AMOUNT, 
    VAT_AMOUNT, 
    VAT_NUMBER,
    ROWS // Expected array of items
  } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Insert into TRN_MASTER
      const masterRequest = new sql.Request(transaction);
      await masterRequest
        .input('invoiceNo', sql.VarChar, String(INVOICE_NO || ''))
        .input('accode', sql.VarChar, String(ACCODE || ''))
        .input('ename', sql.VarChar, String(ENAME || ''))
        .input('gTotal', sql.Decimal(18, 2), G_TOTAL || 0)
        .input('discAmt', sql.Decimal(18, 2), DISC_AMT || 0)
        .input('netAmount', sql.Decimal(18, 2), NET_AMOUNT || 0)
        .input('vatAmount', sql.Decimal(18, 2), VAT_AMOUNT || 0)
        .query(`
          INSERT INTO dbo.TRN_MASTER (
            INV_NO, 
            CUS_CODE, 
            CUS_NAME, 
            TOT_AMOUNT, 
            DISCOUNT, 
            NET_AMOUNT, 
            CUR_DATE,
            DATE_TIME
          ) VALUES (
            @invoiceNo, 
            @accode, 
            @ename, 
            @gTotal, 
            @discAmt, 
            @netAmount, 
            GETDATE(),
            GETDATE()
          )
        `);

      // 2. Insert into TRN_DETAIL
      if (ROWS && Array.isArray(ROWS)) {
        for (const row of ROWS) {
          if (!row.itemCode) continue;
          const detailRequest = new sql.Request(transaction);
          await detailRequest
            .input('invoiceNo', sql.VarChar, String(INVOICE_NO || ''))
            .input('barcode', sql.VarChar, String(row.itemCode || ''))
            .input('qty', sql.Decimal(18, 2), Number(row.qty) || 0)
            .input('price', sql.Decimal(18, 2), Number(row.unit) || 0)
            .input('description', sql.VarChar, String(row.description || ''))
            .input('total', sql.Decimal(18, 2), (Number(row.qty) * Number(row.unit)) || 0)
            .query(`
              INSERT INTO dbo.TRN_DETAIL (
                INVOICE_NO, 
                BARCODE, 
                QTY, 
                PRICE, 
                DESCRIPTION, 
                TOT_AMOUNT,
                DATE_TIME
              ) VALUES (
                @invoiceNo, 
                @barcode, 
                @qty, 
                @price, 
                @description, 
                @total,
                GETDATE()
              )
            `);
        }
      }

      await transaction.commit();
      res.json({ success: true, message: 'Sale saved to TRN_MASTER and TRN_DETAIL' });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("Failed to save sale:", error);
    res.status(500).json({ error: 'Failed to save sale', details: error.message });
  }
});

// Endpoint to get the next Invoice Number
app.get('/api/invoice/next', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(ISNULL(NULLIF(INV_NO, ''), '0') AS INT)), 0) + 1 as nextInvoice 
      FROM dbo.TRN_MASTER
      WHERE ISNUMERIC(INV_NO) = 1 OR INV_NO IS NULL OR INV_NO = ''
    `);
    res.json({ nextInvoice: result.recordset[0].nextInvoice });
  } catch (error) {
    console.error("Failed to fetch next invoice number:", error);
    res.status(500).json({ error: 'Failed to fetch next invoice number' });
  }
});

// Endpoint to verify recent entries in dbo.DATA_ENTRY
app.get('/api/sales/recent', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT TOP 5 
        INV_NO, 
        CUS_CODE, 
        CUS_NAME, 
        TOT_AMOUNT, 
        NET_AMOUNT, 
        CUR_DATE 
      FROM dbo.TRN_MASTER 
      ORDER BY CUR_DATE DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch recent sales:", error);
    res.status(500).json({ error: 'Failed to fetch recent sales' });
  }
});

// Debug endpoint to check Column Data Types
app.get('/api/debug/schema', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'DATA_ENTRY' AND COLUMN_NAME = 'INVOICE_NO'
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    const pool = await sql.connect(dbConfig);
    console.log('✅ Successfully connected to the Microsoft SQL Server database!');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error.message);
  }
});
