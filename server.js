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
  const { level = 4 } = req.query;
  try {
    const pool = await getPool();
    const query = level === '0'
      ? `SELECT ACC_NO, ACC_NAME, ACC_CLASS, LEVEL2_NO, LEVEL3_NO, ACC_LEVEL, OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT FROM dbo.ACCOUNTS ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO`
      : `SELECT ACC_NO, ACC_NAME, ACC_CLASS, LEVEL2_NO, LEVEL3_NO, ACC_LEVEL, OB_DR_AMOUNT, OB_CR_AMOUNT, CB_DR_AMOUNT, CB_CR_AMOUNT FROM dbo.ACCOUNTS WHERE ACC_LEVEL = @level ORDER BY ISNULL(LEVEL1_NO, 9), ISNULL(LEVEL2_NO, 9), ISNULL(LEVEL3_NO, 9), ACC_NO`;

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
    accName, accClass, accLevel, 
    accAName = '', groupAc = '', prefexNo = '', 
    level1, level2, level3, 
    isPermanent = 0, accCode = ''
  } = req.body;

  if (!accName) {
    return res.status(400).json({ error: 'Account Name is required.' });
  }

  try {
    const pool = await getPool();

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

    const insertQuery = `
        INSERT INTO dbo.ACCOUNTS (
          ACC_NO, ACC_NAME, ACC_ANAME, ACC_CLASS, ACC_LEVEL, 
          GROUP_AC, PREFEX_NO, LEVEL1_NO, LEVEL2_NO, LEVEL3_NO, 
          ISPERMENENT, ACC_CODE, ACC_TYPE_CODE, CREATE_TIME
        )
        VALUES (
          @accNo, @accName, @accAName, @accClass, @accLevel, 
          @groupAc, @prefexNo, @level1, @level2, @level3, 
          @isPermanent, @accCode, 1, GETDATE()
        )
    `;

    await pool.request()
      .input('accNo', sql.Numeric(18, 0), nextAccNo)
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
      .query(insertQuery);

    console.log(`✅ Chart of Account Created Auto-ID: ${accName} (${nextAccNo})`);
    res.json({ success: true, message: 'Account created successfully', accNo: nextAccNo });
  } catch (error) {
    console.error("❌ SQL ERROR DURING ACCOUNT CREATE:");
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
            .input('headerId', sql.Numeric(18,0), headerId)
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
      SELECT cus_ac_type FROM dbo.ac_options
    `);
    
    if (result.recordset[0] && result.recordset[0].cus_ac_type) {
        const cusTypeId = result.recordset[0].cus_ac_type;
        console.log('✅ CUSTOMER POLICY RESOLVED:', { cus_ac_type: cusTypeId });
        res.json({ cus_ac_type: cusTypeId });
    } else {
        console.log('⚠️ CUSTOMER POLICY NOT FOUND IN AC_OPTIONS');
        res.json({ cus_ac_type: null });
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
          ACC_NO, ACC_NAME, ACC_ANAME, ACC_TELE_NO, ACC_MOBILE_NO, ACC_FAX_NO, ACC_ADDRESS, 
          CREDIT_LIMIT, CONTACT_PERSON, ID_NUMBER, FLAG, EMAIL, SEND_SMS, IBAN_NO, BANK_DET, 
          VAT_Tinno, CREDIT_DAYS, building_no, city_subdivision_name, street_name, Schema_no, 
          city_name, city_aname, postal_zone, regsitered_name, LEDGER_ACC, IS_PERMINENT,
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

// Save Customer Info
app.post('/api/customers/:accNo/info', async (req, res) => {
  const { accNo } = req.params;
  const data = req.body;
  if (!accNo || !data) return res.status(400).json({ error: 'Missing logic' });

  try {
    const pool = await getPool();
    
    // Check if exists
    const checkEx = await pool.request()
      .input('accNo', sql.VarChar, accNo)
      .query(`SELECT ACC_NO FROM dbo.ACCOUNTS_INFO WHERE ACC_NO = @accNo`);
      
    const reqPool = pool.request()
      .input('accNo', sql.VarChar, accNo)
      .input('ACC_NAME', sql.NVarChar, data.ACC_NAME || '')
      .input('ACC_ANAME', sql.NVarChar, data.ACC_ANAME || '')
      .input('ACC_TELE_NO', sql.VarChar, data.ACC_TELE_NO || '')
      .input('ACC_MOBILE_NO', sql.VarChar, data.ACC_MOBILE_NO || '')
      .input('ACC_FAX_NO', sql.VarChar, data.ACC_FAX_NO || '')
      .input('ACC_ADDRESS', sql.NVarChar, data.ACC_ADDRESS || '')
      .input('CREDIT_LIMIT', sql.Float, data.CREDIT_LIMIT || 0)
      .input('CONTACT_PERSON', sql.NVarChar, data.CONTACT_PERSON || '')
      .input('ID_NUMBER', sql.VarChar, data.ID_NUMBER || '')
      .input('FLAG', sql.VarChar, data.FLAG || 'A')
      .input('EMAIL', sql.VarChar, data.EMAIL || '')
      .input('SEND_SMS', sql.Bit, data.SEND_SMS ? 1 : 0)
      .input('IBAN_NO', sql.VarChar, data.IBAN_NO || '')
      .input('BANK_DET', sql.NVarChar, data.BANK_DET || '')
      .input('VAT_Tinno', sql.VarChar, data.VAT_Tinno || '')
      .input('CREDIT_DAYS', sql.Int, data.CREDIT_DAYS || 0)
      .input('building_no', sql.VarChar, data.building_no || '')
      .input('city_subdivision_name', sql.NVarChar, data.city_subdivision_name || '')
      .input('street_name', sql.NVarChar, data.street_name || '')
      .input('Schema_no', sql.VarChar, data.Schema_no || '')
      .input('city_name', sql.NVarChar, data.city_name || '')
      .input('city_aname', sql.NVarChar, data.city_aname || '')
      .input('postal_zone', sql.VarChar, data.postal_zone || '')
      .input('regsitered_name', sql.NVarChar, data.regsitered_name || '')
      .input('LEDGER_ACC', sql.VarChar, data.LEDGER_ACC || '')
      .input('IS_PERMINENT', sql.Bit, data.IS_PERMINENT ? 1 : 0);

    if (checkEx.recordset.length > 0) {
      // UPDATE
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
          LEDGER_ACC = @LEDGER_ACC, IS_PERMINENT = @IS_PERMINENT
        WHERE ACC_NO = @accNo
      `);
    } else {
      // INSERT
      await reqPool.query(`
        INSERT INTO dbo.ACCOUNTS_INFO (
          ACC_NO, ACC_NAME, ACC_ANAME, ACC_TELE_NO, ACC_MOBILE_NO, ACC_FAX_NO, ACC_ADDRESS, 
          CREDIT_LIMIT, CONTACT_PERSON, ID_NUMBER, FLAG, EMAIL, SEND_SMS, IBAN_NO, BANK_DET, 
          VAT_Tinno, CREDIT_DAYS, building_no, city_subdivision_name, street_name, Schema_no, 
          city_name, city_aname, postal_zone, regsitered_name, LEDGER_ACC, IS_PERMINENT
        ) VALUES (
          @accNo, @ACC_NAME, @ACC_ANAME, @ACC_TELE_NO, @ACC_MOBILE_NO, @ACC_FAX_NO, @ACC_ADDRESS, 
          @CREDIT_LIMIT, @CONTACT_PERSON, @ID_NUMBER, @FLAG, @EMAIL, @SEND_SMS, @IBAN_NO, @BANK_DET, 
          @VAT_Tinno, @CREDIT_DAYS, @building_no, @city_subdivision_name, @street_name, @Schema_no, 
          @city_name, @city_aname, @postal_zone, @regsitered_name, @LEDGER_ACC, @IS_PERMINENT
        )
      `);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Save Customer Error:", err);
    res.status(500).json({ error: 'Database save error' });
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
    ACCODE, ENAME, G_TOTAL, DISC_AMT,
    NET_AMOUNT, VAT_AMOUNT, VAT_NUMBER, ROWS, PAYMENT_METHOD,
    TAX_INCLUDED = true,
    CASH_PAID = 0,
    OTHER_PAID = 0,
    USERNAME,
    WR_CODE = 1
  } = req.body;

  const trnType = PAYMENT_METHOD === 'Cash' ? 6 : 7;

  try {
    console.log(`💾 Starting sale save for ${ENAME || 'Walk-in Customer'}...`);
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
              ACCODE, ENAME, G_TOTAL, DISC_AMT, NET_AMOUNT, VAT_AMOUNT,
              CASH_PAID, OTHER_PAID, CASH_ACC,
              BRN_CODE, TRN_TYPE, ORG_DUP, WR_CODE, CURDATE
            )
            VALUES (
              @accode, @ename, @gTotal, @discAmt, @netAmount, @vatAmount,
              @cashPaid, @otherPaid, @cashAcc,
              @brnCode, @trnType, @orgDup, @wrCode, GETDATE()
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

      const { REC_NO, INVOICE_NO } = headerResult.recordset[0];
      console.log(`✅ Header saved. REC_NO: ${REC_NO}, Generated Invoice No: ${INVOICE_NO}`);

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
      res.json({ success: true, message: 'Sale saved successfully', REC_NO, INVOICE_NO });

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
