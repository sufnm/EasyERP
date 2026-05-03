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
    trustServerCertificate: true,
    connectionTimeout: 15000, // 15 seconds
    requestTimeout: 30000     // 30 seconds
  }
};

console.log(`📡 Attempting to connect to database on server: ${dbConfig.server}`);

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

    // Step 1: Authenticate (no dynamic columns — always safe)
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT UserName, MOBILE_NO, USERID, GROUP_NAME,SUPERUSER
        FROM dbo.UserInfo
        WHERE UserName = @username AND Password = @password
      `);

    if (result.recordset.length === 0) {
      console.log(`🚫 Login failed for user: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.recordset[0];

    // Step 2: Try to read superuser column — safe even if column doesn't exist yet
    let isSuperUser = false;
    try {
      const superRes = await pool.request()
        .input('username', sql.VarChar, username)
        .query(`SELECT TOP 1 superuser FROM dbo.UserInfo WHERE UserName = @username`);
      const val = superRes.recordset[0]?.superuser;
      isSuperUser = val === true || val === 1;
    } catch {
      // superuser column doesn't exist yet — treat as false
      isSuperUser = false;
    }

    console.log(`🔐 Login successful for user: ${username} | superuser: ${isSuperUser}`);
    res.json({
      success: true,
      user: {
        username: user.UserName,
        mobile: user.MOBILE_NO,
        userid: user.USERID,
        group_name: user.GROUP_NAME,
        is_super_user: isSuperUser
      }
    });

  } catch (error) {
    console.error("Login failed:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// --- PRIVILEGES ENDPOINTS ---

// GET /api/privileges/:trnCode?username=xxx
// Returns ins/upd/del/dsp flags for the user's group and the screen linked to the trn_code
app.get('/api/privileges/:trnCode', async (req, res) => {
  const { trnCode } = req.params;
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username query param is required' });
  }

  try {
    const pool = await getPool();

    // --- SUPER USER BYPASS (safe — column may not exist yet) ---
    let isSuperUser = false;
    try {
      const superCheck = await pool.request()
        .input('username', sql.VarChar, username)
        .query(`SELECT TOP 1 superuser FROM dbo.UserInfo WHERE UserName = @username`);
      const val = superCheck.recordset[0]?.superuser;
      isSuperUser = val === true || val === 1;
    } catch {
      isSuperUser = false; // column doesn't exist — treat as not super user
    }

    if (isSuperUser) {
      console.log(`⚡ Super user "${username}" — bypassing privilege check, granting full access.`);
      return res.json({
        canInsert: true,
        canUpdate: true,
        canDelete: true,
        canView: true,
        isSuperUser: true
      });
    }

    // --- NORMAL PRIVILEGE LOOKUP ---
    const result = await pool.request()
      .input('trnCode', sql.Int, parseInt(trnCode))
      .input('username', sql.VarChar, username)
      .query(`
        SELECT 
          P.[GROUP_NAME],
          P.[form_id],
          P.[ins]  AS [INSERT],
          P.[upd]  AS [UPDATE],
          P.[del]  AS [DELETE],
          P.[dsp]  AS [VIEW],
          P.[Menu_Name]
        FROM [dbo].[UserPriv] P
        WHERE P.Menu_Name = (
            SELECT TOP 1 screen_name FROM dbo.trn_type WHERE trn_code = @trnCode
          )
          AND P.group_name = (
            SELECT TOP 1 GROUP_NAME FROM dbo.UserInfo WHERE UserName = @username
          )
      `);

    if (result.recordset.length > 0) {
      const priv = result.recordset[0];
      console.log(`🔑 Privileges for user "${username}" on trn_code ${trnCode}:`, priv);
      res.json({
        canInsert: priv.INSERT === true || priv.INSERT === 1,
        canUpdate: priv.UPDATE === true || priv.UPDATE === 1,
        canDelete: priv.DELETE === true || priv.DELETE === 1,
        canView: priv.VIEW === true || priv.VIEW === 1,
        isSuperUser: false,
        menuName: priv.Menu_Name,
        groupName: priv.GROUP_NAME
      });
    } else {
      // No privilege row found → deny all by default
      console.warn(`⚠️ No privilege record found for user "${username}" on trn_code ${trnCode}`);
      res.json({ canInsert: false, canUpdate: false, canDelete: false, canView: false, isSuperUser: false });
    }
  } catch (error) {
    console.error('❌ Privilege fetch failed:', error.message);
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

// --- CUSTOMER ENDPOINTS ---

// 1. List Customers from ACCOUNTS_INFO
app.get('/api/customers/list', async (req, res) => {
  console.log('📡 CUSTOMER LIST REQUEST RECEIVED');
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ACC_NO, 
       ACC_NAME, 
         ACC_ANAME,
        ACC_TYPE,
        OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT
      FROM dbo.ACCOUNTS_INFO AI
     
      WHERE ACC_TYPE = 1
      ORDER BY ACC_NO
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ SQL ERROR IN CUSTOMER LIST:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// 2. Cache endpoint
app.get('/api/customers/cache', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
   
      SELECT ACC_NO, ACC_NAME FROM dbo.ACCOUNTS_INFO WHERE ACC_TYPE = 1
    `);
    console.log(`👤 Customer Cache: Loaded ${result.recordset.length} customers.`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch customers cache:", error);
    res.status(500).json({ error: 'Failed to fetch customers for cache' });
  }
});

// 3. Search customers
app.get('/api/customers/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 20 ACC_NO, ACC_NAME FROM (
       
          SELECT ACC_NO, ACC_NAME FROM dbo.ACCOUNTS_INFO WHERE ACC_TYPE = 1
        ) AS Customers
        WHERE (ACC_NO LIKE @query OR ACC_NAME LIKE @query)
      `);
    console.log(`👤 Customer Search: Query "${q}" returned ${result.recordset.length} results`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Customer search failed:", error.message);
    res.status(500).json({ error: 'Database search error' });
  }
});

// --- RECEIVABLE ENDPOINTS ---

app.get('/api/receivable/invoices', async (req, res) => {
  try {
    const pool = await getPool();
    const isReturn = req.query.returnInvoice === 'true';
    const trnTypes = isReturn ? '3,4' : '6,7';
    const result = await pool.request().query(`
      SELECT CURDATE, ENAME, ACCODE, INVOICE_NO, NET_AMOUNT, CASH_PAID, OTHER_PAID, BALANCE_AMT, TRN_TYPE, CURRENCY
      FROM DATA_ENTRY 
      WHERE trn_type IN (${trnTypes}) AND net_amount - (CASH_PAID + OTHER_PAID) > 0;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch receivable invoices:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/receivable/currencies', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT [Currency_No], [Currency_code], [Currency_Name], [Currency_Rate]
      FROM [dbo].[CURRENCY_MASTER]
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch currencies:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/currencies/list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT [Currency_No], [Currency_code], [Currency_Name], [Currency_Rate]
      FROM [dbo].[CURRENCY_MASTER]
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch currencies:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/receivable/cash-accounts', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME 
      FROM ACCOUNTS AS A 
      INNER JOIN AC_OPTIONS AS O ON O.ID=1 
      WHERE A.LEVEL3_NO = O.CASH_AC_TYPE
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch cash accounts:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/receivable/cost-centers', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT [COST_CODE], [COST_NAME] 
      FROM [COST_MASTER]
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch cost centers:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/receivable/accounts-info', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME
      FROM dbo.ACCOUNTS_INFO
      ORDER BY ACC_NO
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch accounts info:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/receivable/history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        T.ID as transactionNo,
        T.DOC_NO as invoiceNo,
        T.PAY_FROM_ACC,
        ISNULL(A1.ACC_NAME, CAST(T.PAY_FROM_ACC AS VARCHAR)) as payFrom,
        T.PAY_TO_ACC,
        ISNULL(A2.ACC_NAME, CAST(T.PAY_TO_ACC AS VARCHAR)) as payTo,
        T.PAY_AMOUNT as paidAmount,
        T.ENTRY_DATE as paidDate
      FROM dbo.TRN_ENTRY T
      LEFT JOIN dbo.ACCOUNTS_INFO A1 ON T.PAY_FROM_ACC = A1.ACC_NO
      LEFT JOIN dbo.ACCOUNTS A2 ON T.PAY_TO_ACC = A2.ACC_NO
      WHERE T.TRN_TYPE = 100
      ORDER BY T.ID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch receivable history:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});
app.post('/api/receivable/save', async (req, res) => {
  try {
    const {
      ENTRY_DATE,
      DOC_NO,
      DOC_TRN_TYPE,
      TRN_TYPE,
      PAY_FROM_ACC,
      PAY_TO_ACC,
      DESCRIPTION,
      PAY_AMOUNT,
      USER_ID,
      CURRENCY_NO,
      CURRENCY_RATE,
      IS_RETURN
    } = req.body;

    const pool = await getPool();
    const request = pool.request();

    // Procedure Parameters — verified against sys.parameters (SP_TRN_ENTRY_SAVE)
    request.input('ID', sql.Numeric(18, 0), null);                   // 1  — NULL = INSERT
    request.input('ENTRY_DATE', sql.DateTime, new Date(ENTRY_DATE));   // 2
    request.input('DOC_NO', sql.VarChar(50), String(DOC_NO));         // 3
    request.input('DOC_TRN_TYPE', sql.Int, DOC_TRN_TYPE || 6);      // 4
    request.input('TRN_TYPE', sql.Int, TRN_TYPE || 100);        // 5
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), PAY_FROM_ACC);           // 6
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), PAY_TO_ACC);             // 7
    request.input('TRN_NO', sql.Numeric(18, 0), null);                   // 8
    request.input('TRN_NO2', sql.Numeric(18, 0), null);                   // 9
    request.input('DESCRIPTION', sql.NVarChar(300), DESCRIPTION || '');      // 10 — DB has 300
    request.input('PAY_AMOUNT', sql.Real, PAY_AMOUNT);             // 11
    request.input('CURRENCY_NO', sql.Int, CURRENCY_NO || 1);       // 12
    request.input('CURRENCY_RATE', sql.Real, CURRENCY_RATE || 1);     // 13
    request.input('RETURN_INVOICE', sql.Bit, IS_RETURN ? 1 : 0);      // 14
    request.input('USER_ID', sql.Int, USER_ID || 1);           // 15

    const result = await request.execute('dbo.SP_TRN_ENTRY_SAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID;

    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save receivable entry:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// --- SUPPLIER ENDPOINTS ---

// 1. List Suppliers from ACCOUNTS_INFO
app.get('/api/suppliers/list', async (req, res) => {
  console.log('📡 SUPPLIER LIST REQUEST RECEIVED');
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ACC_NO, 
        ACC_NAME, 
        ACC_ANAME,
        ACC_TYPE,
        OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT
      FROM dbo.ACCOUNTS_INFO
      WHERE ACC_TYPE = 2
      ORDER BY ACC_NO
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ SQL ERROR IN SUPPLIER LIST:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// 2. Cache endpoint
app.get('/api/suppliers/cache', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME FROM dbo.ACCOUNTS_INFO WHERE ACC_TYPE = 2
    `);
    console.log(`👤 Supplier Cache: Loaded ${result.recordset.length} suppliers.`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch suppliers cache:", error);
    res.status(500).json({ error: 'Failed to fetch suppliers for cache' });
  }
});

// 3. Search suppliers
app.get('/api/suppliers/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 20 ACC_NO, ACC_NAME FROM dbo.ACCOUNTS_INFO
        WHERE ACC_TYPE = 2 AND (ACC_NO LIKE @query OR ACC_NAME LIKE @query)
      `);
    console.log(`👤 Supplier Search: Query "${q}" returned ${result.recordset.length} results`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Supplier search failed:", error.message);
    res.status(500).json({ error: 'Database search error' });
  }
});

app.get('/api/options/supplier-policy', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT SUP_AC_TYPE, PAYABLE_ACC FROM dbo.ac_options
    `);

    if (result.recordset[0]) {
      const policy = result.recordset[0];
      console.log('✅ SUPPLIER POLICY RESOLVED:', policy);
      res.json({
        sup_ac_type: policy.SUP_AC_TYPE,
        default_ledger: String(policy.PAYABLE_ACC || '')
      });
    } else {
      console.log('⚠️ SUPPLIER POLICY NOT FOUND IN AC_OPTIONS');
      res.json({ sup_ac_type: null, default_ledger: null });
    }
  } catch (error) {
    console.error('❌ SQL ERROR GETTING SUPPLIER POLICY:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- PURCHASE ENDPOINTS ---

// 1. List Purchase Accounts from ACCOUNTS_INFO
app.get('/api/purchases/list', async (req, res) => {
  console.log('📡 PURCHASE LIST REQUEST RECEIVED');
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ACC_NO, 
        ACC_NAME, 
        ACC_ANAME,
        ACC_TYPE,
        OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT
      FROM dbo.ACCOUNTS_INFO
      WHERE ACC_TYPE = 2
      ORDER BY ACC_NO
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ SQL ERROR IN PURCHASE LIST:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// 2. Cache endpoint
app.get('/api/purchases/cache', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME FROM dbo.ACCOUNTS_INFO WHERE ACC_TYPE = 2
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch purchases cache:", error);
    res.status(500).json({ error: 'Failed to fetch purchases for cache' });
  }
});

// 3. Search purchases
app.get('/api/purchases/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 20 ACC_NO, ACC_NAME FROM dbo.ACCOUNTS_INFO
        WHERE ACC_TYPE = 2 AND (ACC_NO LIKE @query OR ACC_NAME LIKE @query)
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Purchase search failed:", error.message);
    res.status(500).json({ error: 'Database search error' });
  }
});

app.get('/api/options/purchase-policy', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT EXP_AC_TYPE, EXP_ACC FROM dbo.ac_options
    `);

    if (result.recordset[0]) {
      const policy = result.recordset[0];
      res.json({
        pur_ac_type: policy.EXP_AC_TYPE,
        default_ledger: String(policy.EXP_ACC || '')
      });
    } else {
      res.json({ pur_ac_type: null, default_ledger: null });
    }
  } catch (error) {
    console.error('❌ SQL ERROR GETTING PURCHASE POLICY:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Fetch single customer/supplier by ID (Numeric match)
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
        FROM dbo.ACCOUNTS_INFO 
        WHERE ACC_NO = @id
      `);
    if (result.recordset && result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: 'Account not found' });
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
  const { level = 4 } = req.query;
  try {
    const pool = await getPool();
    const query = level === '0'
      ? `SELECT ACC_NO, ACC_NAME, ACC_ANAME, ACC_CLASS, LEVEL2_NO, LEVEL3_NO, ACC_LEVEL, OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT, ACC_CODE, ISPERMENENT, GROUP_AC, PREFEX_NO, ACC_TYPE_CODE FROM dbo.ACCOUNTS ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO`
      : `SELECT ACC_NO, ACC_NAME, ACC_ANAME, ACC_CLASS, LEVEL2_NO, LEVEL3_NO, ACC_LEVEL, OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT, ACC_CODE, ISPERMENENT, GROUP_AC, PREFEX_NO, ACC_TYPE_CODE FROM dbo.ACCOUNTS WHERE ACC_LEVEL = @level ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO`;

    const result = await pool.request()
      .input('level', sql.Int, level)
      .query(query);

    console.log(`🏦 Accounts Global (Level ${level}): Loaded ${result.recordset.length} accounts.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/all', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ACC_NO, 
        ACC_NAME, 
        ACC_CLASS, 
        LEVEL2_NO, 
        LEVEL3_NO 
      FROM dbo.ACCOUNTS 
      WHERE ACC_LEVEL = 4
      ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO
    `);
    console.log(`📊 All Accounts: Loaded ${result.recordset.length} accounts.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/classes', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_CLASS_CODE as acc_class_code, ACC_CLASS_NAME as acc_class_name 
      FROM dbo.ACC_CLASS
      ORDER BY ACC_CLASS_CODE
    `);
    console.log(`🏷️ Account Classes: Loaded ${result.recordset.length} classes.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/subclasses', async (req, res, next) => {
  const { classCode } = req.query;
  if (!classCode) return res.json([]);

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('classCode', sql.Int, classCode)
      .query(`
        SELECT ACC_NO as acc_no, ACC_NAME as acc_name 
        FROM dbo.ACCOUNTS 
        WHERE ACC_CLASS = @classCode AND ACC_LEVEL = 2
        ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO
      `);
    console.log(`📂 Sub Classes: Loaded ${result.recordset.length} sub-classes for class ${classCode}.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/header-accounts', async (req, res, next) => {
  const { subClassCode } = req.query;
  if (!subClassCode) return res.json([]);

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('subClassCode', sql.Numeric(18, 0), subClassCode)
      .query(`
        SELECT ACC_NO as acc_no, ACC_NAME as acc_name 
        FROM dbo.ACCOUNTS 
        WHERE LEVEL2_NO = @subClassCode AND ACC_LEVEL = 3
        ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO
      `);
    console.log(`📂 Header Accounts: Loaded ${result.recordset.length} headers for sub-class ${subClassCode}.`);
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

app.get('/api/branches', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT Branch_Code, Branch_Name 
      FROM dbo.BRANCHES
      ORDER BY Branch_Code ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch branches:", error);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

app.get('/api/screens', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT Menu_Name 
      FROM dbo.UserPriv
      WHERE Menu_Name IS NOT NULL AND Menu_Name <> ''
      ORDER BY Menu_Name ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch screens:", error);
    res.status(500).json({ error: 'Failed to fetch screens' });
  }
});

app.get('/api/accounts/list-by-parent', async (req, res, next) => {
  const { parentLevel, parentId } = req.query;
  if (!parentLevel || !parentId) return res.json([]);

  const columnMap = {
    '2': 'LEVEL2_NO',
    '3': 'LEVEL3_NO'
  };
  const column = columnMap[parentLevel];
  if (!column) return res.status(400).json({ error: 'Invalid parent level' });

  try {
    const pool = await getPool();
    console.log(`🔎 Listing accounts for Parent Level ${parentLevel}, Parent ID: ${parentId}`);
    const result = await pool.request()
      .input('parentId', sql.NVarChar(50), parentId)
      .query(`
        SELECT * FROM dbo.ACCOUNTS 
        WHERE ${column} = @parentId
        AND ACC_LEVEL = 4
        ORDER BY ACC_NO
      `);
    if (result.recordset.length > 0) {
      console.log('🔗 CHILD RECORD SAMPLE:', result.recordset[0]);
    }
    console.log(`✅ Found ${result.recordset.length} accounts for group.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/header-types', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT HEADER_CODE as header_code, HEADER_NAME as header_name 
      FROM dbo.AC_HEADER_TYPES 
      WHERE FLAG = 1
      ORDER BY HEADER_CODE
    `);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/accounts/by-level', async (req, res, next) => {
  const { classCode, level } = req.query;
  if (!classCode || !level) return res.json([]);

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('classCode', sql.Int, classCode)
      .input('level', sql.Int, level)
      .query(`
        SELECT 
          ACC_LEVEL as acc_level,
          ACC_NO as acc_no, 
          ACC_NAME as acc_name, 
          LEVEL2_NO, 
          LEVEL3_NO,
          OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT
        FROM dbo.ACCOUNTS 
        WHERE ACC_CLASS = @classCode AND CAST(ACC_LEVEL AS INT) = CAST(@level AS INT)
        ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO
      `);
    console.log(`📂 Level Accounts: Loaded ${result.recordset.length} accounts for class ${classCode} at level ${level}.`);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

// Create a new Chart of Account
app.post('/api/accounts/create', async (req, res) => {
  const {
    accNo: providedAccNo,
    accName, accClass, accLevel,
    accAName = '', groupAc = '', prefexNo = '',
    level1, level2, level3,
    isPermanent = 0, accCode = '',
    obDrAmount = 0, obCrAmount = 0,
    isInactive = 0, isHidden = 0
  } = req.body;

  if (!accName) {
    return res.status(400).json({ error: 'Account Name is required.' });
  }

  try {
    const pool = await getPool();
    let finalAccNo = providedAccNo;

    // If no AccNo provided, generate next one
    if (!finalAccNo || isNaN(Number(finalAccNo))) {
      // Determine parent context for ID generation
      let parentColumn = '';
      let parentValue = '';

      if (accLevel === 4) {
        parentColumn = 'LEVEL3_NO';
        parentValue = level3;
      } else if (accLevel === 3) {
        parentColumn = 'LEVEL2_NO';
        parentValue = level2;
      } else {
        parentColumn = 'ACC_CLASS';
        parentValue = accClass;
      }

      // Auto-generate ACC_NO: MAX(ACC_NO) + 1 within parent context
      const idResult = await pool.request()
        .input('parentValue', sql.NVarChar(50), String(parentValue))
        .query(`
          SELECT ISNULL(MAX(ACC_NO), 0) as lastNo 
          FROM dbo.ACCOUNTS 
          WHERE ${parentColumn} = @parentValue
        `);

      let nextAccNo = idResult.recordset[0].lastNo;

      // If no existing accounts, start from ParentID * 100 + 1 (or simple +1 if numeric mismatch)
      if (nextAccNo === 0) {
        const startBase = isNaN(Number(parentValue)) ? 0 : Number(parentValue);
        nextAccNo = startBase * 100 + 1;
      } else {
        nextAccNo = Number(nextAccNo) + 1;
      }
      finalAccNo = nextAccNo;
    }

    // --- CALCULATE CLOSING BALANCE FROM TRANSACTIONS ---
    // CB = OB + Sum(TRN)
    const trnResult = await pool.request()
      .input('accNo', sql.Numeric(18, 0), finalAccNo)
      .query(`
        SELECT 
          SUM(CASE WHEN DR_CR='C' THEN PAY_AMOUNT ELSE 0 END) AS CREDIT_AMOUNT,
          SUM(CASE WHEN DR_CR='D' THEN PAY_AMOUNT ELSE 0 END) AS DEBIT_AMOUNT 
        FROM dbo.TRN_ACCOUNTS 
        WHERE ACC_NO = @accNo
      `);

    const trnCr = trnResult.recordset[0].CREDIT_AMOUNT || 0;
    const trnDr = trnResult.recordset[0].DEBIT_AMOUNT || 0;

    const cbCrAmount = (Number(obCrAmount) || 0) + trnCr;
    const cbDrAmount = (Number(obDrAmount) || 0) + trnDr;

    // Check if account already exists (for "Update" functionality if needed)
    const checkExist = await pool.request()
      .input('accNo', sql.Numeric(18, 0), finalAccNo)
      .query(`SELECT ACC_NO FROM dbo.ACCOUNTS WHERE ACC_NO = @accNo`);

    if (checkExist.recordset.length > 0) {
      // UPDATE EXISTING
      const updateQuery = `
        UPDATE dbo.ACCOUNTS SET
          ACC_NAME = @accName, ACC_ANAME = @accAName, ACC_CLASS = @accClass, ACC_LEVEL = @accLevel,
          GROUP_AC = @groupAc, PREFEX_NO = @prefexNo, LEVEL1_NO = @level1, LEVEL2_NO = @level2, LEVEL3_NO = @level3,
          ISPERMENENT = @isPermanent, ACC_CODE = @accCode,
          OB_DR_AMOUNT = @obDrAmount, OB_CR_AMOUNT = @obCrAmount,
          CB_DR_AMOUNT = @cbDrAmount, CB_CR_AMOUNT = @cbCrAmount,
          UPDATE_TIME = GETDATE()
        WHERE ACC_NO = @accNo
      `;
      await pool.request()
        .input('accNo', sql.Numeric(18, 0), finalAccNo)
        .input('accName', sql.NVarChar(150), accName)
        .input('accAName', sql.NVarChar(150), accAName)
        .input('accClass', sql.Int, accClass)
        .input('accLevel', sql.Int, accLevel)
        .input('groupAc', sql.Numeric(18, 0), (groupAc === '' || isNaN(Number(groupAc))) ? null : Number(groupAc))
        .input('prefexNo', sql.Numeric(18, 0), (prefexNo === '' || isNaN(Number(prefexNo))) ? null : Number(prefexNo))
        .input('level1', sql.NVarChar(50), level1 ? String(level1) : null)
        .input('level2', sql.NVarChar(50), level2 ? String(level2) : null)
        .input('level3', sql.NVarChar(50), level3 ? String(level3) : null)
        .input('isPermanent', sql.Bit, isPermanent)
        .input('accCode', sql.NVarChar(50), accCode)
        .input('obDrAmount', sql.Decimal(18, 2), Number(obDrAmount) || 0)
        .input('obCrAmount', sql.Decimal(18, 2), Number(obCrAmount) || 0)
        .input('cbDrAmount', sql.Decimal(18, 2), Number(cbDrAmount) || 0)
        .input('cbCrAmount', sql.Decimal(18, 2), Number(cbCrAmount) || 0)
        .query(updateQuery);

      console.log(`✅ Chart of Account Updated: ${accName} (${finalAccNo})`);
      res.json({ success: true, message: 'Account updated successfully', accNo: finalAccNo });
    } else {
      // INSERT NEW
      const insertQuery = `
          INSERT INTO dbo.ACCOUNTS (
            ACC_NO, ACC_NAME, ACC_ANAME, ACC_CLASS, ACC_LEVEL, 
            GROUP_AC, PREFEX_NO, LEVEL1_NO, LEVEL2_NO, LEVEL3_NO, 
            ISPERMENENT, ACC_CODE, ACC_TYPE_CODE, CREATE_TIME,
            OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT
          )
          VALUES (
            @accNo, @accName, @accAName, @accClass, @accLevel, 
            @groupAc, @prefexNo, @level1, @level2, @level3, 
            @isPermanent, @accCode, 1, GETDATE(),
            @obDrAmount, @obCrAmount, @cbDrAmount, @cbCrAmount
          )
      `;

      await pool.request()
        .input('accNo', sql.Numeric(18, 0), finalAccNo)
        .input('accName', sql.NVarChar(150), accName)
        .input('accAName', sql.NVarChar(150), accAName)
        .input('accClass', sql.Int, accClass)
        .input('accLevel', sql.Int, accLevel)
        .input('groupAc', sql.Numeric(18, 0), (groupAc === '' || isNaN(Number(groupAc))) ? null : Number(groupAc))
        .input('prefexNo', sql.Numeric(18, 0), (prefexNo === '' || isNaN(Number(prefexNo))) ? null : Number(prefexNo))
        .input('level1', sql.NVarChar(50), level1 ? String(level1) : null)
        .input('level2', sql.NVarChar(50), level2 ? String(level2) : null)
        .input('level3', sql.NVarChar(50), level3 ? String(level3) : null)
        .input('isPermanent', sql.Bit, isPermanent)
        .input('accCode', sql.NVarChar(50), accCode)
        .input('obDrAmount', sql.Decimal(18, 2), Number(obDrAmount) || 0)
        .input('obCrAmount', sql.Decimal(18, 2), Number(obCrAmount) || 0)
        .input('cbDrAmount', sql.Decimal(18, 2), Number(cbDrAmount) || 0)
        .input('cbCrAmount', sql.Decimal(18, 2), Number(cbCrAmount) || 0)
        .query(insertQuery);

      console.log(`✅ Chart of Account Created: ${accName} (${finalAccNo})`);
      res.json({ success: true, message: 'Account created successfully', accNo: finalAccNo });
    }
  } catch (error) {
    console.error("❌ SQL ERROR DURING ACCOUNT SAVE:");
    console.error("Message:", error.message);
    console.error("Payload received:", req.body);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Get Cash/Bank policy from AC_OPTION
app.get('/api/options/cash-policy', async (req, res) => {
  try {
    const pool = await getPool();
    // Fetching from AC_OPTIONS (plural) as verified
    const fallbackResult = await pool.request().query(`
      SELECT CASH_AC_TYPE FROM dbo.AC_OPTIONS WHERE ID = 1
    `);

    if (fallbackResult.recordset[0]) {
      const headerId = fallbackResult.recordset[0].CASH_AC_TYPE;
      const accInfo = await pool.request()
        .input('headerId', sql.Numeric(18, 0), headerId)
        .query('SELECT LEVEL2_NO FROM dbo.ACCOUNTS WHERE ACC_NO = @headerId');

      const resData = {
        headerAcc: headerId,
        subClass: accInfo.recordset[0]?.LEVEL2_NO || 'All'
      };
      console.log('✅ CASH POLICY RESOLVED:', resData);
      res.json(resData);
    } else {
      console.log('⚠️ CASH POLICY NOT FOUND IN AC_OPTIONS');
      res.json({ headerAcc: 'All', subClass: 'All' });
    }
  } catch (error) {
    console.error('❌ Failed to fetch cash policy:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/options/customer-policy', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT cus_ac_type, RECEIVABLE_ACC FROM dbo.ac_options
    `);

    if (result.recordset[0]) {
      const policy = result.recordset[0];
      console.log('✅ CUSTOMER POLICY RESOLVED:', policy);
      res.json({
        cus_ac_type: policy.cus_ac_type,
        default_ledger: String(policy.RECEIVABLE_ACC || '')
      });
    } else {
      console.log('⚠️ CUSTOMER POLICY NOT FOUND IN AC_OPTIONS');
      res.json({ cus_ac_type: null, default_ledger: null });
    }
  } catch (error) {
    console.error('❌ SQL ERROR GETTING CUSTOMER POLICY:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Extended Customer Info
app.get('/api/customers/:accNo/info', async (req, res) => {
  const { accNo } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('accNo', sql.VarChar, accNo)
      .query(`
        SELECT 
          AI.*,
           ACC_NAME,
         ACC_ANAME
        FROM dbo.ACCOUNTS_INFO AI
        WHERE AI.ACC_NO = @accNo
      `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error(`❌ Customer Lookup Error for ${accNo}:`, error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Save Customer Info
app.post('/api/customers/:accNo/info', async (req, res) => {
  const { accNo: originalAccNo } = req.params;
  const data = req.body;
  if (!originalAccNo || !data) return res.status(400).json({ error: 'Missing logic' });

  try {
    const pool = await getPool();
    let accNo = originalAccNo;

    // Handle Auto-generation for new customers (using ACCOUNTS_INFO as source)
    if (originalAccNo === 'AUTO-GENERATE' || !originalAccNo) {
      const maxResult = await pool.request()
        .query(`SELECT ISNULL(MAX(ACC_NO), 6000) as maxNo FROM dbo.ACCOUNTS_INFO WHERE ACC_TYPE = 1`);

      const lastNo = maxResult.recordset[0].maxNo;
      if (lastNo) {
        accNo = String(Number(lastNo) + 1);
      } else {
        accNo = "1";
      }
      console.log(`✨ Generated New Customer ACC_NO in ACCOUNTS_INFO: ${accNo}`);
    }

    // 1. CALCULATE CLOSING BALANCE FROM TRANSACTIONS
    const trnResult = await pool.request()
      .input('accNo', sql.Numeric(18, 0), accNo)
      .query(`
        SELECT 
          SUM(CASE WHEN DR_CR='C' THEN PAY_AMOUNT ELSE 0 END) AS CREDIT_AMOUNT,
          SUM(CASE WHEN DR_CR='D' THEN PAY_AMOUNT ELSE 0 END) AS DEBIT_AMOUNT 
        FROM dbo.TRN_ACCOUNTS 
        WHERE ACC_NO = @accNo
      `);
    const trnCr = trnResult.recordset[0].CREDIT_AMOUNT || 0;
    const trnDr = trnResult.recordset[0].DEBIT_AMOUNT || 0;
    const cbCrAmount = (Number(data.OB_CR_AMOUNT) || 0) + trnCr;
    const cbDrAmount = (Number(data.OB_DR_AMOUNT) || 0) + trnDr;

    // 2. CHECK IF EXISTS IN ACCOUNTS_INFO
    const checkEx = await pool.request()
      .input('accNo', sql.VarChar, accNo)
      .query(`SELECT ACC_NO FROM dbo.ACCOUNTS_INFO WHERE ACC_NO = @accNo`);

    const reqPool = pool.request()
      .input('accNo', sql.Numeric(18, 0), accNo)
      .input('ACC_NAME', sql.NVarChar, data.ACC_NAME || '')
      .input('ACC_ANAME', sql.NVarChar, data.ACC_ANAME || '')
      .input('ACC_TELE_NO', sql.VarChar, String(data.ACC_TELE_NO || ''))
      .input('ACC_MOBILE_NO', sql.VarChar, String(data.ACC_MOBILE_NO || ''))
      .input('ACC_FAX_NO', sql.VarChar, String(data.ACC_FAX_NO || ''))
      .input('ACC_ADDRESS', sql.NVarChar, data.ACC_ADDRESS || '')
      .input('CREDIT_LIMIT', sql.Float, parseFloat(data.CREDIT_LIMIT) || 0)
      .input('CONTACT_PERSON', sql.NVarChar, data.CONTACT_PERSON || '')
      .input('ID_NUMBER', sql.VarChar, String(data.ID_NUMBER || ''))
      .input('FLAG', sql.VarChar, data.FLAG || 'A')
      .input('EMAIL', sql.VarChar, data.EMAIL || '')
      .input('SEND_SMS', sql.Bit, data.SEND_SMS ? 1 : 0)
      .input('IBAN_NO', sql.VarChar, String(data.IBAN_NO || ''))
      .input('BANK_DET', sql.NVarChar, data.BANK_DET || '')
      .input('VAT_Tinno', sql.VarChar, String(data.VAT_Tinno || ''))
      .input('CREDIT_DAYS', sql.Int, parseInt(data.CREDIT_DAYS) || 0)
      .input('building_no', sql.VarChar, String(data.building_no || ''))
      .input('city_subdivision_name', sql.NVarChar, data.city_subdivision_name || '')
      .input('street_name', sql.NVarChar, data.street_name || '')
      .input('Schema_no', sql.VarChar, String(data.Schema_no || ''))
      .input('city_name', sql.NVarChar, data.city_name || '')
      .input('city_aname', sql.NVarChar, data.city_aname || '')
      .input('postal_zone', sql.VarChar, String(data.postal_zone || ''))
      .input('regsitered_name', sql.NVarChar, data.regsitered_name || '')
      .input('LEDGER_ACC', sql.Numeric(18, 0), data.LEDGER_ACC || 0)
      .input('IS_PERMINENT', sql.Bit, data.IS_PERMINENT ? 1 : 0)
      .input('obDr', sql.Decimal(18, 2), Number(data.OB_DR_AMOUNT) || 0)
      .input('obCr', sql.Decimal(18, 2), Number(data.OB_CR_AMOUNT) || 0)
      .input('cbDr', sql.Decimal(18, 2), Number(cbDrAmount) || 0)
      .input('cbCr', sql.Decimal(18, 2), Number(cbCrAmount) || 0);

    const accType = parseInt(data.ACC_TYPE) || 1;

    if (checkEx.recordset.length > 0) {
      await reqPool.query(`
        UPDATE dbo.ACCOUNTS_INFO SET 
          ACC_NAME = @ACC_NAME, ACC_ANAME = @ACC_ANAME, ACC_TELE_NO = @ACC_TELE_NO, 
          ACC_MOBILE_NO = @ACC_MOBILE_NO, ACC_FAX_NO = @ACC_FAX_NO, ACC_ADDRESS = @ACC_ADDRESS, 
          CREDIT_LIMIT = @CREDIT_LIMIT, CONTACT_PERSON = @CONTACT_PERSON, ID_NUMBER = @ID_NUMBER, 
          FLAG = @FLAG, EMAIL = @EMAIL, SEND_SMS = @SEND_SMS, IBAN_NO = @IBAN_NO, BANK_DET = @BANK_DET, 
          VAT_Tinno = @VAT_Tinno, CREDIT_DAYS = @CREDIT_DAYS, building_no = @building_no, 
          city_subdivision_name = @city_subdivision_name, street_name = @street_name, 
          Schema_no = @Schema_no, city_name = @city_name, city_aname = @city_aname, 
          postal_zone = @postal_zone, regsitered_name = @regsitered_name,
          LEDGER_ACC = @LEDGER_ACC, IS_PERMINENT = @IS_PERMINENT,
          OB_DR_AMOUNT = @obDr, OB_CR_AMOUNT = @obCr,
          CB_DR_AMOUNT = @cbDr, CB_CR_AMOUNT = @cbCr,
          ACC_TYPE = ${accType}
        WHERE ACC_NO = @accNo
      `);
    } else {
      await reqPool.query(`
        INSERT INTO dbo.ACCOUNTS_INFO (
          ACC_NO, ACC_NAME, ACC_ANAME, ACC_TELE_NO, ACC_MOBILE_NO, ACC_FAX_NO, ACC_ADDRESS, 
          CREDIT_LIMIT, CONTACT_PERSON, ID_NUMBER, FLAG, EMAIL, SEND_SMS, IBAN_NO, BANK_DET, 
          VAT_Tinno, CREDIT_DAYS, building_no, city_subdivision_name, street_name, Schema_no, 
          city_name, city_aname, postal_zone, regsitered_name, LEDGER_ACC, IS_PERMINENT, 
          OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT, ACC_TYPE
        ) VALUES (
          @accNo, @ACC_NAME, @ACC_ANAME, @ACC_TELE_NO, @ACC_MOBILE_NO, @ACC_FAX_NO, @ACC_ADDRESS, 
          @CREDIT_LIMIT, @CONTACT_PERSON, @ID_NUMBER, @FLAG, @EMAIL, @SEND_SMS, @IBAN_NO, @BANK_DET, 
          @VAT_Tinno, @CREDIT_DAYS, @building_no, @city_subdivision_name, @street_name, @Schema_no, 
          @city_name, @city_aname, @postal_zone, @regsitered_name, @LEDGER_ACC, @IS_PERMINENT, 
          @obDr, @obCr, @cbDr, @cbCr, ${accType}
        )
      `);
    }

    res.json({ success: true, accNo: accNo });
  } catch (err) {
    console.error("Save Customer Error:", err);
    res.status(500).json({ error: 'Database save error', details: err.message });
  }
});

// Item Group Endpoints
app.get('/api/item-groups', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ITM_CAT_CODE, ITM_CAT_NAME, ITM_CAT_ANAME, VAT_PERCENT 
      FROM dbo.ITEM_CAT
      ORDER BY ITM_CAT_CODE ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Item Group Get Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/item-groups', async (req, res) => {
  const { ITM_CAT_CODE, ITM_CAT_NAME, ITM_CAT_ANAME, VAT_PERCENT } = req.body;
  if (!ITM_CAT_CODE || !ITM_CAT_NAME) return res.status(400).json({ error: 'Code and Name required' });

  try {
    const pool = await getPool();
    const checkEx = await pool.request()
      .input('code', sql.Int, ITM_CAT_CODE)
      .query(`SELECT ITM_CAT_CODE FROM dbo.ITEM_CAT WHERE ITM_CAT_CODE = @code`);

    const reqPool = pool.request()
      .input('code', sql.Int, ITM_CAT_CODE)
      .input('name', sql.NVarChar, ITM_CAT_NAME)
      .input('aname', sql.NVarChar, ITM_CAT_ANAME || '')
      .input('vat', sql.Float, VAT_PERCENT || 0);

    if (checkEx.recordset.length > 0) {
      // UPDATE
      await reqPool.query(`
        UPDATE dbo.ITEM_CAT SET 
          ITM_CAT_NAME = @name,
          ITM_CAT_ANAME = @aname,
          VAT_PERCENT = @vat
        WHERE ITM_CAT_CODE = @code
      `);
    } else {
      // INSERT
      await reqPool.query(`
        INSERT INTO dbo.ITEM_CAT (ITM_CAT_CODE, ITM_CAT_NAME, ITM_CAT_ANAME, VAT_PERCENT)
        VALUES (@code, @name, @aname, @vat)
      `);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Item Group Post Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});


// Unit Master Endpoints
app.get('/api/unit-master', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT Unit_id, Unit_Name, Unit_AName, Unit_Type, QTY 
      FROM dbo.UnitMaster
      ORDER BY Unit_id ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Unit Master Get Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/unit-master', async (req, res) => {
  const { Unit_id, Unit_Name, Unit_AName, Unit_Type, QTY } = req.body;
  if (!Unit_id || !Unit_Name) return res.status(400).json({ error: 'ID and Name required' });

  try {
    const pool = await getPool();
    const checkEx = await pool.request()
      .input('id', sql.Int, Unit_id)
      .query(`SELECT Unit_id FROM dbo.UnitMaster WHERE Unit_id = @id`);

    const reqPool = pool.request()
      .input('id', sql.Int, Unit_id)
      .input('name', sql.NVarChar, Unit_Name)
      .input('aname', sql.NVarChar, Unit_AName || '')
      .input('unitType', sql.NVarChar, Unit_Type || '')
      .input('qty', sql.Float, QTY || 0);

    if (checkEx.recordset.length > 0) {
      // UPDATE
      await reqPool.query(`
        UPDATE dbo.UnitMaster SET 
          Unit_Name = @name,
          Unit_AName = @aname,
          Unit_Type = @unitType,
          QTY = @qty
        WHERE Unit_id = @id
      `);
    } else {
      // INSERT
      await reqPool.query(`
        INSERT INTO dbo.UnitMaster (Unit_id, Unit_Name, Unit_AName, Unit_Type, QTY)
        VALUES (@id, @name, @aname, @unitType, @qty)
      `);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Unit Master Post Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Transaction Types Endpoints
app.get('/api/transaction-types', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        TRN_CODE, TRN_NAME, TRN_NO, BRN_CODE, TRN_ANAME, 
        ACC_NO, ABRV, DRCR, DRCR1, PAYBY, 
        INV_PREFEX, AUTO_POST, ABRV_CODE, VAT_ACC, EXP_ACC, 
        PIH, SCREEN_NAME
      FROM dbo.TRN_TYPE
      ORDER BY TRN_CODE ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Transaction Types Get Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/transaction-types', async (req, res) => {
  const data = req.body;
  if (!data.TRN_CODE || !data.TRN_NAME) return res.status(400).json({ error: 'Code and Name required' });

  try {
    const pool = await getPool();
    const checkEx = await pool.request()
      .input('code', sql.Int, data.TRN_CODE)
      .query(`SELECT TRN_CODE FROM dbo.TRN_TYPE WHERE TRN_CODE = @code`);

    const reqPool = pool.request()
      .input('TRN_CODE', sql.Int, data.TRN_CODE)
      .input('TRN_NAME', sql.NVarChar, data.TRN_NAME)
      .input('TRN_NO', sql.Int, data.TRN_NO || null)
      .input('BRN_CODE', sql.Int, data.BRN_CODE || 1)
      .input('TRN_ANAME', sql.NVarChar, data.TRN_ANAME || '')
      .input('ACC_NO', sql.Numeric(18,0), data.ACC_NO ? Number(data.ACC_NO) : null)
      .input('ABRV', sql.VarChar, data.ABRV || '')
      .input('DRCR', sql.VarChar, data.DRCR || 'D')
      .input('DRCR1', sql.VarChar, data.DRCR1 || 'D')
      .input('PAYBY', sql.VarChar, data.PAYBY || '')
      .input('INV_PREFEX', sql.VarChar, data.INV_PREFEX || '')
      .input('AUTO_POST', sql.Int, data.AUTO_POST || 0)
      .input('ABRV_CODE', sql.VarChar, data.ABRV_CODE || '')
      .input('VAT_ACC', sql.Numeric(18,0), data.VAT_ACC ? Number(data.VAT_ACC) : null)
      .input('EXP_ACC', sql.Numeric(18,0), data.EXP_ACC ? Number(data.EXP_ACC) : null)
      .input('PIH', sql.Int, data.PIH || 0)
      .input('SCREEN_NAME', sql.NVarChar, data.SCREEN_NAME || '');

    if (checkEx.recordset.length > 0) {
      await reqPool.query(`
        UPDATE dbo.TRN_TYPE SET 
          TRN_NAME = @TRN_NAME, TRN_NO = @TRN_NO, BRN_CODE = @BRN_CODE, TRN_ANAME = @TRN_ANAME, 
          ACC_NO = @ACC_NO, ABRV = @ABRV, DRCR = @DRCR, DRCR1 = @DRCR1, PAYBY = @PAYBY, 
          INV_PREFEX = @INV_PREFEX, AUTO_POST = @AUTO_POST, ABRV_CODE = @ABRV_CODE, 
          VAT_ACC = @VAT_ACC, EXP_ACC = @EXP_ACC, PIH = @PIH, SCREEN_NAME = @SCREEN_NAME
        WHERE TRN_CODE = @TRN_CODE
      `);
    } else {
      await reqPool.query(`
        INSERT INTO dbo.TRN_TYPE (
          TRN_CODE, TRN_NAME, TRN_NO, BRN_CODE, TRN_ANAME, 
          ACC_NO, ABRV, DRCR, DRCR1, PAYBY, 
          INV_PREFEX, AUTO_POST, ABRV_CODE, VAT_ACC, EXP_ACC, 
          PIH, SCREEN_NAME
        ) VALUES (
          @TRN_CODE, @TRN_NAME, @TRN_NO, @BRN_CODE, @TRN_ANAME, 
          @ACC_NO, @ABRV, @DRCR, @DRCR1, @PAYBY, 
          @INV_PREFEX, @AUTO_POST, @ABRV_CODE, @VAT_ACC, @EXP_ACC, 
          @PIH, @SCREEN_NAME
        )
      `);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Transaction Type Post Error:", err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// User Privileges Endpoints
app.get('/api/user-privileges', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        GROUP_NAME, form_id, ins, upd, qry, del, dsp, Menu_Name
      FROM dbo.UserPriv
      ORDER BY GROUP_NAME, Menu_Name ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("User Privileges Get Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/user-privileges', async (req, res) => {
  const data = req.body;
  if (!data.GROUP_NAME || !data.Menu_Name) return res.status(400).json({ error: 'Group and Menu Name required' });

  try {
    const pool = await getPool();
    const checkEx = await pool.request()
      .input('group', sql.NVarChar, data.GROUP_NAME)
      .input('menu', sql.NVarChar, data.Menu_Name)
      .query(`SELECT GROUP_NAME FROM dbo.UserPriv WHERE GROUP_NAME = @group AND Menu_Name = @menu`);

    const reqPool = pool.request()
      .input('GROUP_NAME', sql.NVarChar, data.GROUP_NAME)
      .input('form_id', sql.VarChar, data.form_id || '')
      .input('ins', sql.Int, data.ins || 0)
      .input('upd', sql.Int, data.upd || 0)
      .input('qry', sql.Int, data.qry || 0)
      .input('del', sql.Int, data.del || 0)
      .input('dsp', sql.Int, data.dsp || 0)
      .input('Menu_Name', sql.NVarChar, data.Menu_Name);

    if (checkEx.recordset.length > 0) {
      await reqPool.query(`
        UPDATE dbo.UserPriv SET 
          form_id = @form_id, ins = @ins, upd = @upd, qry = @qry, del = @del, dsp = @dsp
        WHERE GROUP_NAME = @GROUP_NAME AND Menu_Name = @Menu_Name
      `);
    } else {
      await reqPool.query(`
        INSERT INTO dbo.UserPriv (
          GROUP_NAME, form_id, ins, upd, qry, del, dsp, Menu_Name
        ) VALUES (
          @GROUP_NAME, @form_id, @ins, @upd, @qry, @del, @dsp, @Menu_Name
        )
      `);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("User Privilege Post Error:", err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// User Info Endpoints
app.get('/api/user-info', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        UserId, UserName, MOBILE_NO, Password, Superuser, 
        Group_Name, WR_CODE, BRN_CODE, MENU_DOCK, SH_TOPMENU, 
        SH_SIDEMENU, POWER_USER, DEF_LANG, DEF_INVOICE, DEF_FORM, 
        DEF_SCREEN, LOGGED_ID, CUR_LOGGED_TIME, Employee_ACNO, 
        SALE_CASH_AC, SALE_BANK_AC, Payments
      FROM dbo.UserInfo
      ORDER BY UserId ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("User Info Get Error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/user-info', async (req, res) => {
  const data = req.body;
  if (!data.UserId || !data.UserName) return res.status(400).json({ error: 'UserId and UserName required' });

  try {
    const pool = await getPool();
    const checkEx = await pool.request()
      .input('uid', sql.VarChar, data.UserId)
      .query(`SELECT UserId FROM dbo.UserInfo WHERE UserId = @uid`);

    const reqPool = pool.request()
      .input('UserId', sql.VarChar, data.UserId)
      .input('UserName', sql.NVarChar, data.UserName)
      .input('MOBILE_NO', sql.VarChar, data.MOBILE_NO || '')
      .input('Password', sql.VarChar, data.Password || '')
      .input('Superuser', sql.Int, data.Superuser || 0)
      .input('Group_Name', sql.NVarChar, data.Group_Name || '')
      .input('WR_CODE', sql.VarChar, data.WR_CODE || '')
      .input('BRN_CODE', sql.VarChar, data.BRN_CODE || '')
      .input('MENU_DOCK', sql.Int, data.MENU_DOCK || 0)
      .input('SH_TOPMENU', sql.Int, data.SH_TOPMENU || 1)
      .input('SH_SIDEMENU', sql.Int, data.SH_SIDEMENU || 1)
      .input('POWER_USER', sql.Int, data.POWER_USER || 0)
      .input('DEF_LANG', sql.VarChar, data.DEF_LANG || 'EN')
      .input('DEF_INVOICE', sql.VarChar, data.DEF_INVOICE || '')
      .input('DEF_FORM', sql.VarChar, data.DEF_FORM || '')
      .input('DEF_SCREEN', sql.VarChar, data.DEF_SCREEN || '')
      .input('Employee_ACNO', sql.Numeric(18,0), data.Employee_ACNO ? Number(data.Employee_ACNO) : null)
      .input('SALE_CASH_AC', sql.Numeric(18,0), data.SALE_CASH_AC ? Number(data.SALE_CASH_AC) : null)
      .input('SALE_BANK_AC', sql.Numeric(18,0), data.SALE_BANK_AC ? Number(data.SALE_BANK_AC) : null)
      .input('Payments', sql.VarChar, data.Payments || '');

    if (checkEx.recordset.length > 0) {
      await reqPool.query(`
        UPDATE dbo.UserInfo SET 
          UserName = @UserName, MOBILE_NO = @MOBILE_NO, Password = @Password, 
          Superuser = @Superuser, Group_Name = @Group_Name, WR_CODE = @WR_CODE, 
          BRN_CODE = @BRN_CODE, MENU_DOCK = @MENU_DOCK, SH_TOPMENU = @SH_TOPMENU, 
          SH_SIDEMENU = @SH_SIDEMENU, POWER_USER = @POWER_USER, DEF_LANG = @DEF_LANG, 
          DEF_INVOICE = @DEF_INVOICE, DEF_FORM = @DEF_FORM, DEF_SCREEN = @DEF_SCREEN, 
          Employee_ACNO = @Employee_ACNO, SALE_CASH_AC = @SALE_CASH_AC, 
          SALE_BANK_AC = @SALE_BANK_AC, Payments = @Payments
        WHERE UserId = @UserId
      `);
    } else {
      await reqPool.query(`
        INSERT INTO dbo.UserInfo (
          UserId, UserName, MOBILE_NO, Password, Superuser, 
          Group_Name, WR_CODE, BRN_CODE, MENU_DOCK, SH_TOPMENU, 
          SH_SIDEMENU, POWER_USER, DEF_LANG, DEF_INVOICE, DEF_FORM, 
          DEF_SCREEN, Employee_ACNO, SALE_CASH_AC, SALE_BANK_AC, Payments
        ) VALUES (
          @UserId, @UserName, @MOBILE_NO, @Password, @Superuser, 
          @Group_Name, @WR_CODE, @BRN_CODE, @MENU_DOCK, @SH_TOPMENU, 
          @SH_SIDEMENU, @POWER_USER, @DEF_LANG, @DEF_INVOICE, @DEF_FORM, 
          @DEF_SCREEN, @Employee_ACNO, @SALE_CASH_AC, @SALE_BANK_AC, @Payments
        )
      `);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("User Info Post Error:", err.message);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


// Get Next Invoice Number
app.get('/api/invoice/next', async (req, res) => {
  try {
    const pool = await getPool();

    // We now return 'AUTO' because the database handles generation on save
    res.json({ nextInvoice: 'AUTO' });
  } catch (error) {
    console.error("Failed to fetch next invoice:", error.message);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/sales/save', async (req, res) => {
  const {
    REC_NO: providedRecNo,
    ACCODE, ENAME, G_TOTAL, DISC_AMT,
    NET_AMOUNT, VAT_AMOUNT, VAT_NUMBER, ROWS, PAYMENT_METHOD,
    TAX_INCLUDED = true,
    CASH_PAID = 0,
    OTHER_PAID = 0,
    USERNAME,
    WR_CODE = 1,
    CURRENCY,
    CURRENCY_RATE
  } = req.body;

  const trnType = PAYMENT_METHOD === 'Cash' ? 6 : 7;
  const isUpdate = !!providedRecNo;

  try {
    console.log(`💾 ${isUpdate ? 'Updating' : 'Starting'} sale save for ${ENAME || 'Walk-in Customer'}...`);
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
      let REC_NO, INVOICE_NO;

      if (isUpdate) {
        REC_NO = providedRecNo;
        // 1. Update Header
        const headerRequest = new sql.Request(transaction);
        const headerResult = await headerRequest
          .input('recNo', sql.Numeric(18, 0), REC_NO)
          .input('accode', sql.VarChar, String(ACCODE || '011'))
          .input('ename', sql.VarChar, String(ENAME || ''))
          .input('gTotal', sql.Decimal(18, 2), G_TOTAL || 0)
          .input('discAmt', sql.Decimal(18, 2), DISC_AMT || 0)
          .input('netAmount', sql.Decimal(18, 2), NET_AMOUNT || 0)
          .input('vatAmount', sql.Decimal(18, 2), VAT_AMOUNT || 0)
          .input('cashPaid', sql.Decimal(18, 2), CASH_PAID || 0)
          .input('otherPaid', sql.Decimal(18, 2), OTHER_PAID || 0)
          .input('cashAcc', sql.VarChar, String(cashAcc || ''))
          .input('wrCode', sql.SmallInt, Number(WR_CODE))
          .input('currency', sql.Int, CURRENCY || 1)
          .query(`
            UPDATE dbo.DATA_ENTRY_WEB SET
              ACCODE = @accode, ENAME = @ename, G_TOTAL = @gTotal, DISC_AMT = @discAmt,
              NET_AMOUNT = @netAmount, VAT_AMOUNT = @vatAmount, CASH_PAID = @cashPaid,
              OTHER_PAID = @otherPaid, CASH_ACC = @cashAcc, WR_CODE = @wrCode,
              CURRENCY = @currency
            WHERE REC_NO = @recNo;

            SELECT INVOICE_NO, REC_NO FROM dbo.DATA_ENTRY_WEB WHERE REC_NO = @recNo;
          `);
        
        if (!headerResult.recordset || headerResult.recordset.length === 0) {
          throw new Error('Could not find the record to update.');
        }
        INVOICE_NO = headerResult.recordset[0].INVOICE_NO;

        // 2. Delete Existing Items
        const deleteRequest = new sql.Request(transaction);
        await deleteRequest
          .input('recNo', sql.Numeric(18, 0), REC_NO)
          .query('DELETE FROM dbo.GRID_ITEM WHERE REC_NO = @recNo');

      } else {
        // 1. Header Insertion
        const headerRequest = new sql.Request(transaction);
        const headerResult = await headerRequest
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
          .input('currency', sql.Int, CURRENCY || 1)
          .query(`
              INSERT INTO dbo.DATA_ENTRY_WEB (
                ACCODE, ENAME, G_TOTAL, DISC_AMT, NET_AMOUNT, VAT_AMOUNT,
                CASH_PAID, OTHER_PAID, CASH_ACC,
                BRN_CODE, TRN_TYPE, ORG_DUP, WR_CODE, CURDATE,
                CURRENCY
              )
              VALUES (
                @accode, @ename, @gTotal, @discAmt, @netAmount, @vatAmount,
                @cashPaid, @otherPaid, @cashAcc,
                @brnCode, @trnType, @orgDup, @wrCode, GETDATE(),
                @currency
              );

              DECLARE @NewRecNo INT = SCOPE_IDENTITY();
              
              -- Fetch the row again to get the INVOICE_NO generated by the trigger
              SELECT INVOICE_NO, REC_NO 
              FROM dbo.DATA_ENTRY_WEB 
              WHERE REC_NO = @NewRecNo;
            `);

        if (!headerResult.recordset || headerResult.recordset.length === 0) {
          throw new Error('Database failed to return generated values after header insertion.');
        }

        REC_NO = headerResult.recordset[0].REC_NO;
        INVOICE_NO = headerResult.recordset[0].INVOICE_NO;
      }

      console.log(`✅ Header ${isUpdate ? 'updated' : 'saved'}. REC_NO: ${REC_NO}, Invoice No: ${INVOICE_NO}`);

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
            .input('unit', sql.VarChar, String(row.unit_name || row.unit || 'Pcs'))
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
      console.log(`🎉 Sale ${isUpdate ? 'updated' : 'saved'} successfully: Invoice #${INVOICE_NO}`);
      res.json({ success: true, message: `Sale ${isUpdate ? 'updated' : 'saved'} successfully`, REC_NO, INVOICE_NO });

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
        D.REC_NO,
        D.INVOICE_NO, 
        D.ACCODE, 
        D.ENAME, 
        D.G_TOTAL, 
        D.NET_AMOUNT, 
        D.VAT_AMOUNT,
        D.DISC_AMT,
        D.TRN_TYPE,
        D.CURDATE,
        D.CASH_PAID,
        D.OTHER_PAID,
        C.Currency_code AS CURRENCY_CODE
      FROM dbo.DATA_ENTRY_WEB D
      LEFT JOIN dbo.CURRENCY_MASTER C ON D.CURRENCY = C.Currency_No
      ORDER BY D.CURDATE DESC
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
