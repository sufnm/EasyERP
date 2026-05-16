import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execFile } from 'child_process';
import { PDFParse } from 'pdf-parse';
import { sql, getPool } from './db.js';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Serve static files from the React app (Production)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    console.log(`📂 Request: ${req.method} ${req.path}`);
  }
  next();
});
app.use(express.static(path.join(__dirname, 'dist')));



// --- LANGUAGE MIDDLEWARE ---
app.use((req, res, next) => {
  const lang = req.headers['accept-language'] || 'en';
  req.lang = lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  // console.log(`🌐 Language detected: ${req.lang} (from header: ${lang})`);
  next();
});

// Helper to get language-specific name column with fallback
const getLangCol = (colName, lang) => {
  if (lang === 'ar') {
    // Only attempt _ANAME replacement for known columns that have it (like account names)
    if (colName.toUpperCase().includes('ACC_NAME')) {
      const aCol = colName.toUpperCase().replace('_NAME', '_ANAME');
      return `COALESCE(${aCol}, ${colName})`;
    }
    // For other columns, fallback to English if unsure
    return colName;
  }
  return colName;
};

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

  console.log(`🔐 Checking privileges for user: "${username}" on TRN_TYPE: ${trnCode}`);
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
        FROM [dbo].[UserPriv_Web] P
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

app.post('/api/scan-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  try {
    console.log(`📄 Received PDF for scanning: ${req.file.originalname} (${req.file.size} bytes)`);
    const dataBuffer = req.file.buffer;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here' || !apiKey.trim()) {
      console.error('❌ Gemini API Key is missing or invalid in .env');
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    console.log('🤖 Sending PDF directly to Gemini AI for OCR and parsing...');
    const prompt = `
      Extract quotation details from the attached PDF and return ONLY a valid JSON object.
      The JSON should have this structure:
      {
        "customer": { "name": "Name", "vatNumber": "VAT" },
        "items": [
          { "description": "Item Name", "qty": 1, "unit": "Pcs", "price": 100, "vatPercent": 15 }
        ]
      }

      Return ONLY the JSON. No conversational text.
    `;

    let result;
    try {
      result = await model.generateContent([
        {
          inlineData: {
            data: dataBuffer.toString('base64'),
            mimeType: "application/pdf"
          }
        },
        { text: prompt }
      ]);
    } catch (apiError) {
      console.error('❌ Gemini API Error:', apiError);
      return res.status(500).json({ error: 'AI Processing failed: ' + apiError.message });
    }

    const response = await result.response;
    let jsonText = response.text();
    
    console.log('📩 Gemini response received.');
    
    // Clean up potential markdown formatting in response
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
      try {
      const data = JSON.parse(jsonText);
      const pool = await getPool();

      // --- MATCH CUSTOMER ---
      if (data.customer) {
        const cleanCustName = (data.customer.name || '').trim();
        const custVat = (data.customer.vatNumber || '').trim();
        
        console.log(`👤 Searching for customer match: "${cleanCustName}" (VAT: ${custVat})`);
        
        try {
          // Search by name or VAT_Tinno in ACCOUNTS_INFO (Searching all account types for maximum matching)
          let custQuery = `
            SELECT TOP 1 ACC_NO as accNo, ACC_NAME as officialName, VAT_Tinno as vatNumber
            FROM dbo.ACCOUNTS_INFO
            WHERE (ACC_NAME = @name OR ACC_ANAME = @name)
          `;
          const custReq = pool.request().input('name', sql.VarChar, cleanCustName);
          
          if (custVat) {
            custQuery += ` OR VAT_Tinno = @vat`;
            custReq.input('vat', sql.VarChar, custVat);
          }
          
          const custRes = await custReq.query(custQuery);
          
          if (custRes.recordset.length > 0) {
            const matchedCust = custRes.recordset[0];
            console.log(`✅ Matched Customer: ${matchedCust.officialName} (${matchedCust.accNo})`);
            data.customer.accNo = String(matchedCust.accNo);
            data.customer.officialName = matchedCust.officialName;
            data.customer.vatNumber = matchedCust.vatNumber || data.customer.vatNumber;
          }
        } catch (custError) {
          console.error('Error matching customer:', custError.message);
        }
      }

      // --- MATCH ITEMS ---
      if (data.items && Array.isArray(data.items)) {
        console.log(`🔍 Matching ${data.items.length} items against database...`);
        
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const cleanDesc = (item.description || '').trim();
          const cleanCode = (item.itemCode || '').trim();
          
          console.log(`🔎 Searching for item match: "${cleanDesc}" / Code: "${cleanCode}"`);
          try {
            const searchResult = await pool.request()
              .input('desc', sql.VarChar, cleanDesc)
              .input('code', sql.VarChar, cleanCode)
              .query(`
                SELECT TOP 1 
                  B.BARCODE as itemCode, 
                  H.DESCRIPTION as description, 
                  B.UNIT as unit,
                  ISNULL(S.SALE_PRICE, B.SALE_PRICE) as price,
                  ISNULL(H.VAT_PERCENT, 0) as vatPercent
                FROM dbo.HD_ITEMMASTER H
                LEFT JOIN dbo.BARCODE B ON H.ITEM_CODE = B.ITEM_CODE
                LEFT JOIN dbo.STOCK_MASTER S ON H.ITEM_CODE = S.ITEM_CODE
                WHERE H.DESCRIPTION = @desc 
                OR H.ITEM_CODE = @desc 
                OR B.BARCODE = @desc
                OR (LEN(@code) > 0 AND (B.BARCODE = @code OR H.ITEM_CODE = @code))
              `);
            
            if (searchResult.recordset.length > 0) {
              const matched = searchResult.recordset[0];
              console.log(`✅ Matched Item "${item.description}" -> ${matched.itemCode}`);
              data.items[i].itemCode = matched.itemCode;
              data.items[i].officialDescription = matched.description;
              data.items[i].unit = matched.unit || item.unit;
              data.items[i].vatPercent = matched.vatPercent;
              // We keep the scanned price but can flag it if it differs significantly
              // data.items[i].dbPrice = matched.price; 
            } else {
              console.log(`❓ No match for "${item.description}", using 999`);
              data.items[i].itemCode = '999';
            }
          } catch (itemError) {
            console.error('Error matching item:', itemError.message);
            data.items[i].itemCode = '999';
          }
        }
      }
      
      res.json(data);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.log('Original Text:', jsonText);
      res.status(500).json({ error: 'Failed to parse AI response' });
    }
  } catch (error) {
    console.error('❌ PDF Scan error:', error);
    res.status(500).json({ error: 'Failed to scan PDF', details: error.message });
  }
});


// Dashboard Statistics Endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const pool = await getPool();
    
    // 1. Total Sales Today (TRN_TYPE 6 & 7)
    const salesToday = await pool.request().query(`
      SELECT ISNULL(SUM(NET_AMOUNT), 0) as total
      FROM dbo.DATA_ENTRY_WEB
      WHERE CONVERT(DATE, CURDATE) = CONVERT(DATE, GETDATE())
      AND TRN_TYPE IN (6, 7)
    `);

    // 2. Pending Invoices (Sales Only - TRN_TYPE 6 & 7)
    const pendingInvoices = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM dbo.DATA_ENTRY_WEB
      WHERE TRN_TYPE IN (6, 7)
      AND (NET_AMOUNT - (CASH_PAID + OTHER_PAID) > 0.01)
    `);

    // 3. Active Customers (ACC_TYPE 1)
    const activeCustomers = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM dbo.ACCOUNTS_INFO
      WHERE ACC_TYPE = 1
    `);

    console.log(`📊 Dashboard Stats: Sales Today=${salesToday.recordset[0].total}, Pending=${pendingInvoices.recordset[0].count}, Customers=${activeCustomers.recordset[0].count}`);
    
    res.json({
      totalSalesToday: salesToday.recordset[0].total,
      pendingInvoices: pendingInvoices.recordset[0].count,
      activeCustomers: activeCustomers.recordset[0].count,
      growth: '+0%' // Placeholder for now
    });

  } catch (error) {
    console.error("Dashboard stats failed:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});


// Dashboard Sales History (for Chart)
app.get('/api/dashboard/sales-history', async (req, res) => {
  try {
    const pool = await getPool();
    const period = req.query.period || 'daily';
    let result;
    const history = [];

    if (period === 'monthly') {
      result = await pool.request().query(`
        SELECT 
          CONVERT(VARCHAR(7), CURDATE, 126) as date,
          ISNULL(SUM(NET_AMOUNT), 0) as totalSales
        FROM dbo.DATA_ENTRY_WEB
        WHERE CURDATE >= DATEADD(month, -11, GETDATE())
        AND TRN_TYPE IN (6, 7)
        GROUP BY CONVERT(VARCHAR(7), CURDATE, 126)
        ORDER BY date ASC
      `);

      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        const match = result.recordset.find(r => r.date === monthStr);
        history.push({
          name: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
          sales: match ? match.totalSales : 0
        });
      }
    } else {
      // Default: Daily (7 days)
      result = await pool.request().query(`
        SELECT 
          CAST(CURDATE AS DATE) as date,
          ISNULL(SUM(NET_AMOUNT), 0) as totalSales
        FROM dbo.DATA_ENTRY_WEB
        WHERE CURDATE >= DATEADD(day, -6, GETDATE())
        AND TRN_TYPE IN (6, 7)
        GROUP BY CAST(CURDATE AS DATE)
        ORDER BY date ASC
      `);

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.getFullYear() + '-' + 
                        String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(d.getDate()).padStart(2, '0');
        
        const match = result.recordset.find(r => {
          const rDate = r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
          return rDate === dateStr;
        });
        history.push({
          name: `${d.getDate()}/${d.getMonth() + 1} (${d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()})`,
          sales: match ? match.totalSales : 0
        });
      }
    }

    res.json(history);
  } catch (error) {
    console.error("Dashboard history failed:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});


// Test connection endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});


// Endpoint to search items with comprehensive data for Sales & Purchase
app.get('/api/items/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 20 
          H.ITEM_CODE, 
          H.DESCRIPTION, 
          B.BARCODE,
          B.UNIT,
          ISNULL(H.VAT_PERCENT, 0) as VAT_PERCENT,
          ISNULL(S.AVG_PUR_PRICE, 0) as AVG_PUR_PRICE,
          ISNULL(S.SALE_PRICE, B.SALE_PRICE) as SALE_PRICE,
          ISNULL(S.RETAIL_PRICE, 0) as RETAIL_PRICE
        FROM dbo.HD_ITEMMASTER H
        LEFT JOIN dbo.BARCODE B ON H.ITEM_CODE = B.ITEM_CODE
        LEFT JOIN dbo.STOCK_MASTER S ON H.ITEM_CODE = S.ITEM_CODE
        WHERE H.ITEM_CODE LIKE @query OR H.DESCRIPTION LIKE @query OR B.BARCODE LIKE @query
      `);

    console.log(`🔍 Item Search: Query "${q}" returned ${result.recordset.length} results`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Item search failed:", error);
    res.status(500).json({ error: 'Database search error', details: error.message });
  }
});

// Cache endpoint for items
app.get('/api/items/cache', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        H.ITEM_CODE, 
        H.DESCRIPTION, 
        B.BARCODE,
        B.UNIT,
        ISNULL(H.VAT_PERCENT, 0) as VAT_PERCENT,
        ISNULL(S.AVG_PUR_PRICE, 0) as AVG_PUR_PRICE,
        ISNULL(S.SALE_PRICE, B.SALE_PRICE) as SALE_PRICE,
        ISNULL(S.RETAIL_PRICE, 0) as RETAIL_PRICE
      FROM dbo.HD_ITEMMASTER H
      LEFT JOIN dbo.BARCODE B ON H.ITEM_CODE = B.ITEM_CODE
      LEFT JOIN dbo.STOCK_MASTER S ON H.ITEM_CODE = S.ITEM_CODE
    `);
    console.log(`📦 Item Cache: Loaded ${result.recordset.length} items.`);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch items cache:", error);
    res.status(500).json({ error: 'Failed to fetch items for cache' });
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

app.get(['/api/receivable/currencies', '/api/currencies/list'], async (req, res) => {
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
    const nameCol = getLangCol('ACC_NAME', req.lang);
    const result = await pool.request().query(`
      SELECT ACC_NO, ${nameCol} AS ACC_NAME 
      FROM dbo.ACCOUNTS 
      WHERE ACC_LEVEL = 4 
      AND LEVEL3_NO = (SELECT CASH_AC_TYPE FROM dbo.AC_OPTIONS WHERE ID = 1)
      ORDER BY ACC_NAME
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
      SELECT [COST_CODE] AS CC_CODE, [COST_NAME] AS CC_NAME 
      FROM [COST_MASTER]
      ORDER BY COST_NAME
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
    const nameCol = getLangCol('ACC_NAME', req.lang);
    const result = await pool.request().query(`
      SELECT ACC_NO, ${nameCol} AS ACC_NAME
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
        ID, 
        ENTRY_DATE, 
        DOC_NO, 
        ACC_NAME1 AS [FROM ACC], 
        ACC_NAME2 AS TO_ACC, 
        PAY_AMOUNT, 
        DESCRIPTION, 
        RETURN_INVOICE,
        Currency_no AS CURRENCY,
        Currency_rate AS CURRENCY_RATE,
        COST_CENTER,
        BRN_CODE,
        REF_NO,
        PAY_FROM_ACC,
        PAY_TO_ACC
      FROM dbo.TRN_ENTRY 
      WHERE TRN_TYPE = 100 
      ORDER BY ID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch receivable history:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/receivable/save', async (req, res) => {
  const data = req.body;
  console.log('🔍 DEBUG: Receivable Save Payload:', JSON.stringify(data, null, 2));
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('ID', sql.Numeric(18, 0), data.ID || null);
    request.input('ENTRY_DATE', sql.DateTime, new Date(data.ENTRY_DATE));
    request.input('DOC_NO', sql.VarChar(50), String(data.DOC_NO));
    request.input('DOC_TRN_TYPE', sql.Int, data.DOC_TRN_TYPE || 6);
    request.input('TRN_TYPE', sql.Int, 100);
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), data.PAY_FROM_ACC);
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), data.PAY_TO_ACC);
    request.input('TRN_NO', sql.Numeric(18, 0), null);
    request.input('TRN_NO2', sql.Numeric(18, 0), null);
    request.input('DESCRIPTION', sql.NVarChar(300), data.DESCRIPTION || '');
    request.input('PAY_AMOUNT', sql.Real, data.PAY_AMOUNT);
    request.input('CURRENCY_NO', sql.Int, data.CURRENCY || 1);
    request.input('CURRENCY_RATE', sql.Real, data.CURRENCY_RATE || data.CRATE || 1);
    request.input('RETURN_INVOICE', sql.Bit, data.RETURN_INVOICE ? 1 : 0);
    request.input('USER_ID', sql.Int, data.USER_ID || 1);
    request.input('REF_NO', sql.VarChar(50), data.REF_NO || '');
    request.input('cost_center', sql.Int, data.COST_CENTER && !isNaN(Number(data.COST_CENTER)) ? Number(data.COST_CENTER) : null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);
    request.input('ACC_NAME1', sql.NVarChar(200), data.ACC_NAME1 || 'N/A');
    request.input('ACC_NAME2', sql.NVarChar(200), data.ACC_NAME2 || 'N/A');

    console.log('📡 Executing SP_TRN_ENTRY_SAVE for Receivable...');
    const result = await request.execute('dbo.SP_TRN_ENTRY_SAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID || result.recordset[0]?.ID;
    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save receivable entry:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// --- PAYABLE ENDPOINTS ---

app.get('/api/payable/invoices', async (req, res) => {
  try {
    const pool = await getPool();
    const isReturn = req.query.returnInvoice === 'true';
    const trnTypes = isReturn ? '8,9' : '1,2';
    const result = await pool.request().query(`
      SELECT CURDATE, ENAME, ACCODE, INVOICE_NO, NET_AMOUNT, CASH_PAID, OTHER_PAID, BALANCE_AMT, TRN_TYPE, CURRENCY
      FROM DATA_ENTRY 
      WHERE trn_type IN (${trnTypes}) AND net_amount - (CASH_PAID + OTHER_PAID) > 0;
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch payable invoices:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/payable/history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ID, 
        ENTRY_DATE, 
        DOC_NO, 
        ACC_NAME1 AS [TO ACC], 
        ACC_NAME2 AS FROM_ACC, 
        PAY_AMOUNT, 
        DESCRIPTION, 
        RETURN_INVOICE,
        Currency_no AS CURRENCY,
        Currency_rate AS CURRENCY_RATE,
        COST_CENTER,
        BRN_CODE,
        REF_NO,
        PAY_FROM_ACC,
        PAY_TO_ACC
      FROM dbo.TRN_ENTRY 
      WHERE TRN_TYPE = 200 
      ORDER BY ID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch payable history:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/payable/save', async (req, res) => {
  const data = req.body;
  console.log('🔍 DEBUG: Payable Save Payload:', JSON.stringify(data, null, 2));
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('ID', sql.Numeric(18, 0), data.ID || null);
    request.input('ENTRY_DATE', sql.DateTime, new Date(data.ENTRY_DATE));
    request.input('DOC_NO', sql.VarChar(50), String(data.DOC_NO));
    request.input('DOC_TRN_TYPE', sql.Int, data.DOC_TRN_TYPE || 7);
    request.input('TRN_TYPE', sql.Int, 200);
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), data.PAY_FROM_ACC);
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), data.PAY_TO_ACC);
    request.input('TRN_NO', sql.Numeric(18, 0), null);
    request.input('TRN_NO2', sql.Numeric(18, 0), null);
    request.input('DESCRIPTION', sql.NVarChar(300), data.DESCRIPTION || '');
    request.input('PAY_AMOUNT', sql.Real, data.PAY_AMOUNT);
    request.input('CURRENCY_NO', sql.Int, data.CURRENCY || 1);
    request.input('CURRENCY_RATE', sql.Real, data.CURRENCY_RATE || data.CRATE || 1);
    request.input('RETURN_INVOICE', sql.Bit, data.RETURN_INVOICE ? 1 : 0);
    request.input('USER_ID', sql.Int, data.USER_ID || 1);
    request.input('REF_NO', sql.VarChar(50), data.REF_NO || '');
    request.input('cost_center', sql.Int, data.COST_CENTER && !isNaN(Number(data.COST_CENTER)) ? Number(data.COST_CENTER) : null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);
    request.input('ACC_NAME1', sql.NVarChar(200), data.ACC_NAME1 || 'N/A');
    request.input('ACC_NAME2', sql.NVarChar(200), data.ACC_NAME2 || 'N/A');

    console.log('📡 Executing SP_TRN_ENTRY_SAVE for Payable...');
    const result = await request.execute('dbo.SP_TRN_ENTRY_SAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID || result.recordset[0]?.ID;
    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save payable entry:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// --- GENERAL VOUCHER ENDPOINTS ---

app.get('/api/general-voucher/types', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, type_name, type_aname FROM dbo.gl_voucher_type
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch voucher types:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/general-voucher/accounts', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT acc_no, acc_name, acc_aname FROM dbo.accounts WHERE acc_level = 4
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch general accounts:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/general-voucher/history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ID, 
        ENTRY_DATE, 
        DOC_NO, 
        ACC_NAME1 AS [TO ACC], 
        ACC_NAME2 AS FROM_ACC, 
        PAY_AMOUNT, 
        DESCRIPTION, 
        RETURN_INVOICE,
        Currency_no AS CURRENCY,
        Currency_rate AS CURRENCY_RATE,
        COST_CENTER,
        BRN_CODE,
        REF_NO,
        PAY_FROM_ACC,
        PAY_TO_ACC,
        DOC_TRN_TYPE
      FROM dbo.TRN_ENTRY 
      WHERE TRN_TYPE = 101 
      ORDER BY ID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch general voucher history:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/general-voucher/save', async (req, res) => {
  const data = req.body;
  console.log('🔍 DEBUG: General Voucher Save Payload:', JSON.stringify(data, null, 2));
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('ID', sql.Numeric(18, 0), data.ID || null);
    request.input('ENTRY_DATE', sql.DateTime, new Date(data.ENTRY_DATE));
    request.input('DOC_NO', sql.VarChar(50), String(data.DOC_NO));
    request.input('DOC_TRN_TYPE', sql.Int, data.DOC_TRN_TYPE || 1);
    request.input('TRN_TYPE', sql.Int, 101);
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), data.PAY_FROM_ACC);
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), data.PAY_TO_ACC);
    request.input('TRN_NO', sql.Numeric(18, 0), null);
    request.input('TRN_NO2', sql.Numeric(18, 0), null);
    request.input('DESCRIPTION', sql.NVarChar(300), data.DESCRIPTION || '');
    request.input('PAY_AMOUNT', sql.Real, data.PAY_AMOUNT);
    request.input('CURRENCY_NO', sql.Int, data.CURRENCY || 1);
    request.input('CURRENCY_RATE', sql.Real, data.CURRENCY_RATE || data.CRATE || 1);
    request.input('RETURN_INVOICE', sql.Bit, data.RETURN_INVOICE ? 1 : 0);
    request.input('USER_ID', sql.Int, data.USER_ID || 1);
    request.input('REF_NO', sql.VarChar(50), data.REF_NO || '');
    request.input('cost_center', sql.Int, data.COST_CENTER && !isNaN(Number(data.COST_CENTER)) ? Number(data.COST_CENTER) : null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);
    request.input('ACC_NAME1', sql.NVarChar(200), data.ACC_NAME1 || 'N/A');
    request.input('ACC_NAME2', sql.NVarChar(200), data.ACC_NAME2 || 'N/A');

    console.log('📡 Executing SP_TRN_ENTRY_SAVE for General Voucher...');
    const result = await request.execute('dbo.SP_TRN_ENTRY_SAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID || result.recordset[0]?.ID;
    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save general voucher entry:", error);
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
    const nameCol = req.lang === 'ar' ? 'ACC_ANAME' : 'ACC_NAME';
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT TOP 20 ACC_NO, ${nameCol} AS ACC_NAME FROM dbo.ACCOUNTS_INFO
        WHERE ACC_TYPE = 2 AND (ACC_NO LIKE @query OR ${nameCol} LIKE @query)
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

// Get Next Purchase Invoice Number
app.get('/api/purchases/next', async (req, res) => {
  res.json({ nextInvoice: 'AUTO' });
});

// Save Purchase
app.post('/api/purchases/save', async (req, res) => {
  const {
    REC_NO: providedRecNo,
    ACCODE, ENAME, G_TOTAL, DISC_AMT,
    NET_AMOUNT, VAT_AMOUNT, VAT_NUMBER, ROWS, PAYMENT_METHOD,
    TAX_INCLUDED = true,
    CASH_PAID = 0,
    OTHER_PAID = 0,
    TAXABLE_AMOUNT = 0,
    FRN_AMOUNT = 0,
    USERNAME,
    WR_CODE = 1,
    CURRENCY,
    CURRENCY_RATE,
    TRN_TYPE,
    REF_INV_NO,
    ADDRESS
  } = req.body;

  const trnType = (req.body.TRN_TYPE !== undefined && req.body.TRN_TYPE !== null)
    ? req.body.TRN_TYPE
    : (PAYMENT_METHOD === 'Cash' ? 1 : 2);

  console.log('🔍 DEBUG: Resolved Purchase trnType for DB:', trnType);
  const isUpdate = !!providedRecNo;

  try {
    console.log(`💾 ${isUpdate ? 'Updating' : 'Starting'} purchase save for ${ENAME || 'Walk-in Supplier'}...`);
    const pool = await getPool();

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
        const headerRequest = new sql.Request(transaction);
        const headerResult = await headerRequest
          .input('recNo', sql.Numeric(18, 0), REC_NO)
          .input('accode', sql.VarChar, String(ACCODE || ''))
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
          .input('trnType', sql.Int, trnType)
          .input('refNo', sql.VarChar, String(REF_INV_NO || ''))
          .input('vatNumber', sql.VarChar, String(VAT_NUMBER || ''))
          .input('taxableAmount', sql.Decimal(18, 2), TAXABLE_AMOUNT || 0)
          .input('frnAmount', sql.Decimal(18, 2), FRN_AMOUNT || 0)
          .input('crate', sql.Decimal(18, 4), CURRENCY_RATE || 1)
          .query(`
            UPDATE dbo.DATA_ENTRY_WEB SET
              ACCODE = @accode, ENAME = @ename, G_TOTAL = @gTotal, DISC_AMT = @discAmt,
              NET_AMOUNT = @netAmount, VAT_AMOUNT = @vatAmount, CASH_PAID = @cashPaid,
              OTHER_PAID = @otherPaid, CASH_ACC = @cashAcc, WR_CODE = @wrCode,
              CURRENCY = @currency, TRN_TYPE = @trnType, REF_NO = @refNo,
              VAT_NUMBER = @vatNumber, CRATE = @crate,
              TAXABLE_AMOUNT = @taxableAmount, FRN_AMOUNT = @frnAmount
            WHERE REC_NO = @recNo;

            SELECT INVOICE_NO, REC_NO FROM dbo.DATA_ENTRY_WEB WHERE REC_NO = @recNo;
          `);

        if (!headerResult.recordset || headerResult.recordset.length === 0) {
          throw new Error('Could not find the record to update.');
        }
        INVOICE_NO = headerResult.recordset[0].INVOICE_NO;

        const deleteRequest = new sql.Request(transaction);
        await deleteRequest
          .input('recNo', sql.Numeric(18, 0), REC_NO)
          .query('DELETE FROM dbo.GRID_ITEM WHERE REC_NO = @recNo');

      } else {
        const headerRequest = new sql.Request(transaction);
        const headerResult = await headerRequest
          .input('accode', sql.VarChar, String(ACCODE || ''))
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
          .input('refNo', sql.VarChar, String(REF_INV_NO || ''))
          .input('vatNumber', sql.VarChar, String(VAT_NUMBER || ''))
          .input('taxableAmount', sql.Decimal(18, 2), TAXABLE_AMOUNT || 0)
          .input('frnAmount', sql.Decimal(18, 2), FRN_AMOUNT || 0)
          .input('crate', sql.Decimal(18, 4), CURRENCY_RATE || 1)
          .query(`
              INSERT INTO dbo.DATA_ENTRY_WEB (
                ACCODE, ENAME, G_TOTAL, DISC_AMT, NET_AMOUNT, VAT_AMOUNT,
                CASH_PAID, OTHER_PAID, CASH_ACC,
                BRN_CODE, TRN_TYPE, ORG_DUP, WR_CODE, CURDATE,
                CURRENCY, REF_NO, VAT_NUMBER, CRATE,
                TAXABLE_AMOUNT, FRN_AMOUNT
              )
              VALUES (
                @accode, @ename, @gTotal, @discAmt, @netAmount, @vatAmount,
                @cashPaid, @otherPaid, @cashAcc,
                @brnCode, @trnType, @orgDup, @wrCode, GETDATE(),
                @currency, @refNo, @vatNumber, @crate,
                @taxableAmount, @frnAmount
              );

              DECLARE @NewRecNo INT = SCOPE_IDENTITY();
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

      if (ADDRESS && (ADDRESS.street || ADDRESS.city || ADDRESS.building)) {
        const addrRequest = new sql.Request(transaction);
        await addrRequest
          .input('accNo', sql.VarChar, String(ACCODE || ''))
          .input('trnType', sql.Int, trnType)
          .input('invoiceNo', sql.VarChar, String(INVOICE_NO))
          .input('accName', sql.VarChar, String(ENAME || ''))
          .input('street', sql.NVarChar, String(ADDRESS.street || ''))
          .input('building', sql.VarChar, String(ADDRESS.building || ''))
          .input('subdivision', sql.NVarChar, String(ADDRESS.district || ''))
          .input('city', sql.NVarChar, String(ADDRESS.city || ''))
          .input('postal', sql.VarChar, String(ADDRESS.pincode || ''))
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.CASH_ACC_INFO WHERE INVOICE_NO = @invoiceNo)
            BEGIN
              UPDATE dbo.CASH_ACC_INFO SET
                ACC_NO = @accNo, TRN_TYPE = @trnType, ACC_NAME = @accName,
                street_name = @street, building_no = @building,
                city_subdivision_name = @subdivision, city_name = @city,
                postal_zone = @postal, regsitered_name = @accName
              WHERE INVOICE_NO = @invoiceNo
            END
            ELSE
            BEGIN
              INSERT INTO dbo.CASH_ACC_INFO (
                ACC_NO, TRN_TYPE, INVOICE_NO, ACC_NAME,
                street_name, building_no, city_subdivision_name, city_name, postal_zone, regsitered_name
              ) VALUES (
                @accNo, @trnType, @invoiceNo, @accName,
                @street, @building, @subdivision, @city, @postal, @accName
              )
            END
          `);
      }

      if (ROWS && Array.isArray(ROWS)) {
        console.time('📝 Purchase Details Saving');
        let rowNum = 1;
        const detailRequest = new sql.Request(transaction);
        for (const row of ROWS) {
          if (!row.itemCode) continue;

          const unitPrice = Number(row.price) || 0;
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

          // Clear previous inputs to be safe when reusing request (though inputs are keyed, it's cleaner)
          // Note: In mssql, .input() replaces if already exists, so it's fine.
          await detailRequest
            .input(`recNo${rowNum}`, sql.Numeric(18, 0), REC_NO)
            .input(`rowNum${rowNum}`, sql.Int, rowNum)
            .input(`barcode${rowNum}`, sql.VarChar, String(row.itemCode || ''))
            .input(`qty${rowNum}`, sql.Decimal(18, 2), qty)
            .input(`price${rowNum}`, sql.Decimal(18, 2), unitPrice)
            .input(`unit${rowNum}`, sql.VarChar, String(row.unitId || row.unit || 'Pcs'))
            .input(`description${rowNum}`, sql.VarChar, String(row.description || ''))
            .input(`total${rowNum}`, sql.Decimal(18, 2), grossTotal)
            .input(`vatPercent${rowNum}`, sql.Decimal(18, 2), vatPercent)
            .input(`vatAmount${rowNum}`, sql.Decimal(18, 2), vatAmount)
            .input(`trnType${rowNum}`, sql.Int, trnType)
            .input(`invoiceNo${rowNum}`, sql.VarChar, String(INVOICE_NO))
            .input(`wrCode${rowNum}`, sql.SmallInt, Number(WR_CODE))
            .input(`salePrice${rowNum}`, sql.Decimal(18, 2), Number(row.salePrice || 0))
            .input(`retailPrice${rowNum}`, sql.Decimal(18, 2), Number(row.retailPrice || 0))
            .query(`
                INSERT INTO dbo.GRID_ITEM (
                  REC_NO, ROWNUM, BARCODE, QTY, price, UNIT, DESCRIPTION,
                  TOTAL, vat_percent, VAT_AMOUNT, TRN_TYPE, INVOICE_NO, WR_CODE
                )
                VALUES (
                  @recNo${rowNum}, @rowNum${rowNum}, @barcode${rowNum}, @qty${rowNum}, @price${rowNum}, @unit${rowNum}, @description${rowNum},
                  @total${rowNum}, @vatPercent${rowNum}, @vatAmount${rowNum}, @trnType${rowNum}, @invoiceNo${rowNum}, @wrCode${rowNum}
                );

                -- Update STOCK_MASTER prices
                UPDATE dbo.STOCK_MASTER 
                SET SALE_PRICE = @salePrice${rowNum}, 
                    RETAIL_PRICE = @retailPrice${rowNum}
                WHERE ITEM_CODE = @barcode${rowNum};
              `);
          rowNum++;
        }
        console.timeEnd('📝 Purchase Details Saving');
      }

      await transaction.commit();
      res.json({ success: true, message: `Purchase ${isUpdate ? 'updated' : 'saved'} successfully`, REC_NO, INVOICE_NO });
    } catch (err) {
      if (transaction) await transaction.rollback();
      throw err;
    }
  } catch (error) {
    res.status(500).json({ error: 'Database transaction failed', message: error.message });
  }
});

app.get('/api/purchases/history', async (req, res) => {
  const { q, trnType } = req.query;
  try {
    const pool = await getPool();
    let trnFilter = ' AND D.TRN_TYPE IN (1, 2, 8, 9) ';
    if (trnType) {
      const types = trnType.split(',').map(t => parseInt(t)).filter(t => !isNaN(t));
      if (types.length > 0) trnFilter = ` AND D.TRN_TYPE IN (${types.join(',')}) `;
    }

    let query = `
      SELECT TOP 100
        D.REC_NO, D.INVOICE_NO, D.ACCODE, D.ENAME, D.G_TOTAL, D.NET_AMOUNT, 
        D.VAT_AMOUNT, D.DISC_AMT, D.TRN_TYPE, D.CURDATE, D.CASH_PAID, 
        D.OTHER_PAID, D.VAT_NUMBER, D.REF_NO, D.CRATE, C.Currency_code AS CURRENCY_CODE
      FROM dbo.DATA_ENTRY_WEB D
      LEFT JOIN dbo.CURRENCY_MASTER C ON D.CURRENCY = C.Currency_No
      WHERE 1=1 ${trnFilter}
    `;

    const request = pool.request();
    if (q) {
      query += ` AND (D.INVOICE_NO LIKE @q OR D.ENAME LIKE @q OR D.ACCODE LIKE @q) `;
      request.input('q', sql.VarChar, `%${q}%`);
    }
    query += ` ORDER BY D.CURDATE DESC `;

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

app.get('/api/purchases/:recNo/items', async (req, res) => {
  const { recNo } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('recNo', sql.Numeric(18, 0), recNo)
      .query(`
        SELECT BARCODE, DESCRIPTION, UNIT, QTY, price, 
               vat_percent as VAT_PERCENT, VAT_AMOUNT, TOTAL as ITM_TOTAL
        FROM dbo.GRID_ITEM 
        WHERE REC_NO = @recNo 
        ORDER BY ROWNUM
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/suppliers/:accNo/info', async (req, res) => {
  const { accNo } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('accNo', sql.VarChar, accNo)
      .query(`SELECT * FROM dbo.ACCOUNTS_INFO WHERE ACC_NO = @accNo`);
    res.json(result.recordset.length > 0 ? result.recordset[0] : null);
  } catch (error) {
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
        B.RETAIL_PRICE as SALE_PRICE, 
        B.DESCRIPTION, 
        B.UNIT,
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
    const nameCol = req.lang === 'ar' ? 'ACC_ANAME' : 'ACC_NAME';
    const result = await pool.request()
      .input('classCode', sql.Int, classCode)
      .query(`
        SELECT ACC_NO as acc_no, ${nameCol} as acc_name 
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
    const nameCol = req.lang === 'ar' ? 'ACC_ANAME' : 'ACC_NAME';
    const result = await pool.request()
      .input('subClassCode', sql.Numeric(18, 0), subClassCode)
      .query(`
        SELECT ACC_NO as acc_no, ${nameCol} as acc_name 
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
      FROM dbo.UserPriv_Web
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
    const nameCol = req.lang === 'ar' ? 'ACC_ANAME' : 'ACC_NAME';
    const result = await pool.request()
      .input('classCode', sql.Int, classCode)
      .input('level', sql.Int, level)
      .query(`
        SELECT 
          ACC_LEVEL as acc_level,
          ACC_NO as acc_no, 
          ${nameCol} as acc_name, 
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
      .input('ACC_NO', sql.Numeric(18, 0), data.ACC_NO ? Number(data.ACC_NO) : null)
      .input('ABRV', sql.VarChar, data.ABRV || '')
      .input('DRCR', sql.VarChar, data.DRCR || 'D')
      .input('DRCR1', sql.VarChar, data.DRCR1 || 'D')
      .input('PAYBY', sql.VarChar, data.PAYBY || '')
      .input('INV_PREFEX', sql.VarChar, data.INV_PREFEX || '')
      .input('AUTO_POST', sql.Int, data.AUTO_POST || 0)
      .input('ABRV_CODE', sql.VarChar, data.ABRV_CODE || '')
      .input('VAT_ACC', sql.Numeric(18, 0), data.VAT_ACC ? Number(data.VAT_ACC) : null)
      .input('EXP_ACC', sql.Numeric(18, 0), data.EXP_ACC ? Number(data.EXP_ACC) : null)
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
      FROM dbo.UserPriv_Web
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
      .query(`SELECT GROUP_NAME FROM dbo.UserPriv_Web WHERE GROUP_NAME = @group AND Menu_Name = @menu`);

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
        UPDATE dbo.UserPriv_Web SET 
          form_id = @form_id, ins = @ins, upd = @upd, qry = @qry, del = @del, dsp = @dsp
        WHERE GROUP_NAME = @GROUP_NAME AND Menu_Name = @Menu_Name
      `);
    } else {
      await reqPool.query(`
        INSERT INTO dbo.UserPriv_Web (
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
    CURRENCY_RATE,
    CRATE,
    TRN_TYPE,
    REF_INV_NO,
    ADDRESS,
    TAXABLE_AMOUNT = 0,
    FRN_AMOUNT = 0,
    USER_ID,
    PRICE_INCLUDE_VAT,
    SOURCE_REC_NO
  } = req.body;
  const effectiveRate = CURRENCY_RATE || CRATE || 1;

  const trnType = (req.body.TRN_TYPE !== undefined && req.body.TRN_TYPE !== null)
    ? req.body.TRN_TYPE
    : (req.body.trn_type !== undefined ? req.body.trn_type : (PAYMENT_METHOD === 'Cash' ? 6 : 7));

  console.log('🔍 DEBUG: Resolved trnType for DB:', trnType);
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

    const optRes = await pool.request().query('SELECT DEF_CASH_AC, VAT_PERCENT FROM dbo.AC_OPTIONS WHERE ID = 1');
    const vatPercent = optRes.recordset[0]?.VAT_PERCENT || 0;

    if (!cashAcc) {
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
          .input('trnType', sql.Int, trnType)
          .input('refNo', sql.VarChar, String(REF_INV_NO || ''))
          .input('vatNumber', sql.VarChar, String(VAT_NUMBER || ''))
          .input('userid', sql.VarChar, String(USER_ID || ''))
          .input('vatPercent', sql.Decimal(18, 2), vatPercent)
          .input('priceIncVat', sql.Bit, PRICE_INCLUDE_VAT ? 1 : 0)
          .input('taxableAmount', sql.Decimal(18, 2), TAXABLE_AMOUNT || 0)
          .input('frnAmount', sql.Decimal(18, 2), FRN_AMOUNT || 0)
          .input('crate', sql.Decimal(18, 4), effectiveRate)
          .query(`
            UPDATE dbo.DATA_ENTRY_WEB SET
              ACCODE = @accode, ENAME = @ename, G_TOTAL = @gTotal, DISC_AMT = @discAmt,
              NET_AMOUNT = @netAmount, VAT_AMOUNT = @vatAmount, CASH_PAID = @cashPaid,
              OTHER_PAID = @otherPaid, CASH_ACC = @cashAcc, WR_CODE = @wrCode,
              CURRENCY = @currency, TRN_TYPE = @trnType, REF_NO = @refNo,
              VAT_NUMBER = @vatNumber, USER_ID = @userid,
              VAT_PERCENT = @vatPercent, PRICE_INCLUDE_VAT = @priceIncVat,
              CRATE = @crate, TAXABLE_AMOUNT = @taxableAmount, FRN_AMOUNT = @frnAmount
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
          .input('refNo', sql.VarChar, String(REF_INV_NO || ''))
          .input('vatNumber', sql.VarChar, String(VAT_NUMBER || ''))
          .input('userid', sql.VarChar, String(USER_ID || ''))
          .input('vatPercent', sql.Decimal(18, 2), vatPercent)
          .input('priceIncVat', sql.Bit, PRICE_INCLUDE_VAT ? 1 : 0)
          .input('taxableAmount', sql.Decimal(18, 2), TAXABLE_AMOUNT || 0)
          .input('frnAmount', sql.Decimal(18, 2), FRN_AMOUNT || 0)
          .input('crate', sql.Decimal(18, 4), effectiveRate)
          .query(`
              INSERT INTO dbo.DATA_ENTRY_WEB (
                ACCODE, ENAME, G_TOTAL, DISC_AMT, NET_AMOUNT, VAT_AMOUNT,
                CASH_PAID, OTHER_PAID, CASH_ACC,
                BRN_CODE, TRN_TYPE, ORG_DUP, WR_CODE, CURDATE,
                CURRENCY, REF_NO, VAT_NUMBER, USER_ID,
                VAT_PERCENT, PRICE_INCLUDE_VAT, CRATE,
                TAXABLE_AMOUNT, FRN_AMOUNT
              )
              VALUES (
                @accode, @ename, @gTotal, @discAmt, @netAmount, @vatAmount,
                @cashPaid, @otherPaid, @cashAcc,
                @brnCode, @trnType, @orgDup, @wrCode, GETDATE(),
                @currency, @refNo, @vatNumber, @userid,
                @vatPercent, @priceIncVat, @crate,
                @taxableAmount, @frnAmount
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

      // --- SAVE ADDRESS INFO TO dbo.CASH_ACC_INFO ---
      if (ADDRESS && (ADDRESS.street || ADDRESS.city || ADDRESS.building)) {
        const addrRequest = new sql.Request(transaction);
        await addrRequest
          .input('accNo', sql.VarChar, String(ACCODE || ''))
          .input('trnType', sql.Int, trnType)
          .input('invoiceNo', sql.VarChar, String(INVOICE_NO))
          .input('accName', sql.VarChar, String(ENAME || ''))
          .input('street', sql.NVarChar, String(ADDRESS.street || ''))
          .input('building', sql.VarChar, String(ADDRESS.building || ''))
          .input('subdivision', sql.NVarChar, String(ADDRESS.district || ''))
          .input('city', sql.NVarChar, String(ADDRESS.city || ''))
          .input('postal', sql.VarChar, String(ADDRESS.pincode || ''))
          .query(`
            IF EXISTS (SELECT 1 FROM dbo.CASH_ACC_INFO WHERE INVOICE_NO = @invoiceNo)
            BEGIN
              UPDATE dbo.CASH_ACC_INFO SET
                ACC_NO = @accNo, TRN_TYPE = @trnType, ACC_NAME = @accName,
                street_name = @street, building_no = @building,
                city_subdivision_name = @subdivision, city_name = @city,
                postal_zone = @postal, regsitered_name = @accName
              WHERE INVOICE_NO = @invoiceNo
            END
            ELSE
            BEGIN
              INSERT INTO dbo.CASH_ACC_INFO (
                ACC_NO, TRN_TYPE, INVOICE_NO, ACC_NAME,
                street_name, building_no, city_subdivision_name, city_name, postal_zone, regsitered_name
              ) VALUES (
                @accNo, @trnType, @invoiceNo, @accName,
                @street, @building, @subdivision, @city, @postal, @accName
              )
            END
          `);
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
            .input('unit', sql.VarChar, String(row.unitId || row.unit_name || row.unit || 'Pcs'))
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

      // 3. Save Terms & Conditions if provided (for quotations / invoices)
      const quotTerms = req.body.QUOT_TERMS;
      if (Array.isArray(quotTerms)) {
        console.log(`📝 Saving ${quotTerms.length} terms for invoice ${INVOICE_NO}...`);

        // Delete existing terms
        const deleteTermsRequest = new sql.Request(transaction);
        await deleteTermsRequest
          .input('invoiceNo', sql.VarChar, String(INVOICE_NO))
          .input('trnType', sql.Int, trnType)
          .query('DELETE FROM dbo.QUOT_TERM_DET WHERE INVOICE_NO = @invoiceNo AND TRN_TYPE = @trnType');

        // Insert new terms
        for (const term of quotTerms) {
          if (!term.QUOT_TERM_ID || !term.QUOT_DESCRIPTION?.trim()) continue;

          const insertTermRequest = new sql.Request(transaction);
          await insertTermRequest
            .input('invoiceNo', sql.VarChar, String(INVOICE_NO))
            .input('termId', sql.Int, parseInt(term.QUOT_TERM_ID))
            .input('description', sql.NVarChar, String(term.QUOT_DESCRIPTION))
            .input('trnType', sql.Int, trnType)
            .query(`
              INSERT INTO dbo.QUOT_TERM_DET (INVOICE_NO, QUOT_TERM_ID, QUOT_DESCRIPTION, TRN_TYPE)
              VALUES (@invoiceNo, @termId, @description, @trnType)
            `);
        }
      }

      // 4. Update Source Quotation if provided
      if (SOURCE_REC_NO) {
        console.log(`🔗 Linking Sales Invoice #${INVOICE_NO} to Source Quotation REC_NO: ${SOURCE_REC_NO}`);
        const linkRequest = new sql.Request(transaction);
        await linkRequest
          .input('sourceRecNo', sql.Numeric(18, 0), SOURCE_REC_NO)
          .input('salesInvoiceNo', sql.VarChar, String(INVOICE_NO))
          .query('UPDATE dbo.DATA_ENTRY_WEB SET QOT_INV_NO = @salesInvoiceNo WHERE REC_NO = @sourceRecNo');
      }

      await transaction.commit();
      console.log(`🎉 Sale ${isUpdate ? 'updated' : 'saved'} successfully: Invoice #${INVOICE_NO}`);
      res.json({ success: true, message: `Sale ${isUpdate ? 'updated' : 'saved'} successfully`, REC_NO, INVOICE_NO, debugTrnType: trnType });

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
  const { q, trnType, searchField } = req.query;
  try {
    console.log(`📡 Fetching sales history (q: "${q}", field: "${searchField}", trnType: "${trnType}")...`);
    const pool = await getPool();

    let trnFilter = '';
    if (trnType) {
      const types = trnType.split(',').map(t => parseInt(t)).filter(t => !isNaN(t));
      if (types.length > 0) {
        trnFilter = ` AND D.TRN_TYPE IN (${types.join(',')}) `;
      }
    }

    let query = `
      SELECT TOP 100
        D.REC_NO,
        D.INVOICE_NO, 
        D.ACCODE, 
        D.ENAME, 
        D.G_TOTAL, 
        D.NET_AMOUNT, 
        D.VAT_AMOUNT,
        D.DISC_AMT,
        D.TRN_TYPE,
        CONVERT(VARCHAR, D.CURDATE, 121) AS CURDATE,
        D.CASH_PAID,
        D.OTHER_PAID,
        D.VAT_NUMBER,
        D.REF_NO,
        D.CRATE,
        C.Currency_code AS CURRENCY_CODE,
        D.QOT_INV_NO
      FROM dbo.DATA_ENTRY_WEB D
      LEFT JOIN dbo.CURRENCY_MASTER C ON D.CURRENCY = C.Currency_No
      WHERE 1=1 ${trnFilter}
    `;

    const request = pool.request();
    if (q) {
      if (searchField === 'INVOICE_NO') {
        query += ` AND D.INVOICE_NO LIKE @q `;
      } else {
        query += ` AND (D.INVOICE_NO LIKE @q OR D.ENAME LIKE @q OR D.ACCODE LIKE @q) `;
      }

      request.input('q', sql.VarChar, `%${q}%`);
      request.input('start', sql.VarChar, `${q}%`);
      request.input('exact', sql.VarChar, q);

      query += ` 
        ORDER BY 
          CASE 
            WHEN D.INVOICE_NO = @exact THEN 0
            WHEN D.INVOICE_NO LIKE @start THEN 1
            ELSE 2 
          END,
          D.CURDATE DESC 
      `;
    } else {
      query += ` ORDER BY D.CURDATE DESC `;
    }

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch sales history:", error);
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

// Get Invoice Address from CASH_ACC_INFO
app.get('/api/sales/:invoiceNo/address', async (req, res) => {
  const { invoiceNo } = req.params;
  const { trnType } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request().input('invoiceNo', sql.VarChar, invoiceNo);

    let query = `
      SELECT 
        building_no as building,
        street_name as street,
        city_subdivision_name as district,
        city_name as city,
        postal_zone as pincode
      FROM dbo.CASH_ACC_INFO
      WHERE INVOICE_NO = @invoiceNo
    `;

    if (trnType) {
      request.input('trnType', sql.Int, parseInt(trnType));
      query += ` AND TRN_TYPE = @trnType`;
    }

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error("Failed to fetch invoice address:", error);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- QUOTATION TERMS ENDPOINTS ---

app.get('/api/quotations/terms', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ID, DESC_NAME, DESC_ANAME 
      FROM dbo.QUOT_TERMS 
      ORDER BY ID ASC
    `);
    res.json(result.recordset);
  } catch (error) {
    next(error);
  }
});

app.get('/api/sales/:invoiceNo/terms', async (req, res, next) => {
  const { invoiceNo } = req.params;
  const { trnType = 19 } = req.query;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('invoiceNo', sql.VarChar, invoiceNo)
      .input('trnType', sql.Int, parseInt(trnType))
      .query(`
        SELECT QUOT_TERM_ID, QUOT_DESCRIPTION 
        FROM dbo.QUOT_TERM_DET 
        WHERE INVOICE_NO = @invoiceNo AND TRN_TYPE = @trnType
      `);
    res.json(result.recordset);
  } catch (error) {
    next(error);
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
// --- EXPENSE ENTRY ENDPOINTS ---

app.get('/api/expense-entry/types', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, type_name, type_aname FROM dbo.expense_type WHERE exp_category = 1
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch expense types:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/expense-entry/accounts', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        (SELECT exp_ac_type FROM dbo.ac_options WHERE id=1) AS exp_ac_type,
        (SELECT Payable_ac_type FROM dbo.ac_options WHERE id=1) AS payable_ac_type,
        (SELECT cash_ac_type FROM dbo.ac_options WHERE id=1) AS cash_ac_type,
        (SELECT Vat_ac_type FROM dbo.ac_options WHERE id=1) AS vat_ac_type
    `);

    const options = result.recordset[0];

    const accountsResult = await pool.request().query(`
      SELECT acc_no, acc_name, acc_aname, level3_no 
      FROM dbo.accounts 
      WHERE acc_level = 4 AND level3_no IN (
        ${options.exp_ac_type || 0}, 
        ${options.payable_ac_type || 0}, 
        ${options.cash_ac_type || 0}, 
        ${options.vat_ac_type || 0}
      )
    `);

    const accounts = accountsResult.recordset;

    res.json({
      expenseAccounts: accounts.filter(a => a.level3_no == options.exp_ac_type),
      payableAccounts: accounts.filter(a => a.level3_no == options.payable_ac_type),
      cashAccounts: accounts.filter(a => a.level3_no == options.cash_ac_type),
      vatAccounts: accounts.filter(a => a.level3_no == options.vat_ac_type)
    });
  } catch (error) {
    console.error("Failed to fetch expense accounts:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/expense-entry/history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ID, 
        ENTRY_DATE, 
        DOC_NO, 
        ACC_NAME1 AS [TO ACC], 
        ACC_NAME2 AS FROM_ACC, 
        PAY_AMOUNT, 
        DESCRIPTION, 
        RETURN_INVOICE,
        Currency_no AS CURRENCY,
        Currency_rate AS CURRENCY_RATE,
        COST_CENTER,
        BRN_CODE,
        REF_NO,
        PAY_FROM_ACC,
        PAY_TO_ACC,
        DOC_TRN_TYPE
      FROM dbo.TRN_ENTRY 
      WHERE TRN_TYPE = 204 
      ORDER BY ID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch expense history:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/expense-entry/save', async (req, res) => {
  const data = req.body;
  console.log('🔍 DEBUG: Expense Entry Save Payload:', JSON.stringify(data, null, 2));
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('ID', sql.Numeric(18, 0), data.ID || null);
    request.input('ENTRY_DATE', sql.DateTime, new Date(data.ENTRY_DATE));
    request.input('DOC_NO', sql.VarChar(50), String(data.DOC_NO));
    request.input('DOC_TRN_TYPE', sql.Int, data.DOC_TRN_TYPE || 1);
    request.input('TRN_TYPE', sql.Int, 204);
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), data.PAY_FROM_ACC);
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), data.PAY_TO_ACC);
    request.input('TRN_NO', sql.Numeric(18, 0), null);
    request.input('TRN_NO2', sql.Numeric(18, 0), null);
    request.input('DESCRIPTION', sql.NVarChar(300), data.DESCRIPTION || '');
    request.input('PAY_AMOUNT', sql.Real, data.PAY_AMOUNT);
    request.input('CURRENCY_NO', sql.Int, data.CURRENCY || 1);
    request.input('CURRENCY_RATE', sql.Real, data.CURRENCY_RATE || 1);
    request.input('RETURN_INVOICE', sql.Bit, data.RETURN_INVOICE ? 1 : 0);
    request.input('USER_ID', sql.Int, data.USER_ID || 1);
    request.input('REF_NO', sql.VarChar(50), data.REF_NO || '');
    request.input('cost_center', sql.Int, data.COST_CENTER && !isNaN(Number(data.COST_CENTER)) ? Number(data.COST_CENTER) : null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);
    request.input('ACC_NAME1', sql.NVarChar(200), data.ACC_NAME1 || 'N/A');
    request.input('ACC_NAME2', sql.NVarChar(200), data.ACC_NAME2 || 'N/A');
    request.input('VAT_AMOUNT', sql.Real, parseFloat(data.VAT_AMOUNT) || 0);
    request.input('VAT_ACCOUNT', sql.Numeric(18, 0), data.VAT_ACCOUNT ? parseFloat(data.VAT_ACCOUNT) : null);
    request.input('PAYFROM_AC', sql.Numeric(18, 0), data.PAYFROM_AC ? parseFloat(data.PAYFROM_AC) : null);
    request.input('PAY_FROMNAME', sql.NVarChar(200), data.PAY_FROMNAME || null);
    request.input('VAT_ACNAME', sql.NVarChar(200), data.VAT_ACNAME || null);

    console.log('📡 Executing SP_TRN_ENTRY_EXPSAVE for Expense Entry...');
    const result = await request.execute('dbo.SP_TRN_ENTRY_EXPSAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID || result.recordset[0]?.ID;
    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save expense entry:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// --- EMPLOYEE SALARY ENTRY ENDPOINTS ---

app.get('/api/salary-entry/types', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT id, type_name, type_aname FROM dbo.expense_type WHERE exp_category = 2
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch salary entry types:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.get('/api/salary-entry/history', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        ID, 
        ENTRY_DATE, 
        DOC_NO, 
        ACC_NAME1 AS [TO ACC], 
        ACC_NAME2 AS FROM_ACC, 
        PAY_AMOUNT, 
        DESCRIPTION, 
        RETURN_INVOICE,
        Currency_no AS CURRENCY,
        Currency_rate AS CURRENCY_RATE,
        COST_CENTER,
        BRN_CODE,
        REF_NO,
        PAY_FROM_ACC,
        PAY_TO_ACC,
        DOC_TRN_TYPE
      FROM dbo.TRN_ENTRY 
      WHERE TRN_TYPE = 208 
      ORDER BY ID DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Failed to fetch salary entry history:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

app.post('/api/salary-entry/save', async (req, res) => {
  const data = req.body;
  try {
    const pool = await getPool();
    const request = pool.request();

    request.input('ID', sql.Numeric(18, 0), data.ID || null);
    request.input('ENTRY_DATE', sql.DateTime, new Date(data.ENTRY_DATE));
    request.input('DOC_NO', sql.VarChar(50), String(data.DOC_NO));
    request.input('DOC_TRN_TYPE', sql.Int, data.DOC_TRN_TYPE || 1);
    request.input('TRN_TYPE', sql.Int, 208);
    request.input('PAY_FROM_ACC', sql.Numeric(18, 0), data.PAY_FROM_ACC);
    request.input('PAY_TO_ACC', sql.Numeric(18, 0), data.PAY_TO_ACC);
    request.input('TRN_NO', sql.Numeric(18, 0), null);
    request.input('TRN_NO2', sql.Numeric(18, 0), null);
    request.input('DESCRIPTION', sql.NVarChar(300), data.DESCRIPTION || '');
    request.input('PAY_AMOUNT', sql.Real, data.PAY_AMOUNT);
    request.input('CURRENCY_NO', sql.Int, data.CURRENCY || 1);
    request.input('CURRENCY_RATE', sql.Real, data.CURRENCY_RATE || 1);
    request.input('RETURN_INVOICE', sql.Bit, data.RETURN_INVOICE ? 1 : 0);
    request.input('USER_ID', sql.Int, data.USER_ID || 1);
    request.input('REF_NO', sql.VarChar(50), data.REF_NO || '');
    request.input('cost_center', sql.Int, data.COST_CENTER && !isNaN(Number(data.COST_CENTER)) ? Number(data.COST_CENTER) : null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);
    request.input('ACC_NAME1', sql.NVarChar(200), data.ACC_NAME1 || 'N/A');
    request.input('ACC_NAME2', sql.NVarChar(200), data.ACC_NAME2 || 'N/A');

    console.log('📡 Executing SP_TRN_ENTRY_SAVE for Salary Entry...');
    const result = await request.execute('dbo.SP_TRN_ENTRY_SAVE');
    const newId = result.recordset[0]?.NEW_ID || result.recordset[0]?.UPDATED_ID || result.recordset[0]?.ID;
    res.json({ success: true, transactionId: newId });
  } catch (error) {
    console.error("Failed to save salary entry:", error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// --- TRANSLATION API ---
app.get('/api/translations', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TRANSLATION_KEY, EN_VALUE, AR_VALUE FROM WEB_TRANSLATIONS');
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch translations:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/translations/save', async (req, res) => {
  const { translations } = req.body; // Array of { key, en, ar }
  try {
    const pool = await getPool();
    for (const item of translations) {
      await pool.request()
        .input('key', sql.VarChar, item.key)
        .input('en', sql.NVarChar, item.en)
        .input('ar', sql.NVarChar, item.ar)
        .query(`
          IF EXISTS (SELECT 1 FROM WEB_TRANSLATIONS WHERE TRANSLATION_KEY = @key)
            UPDATE WEB_TRANSLATIONS SET EN_VALUE = @en, AR_VALUE = @ar WHERE TRANSLATION_KEY = @key
          ELSE
            INSERT INTO WEB_TRANSLATIONS (TRANSLATION_KEY, EN_VALUE, AR_VALUE) VALUES (@key, @en, @ar)
        `);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save translations:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- CUSTOMER RECEIVABLE API ---

app.get('/api/branches', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT Branch_Code, Branch_Name FROM dbo.BRANCHES ORDER BY Branch_Name');
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch branches:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- SCREENS ENDPOINT ---
app.get('/api/screens', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT Menu_Name FROM dbo.Menu_Master_Web WHERE Menu_Name IS NOT NULL AND Menu_Name <> '' ORDER BY Menu_Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch screens:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- ACCOUNTS ALL ENDPOINT ---
app.get('/api/accounts/all', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ACC_NO, ACC_NAME, ACC_ANAME FROM dbo.ACCOUNTS WHERE ACC_LEVEL = 4 ORDER BY ACC_NO
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch all accounts:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- WAREHOUSES ENDPOINT ---
app.get('/api/warehouses/list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT WR_CODE, WR_NAME FROM dbo.WAREHOUSE ORDER BY WR_NAME
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch warehouses:", err);
    res.status(500).json({ error: 'Database error' });
  }
});

// --- TRANSACTION TYPES ENDPOINTS ---

app.get('/api/transaction-types', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TRN_CODE, TRN_NAME, TRN_NO, BRN_CODE, TRN_ANAME,
             ACC_NO, ABRV, DRCR, DRCR1, PAYBY,
             INV_PREFEX, AUTO_POST, ABRV_CODE, VAT_ACC,
             EXP_ACC, PIH, SCREEN_NAME
      FROM dbo.trn_type
      ORDER BY TRN_CODE
    `);
    console.log(`📋 Transaction Types: Loaded ${result.recordset.length} types`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch transaction types:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/transaction-types', async (req, res) => {
  const data = req.body;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('TRN_CODE', sql.Int, data.TRN_CODE);
    request.input('TRN_NAME', sql.VarChar(100), data.TRN_NAME || '');
    request.input('TRN_NO', sql.Int, data.TRN_NO || null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE || 1);
    request.input('TRN_ANAME', sql.NVarChar(100), data.TRN_ANAME || '');
    request.input('ACC_NO', sql.VarChar(50), data.ACC_NO || '');
    request.input('ABRV', sql.VarChar(20), data.ABRV || '');
    request.input('DRCR', sql.VarChar(5), data.DRCR || 'D');
    request.input('DRCR1', sql.VarChar(5), data.DRCR1 || 'D');
    request.input('PAYBY', sql.VarChar(50), data.PAYBY || '');
    request.input('INV_PREFEX', sql.VarChar(20), data.INV_PREFEX || '');
    request.input('AUTO_POST', sql.Int, data.AUTO_POST != null ? data.AUTO_POST : 1);
    request.input('ABRV_CODE', sql.VarChar(20), data.ABRV_CODE || '');
    request.input('VAT_ACC', sql.VarChar(50), data.VAT_ACC || '');
    request.input('EXP_ACC', sql.VarChar(50), data.EXP_ACC || '');
    request.input('PIH', sql.Int, data.PIH || 0);
    request.input('SCREEN_NAME', sql.VarChar(100), data.SCREEN_NAME || '');

    await request.query(`
      IF EXISTS (SELECT 1 FROM dbo.trn_type WHERE TRN_CODE = @TRN_CODE)
        UPDATE dbo.trn_type SET
          TRN_NAME = @TRN_NAME, TRN_NO = @TRN_NO, BRN_CODE = @BRN_CODE, TRN_ANAME = @TRN_ANAME,
          ACC_NO = @ACC_NO, ABRV = @ABRV, DRCR = @DRCR, DRCR1 = @DRCR1, PAYBY = @PAYBY,
          INV_PREFEX = @INV_PREFEX, AUTO_POST = @AUTO_POST, ABRV_CODE = @ABRV_CODE,
          VAT_ACC = @VAT_ACC, EXP_ACC = @EXP_ACC, PIH = @PIH, SCREEN_NAME = @SCREEN_NAME
        WHERE TRN_CODE = @TRN_CODE
      ELSE
        INSERT INTO dbo.trn_type (TRN_CODE, TRN_NAME, TRN_NO, BRN_CODE, TRN_ANAME, ACC_NO, ABRV, DRCR, DRCR1, PAYBY, INV_PREFEX, AUTO_POST, ABRV_CODE, VAT_ACC, EXP_ACC, PIH, SCREEN_NAME)
        VALUES (@TRN_CODE, @TRN_NAME, @TRN_NO, @BRN_CODE, @TRN_ANAME, @ACC_NO, @ABRV, @DRCR, @DRCR1, @PAYBY, @INV_PREFEX, @AUTO_POST, @ABRV_CODE, @VAT_ACC, @EXP_ACC, @PIH, @SCREEN_NAME)
    `);
    console.log(`✅ Transaction type ${data.TRN_CODE} saved successfully`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save transaction type:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// --- USER PRIVILEGES ENDPOINTS ---

app.get('/api/user-privileges', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT GROUP_NAME, form_id, ins, upd, qry, del, dsp, Menu_Name
      FROM dbo.UserPriv_Web
      ORDER BY GROUP_NAME, Menu_Name
    `);
    console.log(`🔐 User Privileges: Loaded ${result.recordset.length} records`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch user privileges:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/user-privileges', async (req, res) => {
  const data = req.body;
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('GROUP_NAME', sql.VarChar(50), data.GROUP_NAME);
    request.input('form_id', sql.VarChar(50), data.form_id || '');
    request.input('ins', sql.Bit, data.ins || 0);
    request.input('upd', sql.Bit, data.upd || 0);
    request.input('qry', sql.Bit, data.qry || 0);
    request.input('del', sql.Bit, data.del || 0);
    request.input('dsp', sql.Bit, data.dsp || 0);
    request.input('Menu_Name', sql.VarChar(100), data.Menu_Name || '');

    await request.query(`
      IF EXISTS (SELECT 1 FROM dbo.UserPriv_Web WHERE GROUP_NAME = @GROUP_NAME AND Menu_Name = @Menu_Name)
        UPDATE dbo.UserPriv_Web SET
          form_id = @form_id, ins = @ins, upd = @upd, qry = @qry, del = @del, dsp = @dsp
        WHERE GROUP_NAME = @GROUP_NAME AND Menu_Name = @Menu_Name
      ELSE
        INSERT INTO dbo.UserPriv_Web (GROUP_NAME, form_id, ins, upd, qry, del, dsp, Menu_Name)
        VALUES (@GROUP_NAME, @form_id, @ins, @upd, @qry, @del, @dsp, @Menu_Name)
    `);
    console.log(`✅ User privilege for group "${data.GROUP_NAME}" / menu "${data.Menu_Name}" saved`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save user privilege:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// --- USER PRIVILEGES GRID ENDPOINTS ---

app.get('/api/user-privileges/groups', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT Group_Name FROM (
        SELECT DISTINCT GROUP_NAME AS Group_Name FROM dbo.UserPriv_Web WHERE GROUP_NAME IS NOT NULL AND GROUP_NAME <> ''
        UNION
        SELECT DISTINCT Group_Name FROM dbo.UserInfo WHERE Group_Name IS NOT NULL AND Group_Name <> ''
      ) CombinedGroups
      ORDER BY Group_Name
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch user groups:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/user-privileges/menu-heads', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT DISTINCT Head FROM dbo.Menu_Master_Web 
      WHERE Head IS NOT NULL AND Head <> '' AND Head <> '...' 
      ORDER BY Head
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch menu heads:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/user-privileges/grid', async (req, res) => {
  const { group, menuHead } = req.query;
  try {
    const pool = await getPool();
    const request = pool.request();

    let whereClause = "WHERE M.Menu_Name IS NOT NULL AND M.Menu_Name <> '' AND M.Menu_type = 2";
    if (menuHead && menuHead !== 'All') {
      request.input('menuHead', sql.VarChar, menuHead);
      whereClause += ' AND M.Head = @menuHead';
    }
    if (group) {
      request.input('groupName', sql.VarChar, group);
    }

    const result = await request.query(`
      SELECT 
        M.Head AS MENUHEAD,
        M.Menu_Name,
        M.ID AS form_id,
        ISNULL(P.ins, 0) AS ins,
        ISNULL(P.upd, 0) AS upd,
        ISNULL(P.del, 0) AS del,
        ISNULL(P.dsp, 0) AS dsp,
        ISNULL(P.qry, 0) AS qry
      FROM dbo.Menu_Master_Web M
      LEFT JOIN dbo.UserPriv_Web P ON M.Menu_Name = P.Menu_Name ${group ? "AND P.GROUP_NAME = @groupName" : "AND 1=0"}
      ${whereClause}
      ORDER BY M.Head, M.Menu_Name
    `);
    console.log('🔐 Privilege grid: Loaded ' + result.recordset.length + ' items for group=' + (group || 'none') + ', head=' + (menuHead || 'all'));
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch privilege grid:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/user-privileges/bulk-save', async (req, res) => {
  const { group, privileges } = req.body;
  if (!group || !privileges || !Array.isArray(privileges)) {
    return res.status(400).json({ error: 'group and privileges array required' });
  }
  try {
    const pool = await getPool();

    for (const priv of privileges) {
      const request = pool.request();
      request.input('GROUP_NAME', sql.VarChar(50), group);
      request.input('Menu_Name', sql.VarChar(100), priv.Menu_Name);
      request.input('form_id', sql.Int, priv.form_id || 0);
      request.input('ins', sql.Bit, priv.ins ? 1 : 0);
      request.input('upd', sql.Bit, priv.upd ? 1 : 0);
      request.input('qry', sql.Bit, priv.qry ? 1 : 0);
      request.input('del', sql.Bit, priv.del ? 1 : 0);
      request.input('dsp', sql.Bit, priv.dsp ? 1 : 0);

      await request.query(`
        IF EXISTS (SELECT 1 FROM dbo.UserPriv_Web WHERE GROUP_NAME = @GROUP_NAME AND Menu_Name = @Menu_Name)
          UPDATE dbo.UserPriv_Web SET form_id = @form_id, ins = @ins, upd = @upd, qry = @qry, del = @del, dsp = @dsp
          WHERE GROUP_NAME = @GROUP_NAME AND Menu_Name = @Menu_Name
        ELSE
          INSERT INTO dbo.UserPriv_Web (GROUP_NAME, form_id, ins, upd, qry, del, dsp, Menu_Name)
          VALUES (@GROUP_NAME, @form_id, @ins, @upd, @qry, @del, @dsp, @Menu_Name)
      `);
    }

    console.log('✅ Bulk saved ' + privileges.length + ' privileges for group "' + group + '"');
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to bulk save privileges:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/user-privileges/sync', async (req, res) => {
  const { menus } = req.body;
  if (!menus || !Array.isArray(menus)) {
    return res.status(400).json({ error: 'menus array required' });
  }
  try {
    const pool = await getPool();
    let insertedCount = 0;

    for (const menu of menus) {
      if (!menu.Menu_Code) continue;

      const check = await pool.request()
        .input('code', sql.NVarChar(100), menu.Menu_Code)
        .query('SELECT 1 FROM dbo.Menu_Master_Web WHERE Menu_Code = @code');

      if (check.recordset.length === 0) {
        await pool.request()
          .input('head', sql.NVarChar(100), menu.Head || '')
          .input('code', sql.NVarChar(100), menu.Menu_Code)
          .input('type', sql.Int, menu.Menu_type || 2)
          .input('name', sql.NVarChar(100), menu.Menu_Name || '')
          .input('form', sql.NVarChar(50), menu.Form_name || '')
          .input('flag', sql.NVarChar(1), menu.FLAG || 'A')
          .input('det', sql.Int, menu.Head_Det || 1)
          .query(`
            INSERT INTO dbo.Menu_Master_Web (Head, Menu_Code, Menu_type, Menu_Name, Form_name, FLAG, Head_Det)
            VALUES (@head, @code, @type, @name, @form, @flag, @det)
          `);
        insertedCount++;
      }
    }
    console.log(`🔐 Menu Sync: Added ${insertedCount} missing menus to Menu_Master_Web`);
    res.json({ success: true, insertedCount });
  } catch (err) {
    console.error("Failed to sync privileges:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// --- USER INFO ENDPOINTS ---

app.get('/api/user-info', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT UserId, UserName, MOBILE_NO, Password, Superuser,
             Group_Name, WR_CODE, BRN_CODE, MENU_DOCK, SH_TOPMENU,
             SH_SIDEMENU, POWER_USER, DEF_LANG, DEF_INVOICE,
             DEF_FORM, DEF_SCREEN, Employee_ACNO, SALE_CASH_AC,
             SALE_BANK_AC, Payments
      FROM dbo.UserInfo
      ORDER BY UserName
    `);
    console.log(`👤 User Info: Loaded ${result.recordset.length} users`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch user info:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/user-info', async (req, res) => {
  const data = req.body;
  if (!data.UserName) {
    return res.status(400).json({ error: 'UserName required' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();

    // Bind all inputs with correct DB data types
    request.input('UserName', sql.VarChar(50), String(data.UserName));
    request.input('MOBILE_NO', sql.NVarChar(50), String(data.MOBILE_NO || ''));
    request.input('Password', sql.VarChar(50), String(data.Password || ''));
    request.input('Superuser', sql.Bit, data.Superuser ? 1 : 0);
    request.input('Group_Name', sql.NVarChar(20), String(data.Group_Name || ''));
    request.input('WR_CODE', sql.Int, data.WR_CODE && !isNaN(Number(data.WR_CODE)) ? Number(data.WR_CODE) : null);
    request.input('BRN_CODE', sql.Int, data.BRN_CODE && !isNaN(Number(data.BRN_CODE)) ? Number(data.BRN_CODE) : null);
    request.input('MENU_DOCK', sql.VarChar(20), String(data.MENU_DOCK || '0'));
    request.input('SH_TOPMENU', sql.Bit, data.SH_TOPMENU != null ? (data.SH_TOPMENU ? 1 : 0) : 1);
    request.input('SH_SIDEMENU', sql.Bit, data.SH_SIDEMENU != null ? (data.SH_SIDEMENU ? 1 : 0) : 1);
    request.input('POWER_USER', sql.Bit, data.POWER_USER ? 1 : 0);
    request.input('DEF_LANG', sql.NVarChar(50), String(data.DEF_LANG || 'EN'));
    request.input('DEF_INVOICE', sql.NVarChar(50), String(data.DEF_INVOICE || ''));
    request.input('DEF_FORM', sql.NVarChar(50), String(data.DEF_FORM || ''));
    request.input('DEF_SCREEN', sql.NVarChar(50), String(data.DEF_SCREEN || ''));
    request.input('Employee_ACNO', sql.Numeric(18, 0), data.Employee_ACNO && !isNaN(Number(data.Employee_ACNO)) ? Number(data.Employee_ACNO) : null);
    request.input('SALE_CASH_AC', sql.Numeric(18, 0), data.SALE_CASH_AC && !isNaN(Number(data.SALE_CASH_AC)) ? Number(data.SALE_CASH_AC) : null);
    request.input('SALE_BANK_AC', sql.Numeric(18, 0), data.SALE_BANK_AC && !isNaN(Number(data.SALE_BANK_AC)) ? Number(data.SALE_BANK_AC) : null);
    request.input('Payments', sql.Bit, data.Payments ? 1 : 0);

    const userIdVal = data.UserId ? parseInt(data.UserId, 10) : null;
    let exists = false;
    if (userIdVal && !isNaN(userIdVal)) {
      const checkRes = await pool.request()
        .input('UserId', sql.Int, userIdVal)
        .query('SELECT 1 FROM dbo.UserInfo WHERE UserId = @UserId');
      exists = checkRes.recordset.length > 0;
    }

    if (exists) {
      request.input('UserId', sql.Int, userIdVal);
      await request.query(`
        UPDATE dbo.UserInfo SET
          UserName = @UserName, MOBILE_NO = @MOBILE_NO, Password = @Password, Superuser = @Superuser,
          Group_Name = @Group_Name, WR_CODE = @WR_CODE, BRN_CODE = @BRN_CODE, MENU_DOCK = @MENU_DOCK,
          SH_TOPMENU = @SH_TOPMENU, SH_SIDEMENU = @SH_SIDEMENU, POWER_USER = @POWER_USER,
          DEF_LANG = @DEF_LANG, DEF_INVOICE = @DEF_INVOICE, DEF_FORM = @DEF_FORM,
          DEF_SCREEN = @DEF_SCREEN, Employee_ACNO = @Employee_ACNO, SALE_CASH_AC = @SALE_CASH_AC,
          SALE_BANK_AC = @SALE_BANK_AC, Payments = @Payments
        WHERE UserId = @UserId
      `);
      console.log(`✅ User info updated for "${data.UserName}" (ID: ${userIdVal})`);
    } else {
      await request.query(`
        INSERT INTO dbo.UserInfo (
          UserName, MOBILE_NO, Password, Superuser, Group_Name, WR_CODE, BRN_CODE, 
          MENU_DOCK, SH_TOPMENU, SH_SIDEMENU, POWER_USER, DEF_LANG, DEF_INVOICE, 
          DEF_FORM, DEF_SCREEN, Employee_ACNO, SALE_CASH_AC, SALE_BANK_AC, Payments
        ) VALUES (
          @UserName, @MOBILE_NO, @Password, @Superuser, @Group_Name, @WR_CODE, @BRN_CODE, 
          @MENU_DOCK, @SH_TOPMENU, @SH_SIDEMENU, @POWER_USER, @DEF_LANG, @DEF_INVOICE, 
          @DEF_FORM, @DEF_SCREEN, @Employee_ACNO, @SALE_CASH_AC, @SALE_BANK_AC, @Payments
        )
      `);
      console.log(`✅ User info inserted for "${data.UserName}" (Identity auto-generated)`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save user info:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


// --- ITEM CREATION ENDPOINTS ---

app.get('/api/items/new-item-dependencies', async (req, res) => {
  try {
    const pool = await getPool();
    const [categories, units, itemTypes, warehouses] = await Promise.all([
      pool.request().query("SELECT ITM_CAT_CODE, ITM_CAT_NAME, ITM_CAT_ANAME, VAT_PERCENT FROM dbo.ITEM_CAT ORDER BY ITM_CAT_NAME"),
      pool.request().query("SELECT Unit_id, Unit_Name, Unit_AName, QTY FROM dbo.UnitMaster WHERE UNIT_TYPE='I' ORDER BY Unit_id"),
      pool.request().query("SELECT ITM_TYPE_CODE, ITM_TYPE_NAME, ITM_TYPE_ANAME FROM dbo.ITEM_TYPE ORDER BY ITM_TYPE_NAME"),
      pool.request().query("SELECT WR_CODE, WR_NAME AS WAREHOUSE_NAME, WR_ANAME AS WAREHOUSE_ANAME FROM dbo.WRHOUSE_MASTER ORDER BY WR_NAME")
    ]);
    res.json({
      categories: categories.recordset,
      units: units.recordset,
      itemTypes: itemTypes.recordset,
      warehouses: warehouses.recordset
    });
  } catch (err) {
    console.error("Failed to fetch item dependencies:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/items/list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ITEM_CODE, DESCRIPTION AS ITEM_NAME, AR_DESC AS ITEM_ANAME, BARCODE, VAT_PERCENT
      FROM dbo.HD_ITEMMASTER
      ORDER BY DESCRIPTION
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Failed to fetch items list:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/items/:itemCode/detail', async (req, res) => {
  const { itemCode } = req.params;
  try {
    const pool = await getPool();

    // Query General Item Master
    const mainRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT ITEM_CODE, DESCRIPTION AS ITEM_NAME, AR_DESC AS ITEM_ANAME, 
               ITM_CAT_CODE, UNIT AS Unit_ID, FRACTION AS QTY_IN_UNIT, 
               PART_NO, BRAND, ALIAS_NAME, VAT_PERCENT, BARCODE, 
               PRICE_INCLUDE_VAT, TAX_CATAGORY, non_stock_itm, ITEM_type, Remarks
        FROM dbo.HD_ITEMMASTER
        WHERE ITEM_CODE = @itemCode
      `);
    if (mainRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const mainItem = mainRes.recordset[0];

    // Query Barcodes
    const barcodesRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT BARCODE, UNIT AS Unit_Id, FRACTION AS QTY_IN_UNIT, 
               SALE_PRICE AS WHOLESALE_PRICE, RETAIL_PRICE, ITEM_CODE, MAIN_ID, 
               DESCRIPTION AS ITEM_NAME, DESCRIPTION_AR AS ITEM_ANAME
        FROM dbo.BARCODE
        WHERE ITEM_CODE = @itemCode
      `);

    // Query Warehouse Stocks (with dynamic read-only live stock)
    const warehouseRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT wsm.ITEM_CODE, wsm.OP_STOCK, wsm.LOCATION, wsm.WR_CODE,
               wm.WR_NAME AS WAREHOUSE_NAME, wm.WR_ANAME AS WAREHOUSE_ANAME,
               COALESCE((SELECT STOCK FROM dbo.STOCK_ITEM WHERE ITEM_CODE = @itemCode AND WR_CODE = wsm.WR_CODE), 0) AS STOCK
        FROM dbo.WR_STOCK_MASTER wsm
        INNER JOIN dbo.WRHOUSE_MASTER wm ON wsm.WR_CODE = wm.WR_CODE
        WHERE wsm.ITEM_CODE = @itemCode
      `);

    // Query Stock Master
    const stockMasterRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT ITEM_CODE, STOCK, LAST_PUR_PRICE, PROFIT, R_MIN_PROFIT, 
               W_MIN_PROFIT, OP_STOCK, W_MIN_PC, AVG_PUR_PRICE, 
               AVG_EXPENSE_AMT, SALES_PROFIT_PCNT
        FROM dbo.STOCK_MASTER
        WHERE ITEM_CODE = @itemCode
      `);
    const stockMaster = stockMasterRes.recordset[0] || null;

    // Query Image
    const imageRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT TOP 1 barcode, photo
        FROM dbo.Item_Image
        WHERE Itemcode = @itemCode
      `);
    let photoBase64 = null;
    if (imageRes.recordset.length > 0 && imageRes.recordset[0].photo) {
      photoBase64 = imageRes.recordset[0].photo.toString('base64');
    }

    res.json({
      item: mainItem,
      barcodes: barcodesRes.recordset,
      warehouses: warehouseRes.recordset,
      stockMaster,
      photo: photoBase64
    });
  } catch (err) {
    console.error("Failed to fetch item details:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/items/save', async (req, res) => {
  const { item, barcodes = [], warehouses = [], stockMaster = {}, photo } = req.body;
  if (!item || !item.ITEM_CODE || !item.ITEM_NAME) {
    return res.status(400).json({ error: 'Item Code and Name are required' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. SAVE HD_ITEMMASTER
    const itemCode = String(item.ITEM_CODE);
    const itemReq = new sql.Request(transaction);
    itemReq.input('ITEM_CODE', sql.VarChar(50), itemCode);
    itemReq.input('DESCRIPTION', sql.NVarChar(100), String(item.ITEM_NAME));
    itemReq.input('AR_DESC', sql.NVarChar(75), item.ITEM_ANAME || '');
    itemReq.input('ITM_CAT_CODE', sql.Int, item.ITM_CAT_CODE ? parseInt(item.ITM_CAT_CODE, 10) : null);
    itemReq.input('UNIT', sql.VarChar(50), item.Unit_ID || '');
    itemReq.input('FRACTION', sql.Real, item.QTY_IN_UNIT ? parseFloat(item.QTY_IN_UNIT) : 1);
    itemReq.input('PART_NO', sql.VarChar(50), item.PART_NO || '');
    itemReq.input('BRAND', sql.VarChar(50), item.BRAND || '');
    itemReq.input('ALIAS_NAME', sql.NVarChar(50), item.ALIAS_NAME || '');
    itemReq.input('VAT_PERCENT', sql.Real, item.VAT_PERCENT ? parseFloat(item.VAT_PERCENT) : 0);
    itemReq.input('BARCODE', sql.VarChar(50), item.BARCODE || '');
    itemReq.input('PRICE_INCLUDE_VAT', sql.Bit, item.PRICE_INCLUDE_VAT ? 1 : 0);
    itemReq.input('TAX_CATAGORY', sql.Int, item.TAX_CATAGORY ? parseInt(item.TAX_CATAGORY, 10) : null);
    itemReq.input('non_stock_itm', sql.Int, item.non_stock_itm ? 1 : 0);
    itemReq.input('ITEM_type', sql.Int, item.ITEM_type ? parseInt(item.ITEM_type, 10) : null);
    itemReq.input('Remarks', sql.NVarChar(500), item.Remarks || '');

    // Check if exists in HD_ITEMMASTER
    const checkItem = await new sql.Request(transaction)
      .input('itemCode', sql.VarChar(50), itemCode)
      .query('SELECT 1 FROM dbo.HD_ITEMMASTER WHERE ITEM_CODE = @itemCode');

    if (checkItem.recordset.length > 0) {
      await itemReq.query(`
        UPDATE dbo.HD_ITEMMASTER SET
          DESCRIPTION = @DESCRIPTION, AR_DESC = @AR_DESC, ITM_CAT_CODE = @ITM_CAT_CODE,
          UNIT = @UNIT, FRACTION = @FRACTION, PART_NO = @PART_NO, BRAND = @BRAND,
          ALIAS_NAME = @ALIAS_NAME, VAT_PERCENT = @VAT_PERCENT, BARCODE = @BARCODE,
          PRICE_INCLUDE_VAT = @PRICE_INCLUDE_VAT, TAX_CATAGORY = @TAX_CATAGORY,
          non_stock_itm = @non_stock_itm, ITEM_type = @ITEM_type, Remarks = @Remarks
        WHERE ITEM_CODE = @ITEM_CODE
      `);
    } else {
      await itemReq.query(`
        INSERT INTO dbo.HD_ITEMMASTER (
          ITEM_CODE, DESCRIPTION, AR_DESC, ITM_CAT_CODE, UNIT, FRACTION, PART_NO,
          BRAND, ALIAS_NAME, VAT_PERCENT, BARCODE, PRICE_INCLUDE_VAT, TAX_CATAGORY,
          non_stock_itm, ITEM_type, Remarks
        ) VALUES (
          @ITEM_CODE, @DESCRIPTION, @AR_DESC, @ITM_CAT_CODE, @UNIT, @FRACTION, @PART_NO,
          @BRAND, @ALIAS_NAME, @VAT_PERCENT, @BARCODE, @PRICE_INCLUDE_VAT, @TAX_CATAGORY,
          @non_stock_itm, @ITEM_type, @Remarks
        )
      `);
    }

    // 2. SAVE BARCODES (Delete and Re-insert list)
    await new sql.Request(transaction)
      .input('itemCode', sql.VarChar(50), itemCode)
      .query('DELETE FROM dbo.BARCODE WHERE ITEM_CODE = @itemCode');

    for (const bc of barcodes) {
      if (!bc.BARCODE) continue;
      const bcReq = new sql.Request(transaction);
      bcReq.input('BARCODE', sql.VarChar(50), String(bc.BARCODE));
      bcReq.input('UNIT', sql.VarChar(50), bc.Unit_Id || '');
      bcReq.input('FRACTION', sql.Real, bc.QTY_IN_UNIT ? parseFloat(bc.QTY_IN_UNIT) : 1);
      bcReq.input('SALE_PRICE', sql.Real, bc.WHOLESALE_PRICE ? parseFloat(bc.WHOLESALE_PRICE) : 0);
      bcReq.input('RETAIL_PRICE', sql.Real, bc.RETAIL_PRICE ? parseFloat(bc.RETAIL_PRICE) : 0);
      bcReq.input('ITEM_CODE', sql.VarChar(50), itemCode);
      bcReq.input('BRN_CODE', sql.SmallInt, 1);
      bcReq.input('MAIN_ID', sql.Bit, bc.MAIN_ID ? 1 : 0);
      bcReq.input('DESCRIPTION', sql.NVarChar(150), bc.ITEM_NAME || item.ITEM_NAME);
      bcReq.input('DESCRIPTION_AR', sql.NVarChar(150), bc.ITEM_ANAME || item.ITEM_ANAME || '');
      await bcReq.query(`
        INSERT INTO dbo.BARCODE (
          BARCODE, UNIT, FRACTION, SALE_PRICE, RETAIL_PRICE, ITEM_CODE, BRN_CODE, MAIN_ID, DESCRIPTION, DESCRIPTION_AR
        ) VALUES (
          @BARCODE, @UNIT, @FRACTION, @SALE_PRICE, @RETAIL_PRICE, @ITEM_CODE, @BRN_CODE, @MAIN_ID, @DESCRIPTION, @DESCRIPTION_AR
        )
      `);
    }

    // 3. SAVE WAREHOUSE STOCK (Delete and Re-insert)
    await new sql.Request(transaction)
      .input('itemCode', sql.VarChar(50), itemCode)
      .query('DELETE FROM dbo.WR_STOCK_MASTER WHERE ITEM_CODE = @itemCode');

    let sumOpStock = 0;
    let sumStock = 0;

    for (const wh of warehouses) {
      const whReq = new sql.Request(transaction);
      const opStockVal = wh.OP_STOCK ? parseFloat(wh.OP_STOCK) : 0;
      const stockVal = wh.STOCK ? parseFloat(wh.STOCK) : 0;
      sumOpStock += opStockVal;
      sumStock += stockVal;

      whReq.input('ITEM_CODE', sql.VarChar(50), itemCode);
      whReq.input('STOCK', sql.Float, stockVal);
      whReq.input('LOCATION', sql.NVarChar(50), wh.LOCATION || '');
      whReq.input('BRN_CODE', sql.SmallInt, 1);
      whReq.input('OP_STOCK', sql.Float, opStockVal);
      whReq.input('WR_CODE', sql.SmallInt, parseInt(wh.WR_CODE, 10));

      await whReq.query(`
        INSERT INTO dbo.WR_STOCK_MASTER (
          ITEM_CODE, STOCK, LOCATION, BRN_CODE, OP_STOCK, WR_CODE
        ) VALUES (
          @ITEM_CODE, @STOCK, @LOCATION, @BRN_CODE, @OP_STOCK, @WR_CODE
        )
      `);
    }

    // 4. SAVE STOCK_MASTER
    const smReq = new sql.Request(transaction);
    smReq.input('ITEM_CODE', sql.VarChar(50), itemCode);
    smReq.input('STOCK', sql.Float, sumStock);
    smReq.input('OP_STOCK', sql.Float, sumOpStock);
    smReq.input('LAST_PUR_PRICE', sql.Float, stockMaster.LAST_PUR_PRICE ? parseFloat(stockMaster.LAST_PUR_PRICE) : 0);
    smReq.input('AVG_PUR_PRICE', sql.Real, stockMaster.AVG_PUR_PRICE ? parseFloat(stockMaster.AVG_PUR_PRICE) : 0);
    smReq.input('AVG_EXPENSE_AMT', sql.Numeric(18, 4), stockMaster.AVG_EXPENSE_AMT ? parseFloat(stockMaster.AVG_EXPENSE_AMT) : 0);
    smReq.input('PROFIT', sql.Real, stockMaster.PROFIT ? parseFloat(stockMaster.PROFIT) : 0);
    smReq.input('R_MIN_PROFIT', sql.Real, stockMaster.R_MIN_PROFIT ? parseFloat(stockMaster.R_MIN_PROFIT) : 0);
    smReq.input('W_MIN_PROFIT', sql.Real, stockMaster.W_MIN_PROFIT ? parseFloat(stockMaster.W_MIN_PROFIT) : 0);
    smReq.input('W_MIN_PC', sql.SmallInt, stockMaster.W_MIN_PC ? parseInt(stockMaster.W_MIN_PC, 10) : 0);
    smReq.input('SALES_PROFIT_PCNT', sql.Real, stockMaster.SALES_PROFIT_PCNT ? parseFloat(stockMaster.SALES_PROFIT_PCNT) : 0);

    const checkSM = await new sql.Request(transaction)
      .input('itemCode', sql.VarChar(50), itemCode)
      .query('SELECT 1 FROM dbo.STOCK_MASTER WHERE ITEM_CODE = @itemCode');

    if (checkSM.recordset.length > 0) {
      await smReq.query(`
        UPDATE dbo.STOCK_MASTER SET
          STOCK = @STOCK, OP_STOCK = @OP_STOCK, LAST_PUR_PRICE = @LAST_PUR_PRICE,
          AVG_PUR_PRICE = @AVG_PUR_PRICE, AVG_EXPENSE_AMT = @AVG_EXPENSE_AMT, PROFIT = @PROFIT,
          R_MIN_PROFIT = @R_MIN_PROFIT, W_MIN_PROFIT = @W_MIN_PROFIT, W_MIN_PC = @W_MIN_PC,
          SALES_PROFIT_PCNT = @SALES_PROFIT_PCNT
        WHERE ITEM_CODE = @ITEM_CODE
      `);
    } else {
      await smReq.query(`
        INSERT INTO dbo.STOCK_MASTER (
          ITEM_CODE, STOCK, OP_STOCK, LAST_PUR_PRICE, AVG_PUR_PRICE, AVG_EXPENSE_AMT, PROFIT,
          R_MIN_PROFIT, W_MIN_PROFIT, W_MIN_PC, SALES_PROFIT_PCNT
        ) VALUES (
          @ITEM_CODE, @STOCK, @OP_STOCK, @LAST_PUR_PRICE, @AVG_PUR_PRICE, @AVG_EXPENSE_AMT, @PROFIT,
          @R_MIN_PROFIT, @W_MIN_PROFIT, @W_MIN_PC, @SALES_PROFIT_PCNT
        )
      `);
    }

    // 5. SAVE ITEM IMAGE
    if (photo !== undefined) {
      await new sql.Request(transaction)
        .input('itemCode', sql.VarChar(50), itemCode)
        .query('DELETE FROM dbo.Item_Image WHERE Itemcode = @itemCode');

      if (photo) {
        const imageReq = new sql.Request(transaction);
        const buffer = Buffer.from(photo, 'base64');
        imageReq.input('barcode', sql.VarChar(50), item.BARCODE || '');
        imageReq.input('photo', sql.Image, buffer);
        imageReq.input('Itemcode', sql.NVarChar(50), itemCode);
        imageReq.input('CMP_ID', sql.Int, 1);
        await imageReq.query(`
          INSERT INTO dbo.Item_Image (barcode, photo, Itemcode, CMP_ID)
          VALUES (@barcode, @photo, @Itemcode, @CMP_ID)
        `);
      }
    }

    await transaction.commit();
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save item details:", err);
    try {
      await transaction.rollback();
    } catch (e) {
      console.error("Rollback failed:", e.message);
    }
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


// --- OPENING STOCK / PRICE UPDATE ENDPOINTS ---

app.get('/api/opening-stock/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Search query is required' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('query', sql.VarChar, `%${q}%`)
      .query(`
        SELECT DISTINCT TOP 20 
          H.ITEM_CODE, 
          H.DESCRIPTION, 
          H.BARCODE 
        FROM dbo.HD_ITEMMASTER H
        LEFT JOIN dbo.BARCODE B ON H.ITEM_CODE = B.ITEM_CODE
        WHERE H.ITEM_CODE LIKE @query 
           OR H.DESCRIPTION LIKE @query 
           OR H.BARCODE LIKE @query 
           OR B.BARCODE LIKE @query
        ORDER BY H.DESCRIPTION
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("Opening stock search failed:", error);
    res.status(500).json({ error: 'Database search error', details: error.message });
  }
});

app.get('/api/opening-stock/item/:itemCode', async (req, res) => {
  const { itemCode } = req.params;
  try {
    const pool = await getPool();

    // 1. Get Main Item Row matching the user-defined SQL
    const mainRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT TOP 1
          G.GID,
          H.ITEM_CODE, 
          H.DESCRIPTION,
          H.UNIT AS UNIT_CODE, 
          U.Unit_Name, 
          C.ITM_CAT_NAME, 
          H.FRACTION, 
          H.PART_NO, 
          H.VAT_PERCENT, 
          H.PRICE_INCLUDE_VAT, 
          S1.STOCK, 
          S1.AVG_PUR_PRICE AS COST_PRICE,
          G.DOC_NO 
        FROM dbo.HD_ITEMMASTER AS H 
        INNER JOIN dbo.ITEM_CAT AS C ON H.ITM_CAT_CODE = C.ITM_CAT_CODE 
        INNER JOIN dbo.UnitMaster AS U ON H.UNIT = U.Unit_id 
        INNER JOIN dbo.STOCK_MASTER AS S1 ON H.ITEM_CODE = S1.ITEM_CODE
        LEFT JOIN (
          SELECT ITEM_CODE, MAX(ID) AS GID, MAX(INVOICE_NO) AS DOC_NO 
          FROM dbo.DATA_ENTRY_GRID 
          WHERE TRN_TYPE = 0 
          GROUP BY ITEM_CODE
        ) AS G ON G.ITEM_CODE = H.ITEM_CODE
        WHERE H.ITEM_CODE = @itemCode
      `);

    if (mainRes.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found in master records' });
    }
    const itemDetail = mainRes.recordset[0];

    // 2. Query Barcode Details
    const barcodesRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT BARCODE, UNIT, FRACTION, SALE_PRICE, RETAIL_PRICE, DESCRIPTION, DESCRIPTION_AR
        FROM dbo.BARCODE 
        WHERE ITEM_CODE = @itemCode
      `);

    // 3. Query Stock Info per Warehouse using left-join to make sure all warehouses are returned
    const stockRes = await pool.request()
      .input('itemCode', sql.VarChar(50), itemCode)
      .query(`
        SELECT 
          W.WR_CODE, 
          W.WR_NAME, 
          COALESCE(S.OP_STOCK, 0) AS OP_STOCK, 
          COALESCE(S.STOCK, 0) AS STOCK, 
          COALESCE(S.LOCATION, '') AS LOCATION
        FROM dbo.WRHOUSE_MASTER AS W
        LEFT JOIN dbo.WR_STOCK_MASTER AS S ON S.WR_CODE = W.WR_CODE AND S.ITEM_CODE = @itemCode
        ORDER BY W.WR_NAME
      `);

    // 4. Query All Units for Dropdown selection
    const unitsRes = await pool.request().query(`
      SELECT Unit_id, Unit_Name, Unit_AName, QTY 
      FROM dbo.UnitMaster 
      WHERE UNIT_TYPE = 'I' 
      ORDER BY Unit_id
    `);

    res.json({
      item: itemDetail,
      barcodes: barcodesRes.recordset,
      warehouses: stockRes.recordset,
      units: unitsRes.recordset
    });
  } catch (err) {
    console.error("Failed to load opening stock details:", err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/opening-stock/save', async (req, res) => {
  const { item, barcodes = [], warehouses = [], invoiceNo = '', remarks = '', userId = '1' } = req.body;
  if (!item || !item.ITEM_CODE) {
    return res.status(400).json({ error: 'Item details are required' });
  }

  const userIdNum = parseInt(userId, 10) || 1;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    // Dynamic Stored Procedure creation if missing (failsafe design)
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[usp_InsertUpdate_GridItem]') AND type in (N'P', N'PC'))
      BEGIN
        EXEC('
          CREATE PROCEDURE dbo.usp_InsertUpdate_GridItem
          (
              @BARCODE      NVARCHAR(100),
              @DESCRIPTION  NVARCHAR(255),
              @UNIT         NVARCHAR(50),
              @QTY          DECIMAL(18,2),
              @PRICE        DECIMAL(18,2),
              @VAT_PERCENT  DECIMAL(18,2),
              @INVOICE_NO   NVARCHAR(50),
              @TRN_TYPE     NVARCHAR(50),
              @REMARKS      NVARCHAR(500),
              @WR_CODE      NVARCHAR(50),
              @USER_ID      NVARCHAR(50)
          )
          AS
          BEGIN
              SET NOCOUNT ON;
              IF EXISTS (SELECT 1 FROM dbo.GRID_ITEM WHERE INVOICE_NO = @INVOICE_NO AND TRN_TYPE = @TRN_TYPE AND BARCODE = @BARCODE)
              BEGIN
                  UPDATE dbo.GRID_ITEM 
                  SET QTY = @QTY, PRICE = @PRICE, VAT_PERCENT = @VAT_PERCENT, REMARKS = @REMARKS, WR_CODE = @WR_CODE, DESCRIPTION = @DESCRIPTION, UNIT = @UNIT
                  WHERE INVOICE_NO = @INVOICE_NO AND TRN_TYPE = @TRN_TYPE AND BARCODE = @BARCODE;
              END
              ELSE
              BEGIN
                  INSERT INTO dbo.GRID_ITEM (BARCODE, DESCRIPTION, UNIT, QTY, PRICE, VAT_PERCENT, INVOICE_NO, TRN_TYPE, REMARKS, WR_CODE)
                  VALUES (@BARCODE, @DESCRIPTION, @UNIT, @QTY, @PRICE, @VAT_PERCENT, @INVOICE_NO, @TRN_TYPE, @REMARKS, @WR_CODE);
              END
          END
        ')
      END
    `);

    await transaction.begin();

    // Loop through warehouses to run the stored procedure per warehouse
    for (const wh of warehouses) {
      const opStockVal = parseFloat(wh.OP_STOCK) || 0;

      const spReq = new sql.Request(transaction);
      spReq.input('BARCODE', sql.NVarChar(100), String(item.BARCODE || barcodes[0]?.BARCODE || ''));
      spReq.input('DESCRIPTION', sql.NVarChar(255), String(item.DESCRIPTION || ''));
      spReq.input('UNIT', sql.NVarChar(50), String(item.UNIT_CODE || ''));
      spReq.input('QTY', sql.Decimal(18, 2), opStockVal);
      spReq.input('PRICE', sql.Decimal(18, 2), parseFloat(item.COST_PRICE) || 0);
      spReq.input('VAT_PERCENT', sql.Decimal(18, 2), parseFloat(item.VAT_PERCENT) || 0);
      spReq.input('INVOICE_NO', sql.NVarChar(50), (invoiceNo && String(invoiceNo).trim() !== '') ? String(invoiceNo) : null);
      spReq.input('TRN_TYPE', sql.NVarChar(50), '0');
      spReq.input('REMARKS', sql.NVarChar(500), String(remarks || ''));
      spReq.input('WR_CODE', sql.NVarChar(50), String(wh.WR_CODE));
      spReq.input('USER_ID', sql.NVarChar(50), String(userIdNum));

      await spReq.execute('dbo.usp_InsertUpdate_GridItem');
    }

    await transaction.commit();
    console.log(`✅ Stored procedure usp_InsertUpdate_GridItem called successfully for Item: ${item.ITEM_CODE}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to execute opening stock stored procedure:", err);
    try {
      await transaction.rollback();
    } catch (rollErr) {
      console.error("Rollback failed:", rollErr.message);
    }
    res.status(500).json({ error: 'Database transaction error', details: err.message });
  }
});

app.get('/api/user-entry-options', async (req, res) => {
  const { userId, trnType } = req.query;
  if (!userId || !trnType) {
    return res.status(400).json({ error: 'userId and trnType are required' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('trnType', sql.Int, parseInt(trnType))
      .query(`
        SELECT 
          User_id as user_id, 
          Trn_type as Trn_Type, 
          Auto_Print as Auto_print, 
          Default_Print_Paper as Default_Print_paper, 
          Show_Invoice as Show_Invoce, 
          Auto_Next_line as Auto_next_Line, 
          grid_columns as grid_coolums, 
          Crystal_Print
        FROM dbo.User_Entry_Options
        WHERE User_id = @userId AND Trn_type = @trnType
      `);
    if (result.recordset.length > 0) {
      res.json({ success: true, options: result.recordset[0] });
    } else {
      res.json({
        success: true,
        options: {
          user_id: userId,
          Trn_Type: parseInt(trnType),
          Auto_print: 0,
          Default_Print_paper: 'Thermal',
          Show_Invoce: 1,
          Auto_next_Line: 0,
          grid_coolums: '1111111111',
          Crystal_Print: 0
        }
      });
    }
  } catch (err) {
    console.error("Failed to fetch user entry options:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user-entry-options', async (req, res) => {
  const { userId, trnType, autoPrint, defaultPrintPaper, showInvoce, autoNextLine, gridCoolums, crystalPrint } = req.body;
  if (!userId || !trnType) {
    return res.status(400).json({ error: 'userId and trnType are required' });
  }
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', sql.Int, parseInt(userId))
      .input('trnType', sql.Int, parseInt(trnType))
      .input('autoPrint', sql.Bit, autoPrint ? 1 : 0)
      .input('defaultPrintPaper', sql.NVarChar(50), String(defaultPrintPaper || 'Thermal'))
      .input('showInvoice', sql.Bit, showInvoce ? 1 : 0)
      .input('autoNextLine', sql.Bit, autoNextLine ? 1 : 0)
      .input('gridColumns', sql.NVarChar(50), String(gridCoolums || '1111111111'))
      .input('crystalPrint', sql.Bit, crystalPrint ? 1 : 0)
      .query(`
        MERGE dbo.User_Entry_Options AS target
        USING (SELECT @userId AS User_id, @trnType AS Trn_type) AS source
        ON (target.User_id = source.User_id AND target.Trn_type = source.Trn_type)
        WHEN MATCHED THEN
          UPDATE SET 
            Auto_Print = @autoPrint,
            Default_Print_Paper = @defaultPrintPaper,
            Show_Invoice = @showInvoice,
            Auto_Next_line = @autoNextLine,
            grid_columns = @gridColumns,
            Crystal_Print = @crystalPrint
        WHEN NOT MATCHED THEN
          INSERT (User_id, Trn_type, Auto_Print, Default_Print_Paper, Show_Invoice, Auto_Next_line, grid_columns, Crystal_Print)
          VALUES (@userId, @trnType, @autoPrint, @defaultPrintPaper, @showInvoice, @autoNextLine, @gridColumns, @crystalPrint);
      `);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to save user entry options:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoice-qrcode', async (req, res) => {
  const { invoiceNo, trnType, brnCode } = req.query;
  if (!invoiceNo) {
    return res.status(400).json({ error: 'invoiceNo is required' });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
      .input('trnType', sql.Int, parseInt(trnType) || 6)
      .input('brnCode', sql.Int, parseInt(brnCode) || 1)
      .query(`
        SELECT ISNULL(qr_coe, image) AS qrcode_image
        FROM dbo.Innv_image1
        WHERE cmp_id = 1
          AND brn_code = @brnCode
          AND Invoice_no = @invoiceNo
          AND trn_type = @trnType
      `);

    if (result.recordset && result.recordset.length > 0 && result.recordset[0].qrcode_image) {
      const qrcodeBuffer = result.recordset[0].qrcode_image;
      const base64 = qrcodeBuffer.toString('base64');
      return res.json({ success: true, qrCode: `data:image/png;base64,${base64}` });
    } else {
      return res.json({ success: true, qrCode: null });
    }
  } catch (err) {
    console.error("Failed to fetch invoice QR code:", err);
    return res.json({ success: true, qrCode: null, warning: 'Database error or table missing' });
  }
});

app.post('/api/print-crystal', async (req, res) => {
  const { invoiceNo, trnType, brnCode, netAmount, printPaper } = req.body;
  if (!invoiceNo) {
    return res.status(400).json({ error: 'invoiceNo is required' });
  }

  // Match the frontend <select> index: Thermal = 0, A4 = 1
  const reportIndex = printPaper === 'A4' ? 1 : 0;
  const reportName = `Invoice_${reportIndex}.rpt`;
  const reportPath = path.join(__dirname, 'Reports', reportName);

  if (!fs.existsSync(reportPath)) {
    return res.status(400).json({ error: `Report template not found at ${reportPath}` });
  }

  const dbServer = process.env.DB_SERVER || process.env.DB_HOST || 'localhost';
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;

  const exePath = path.join(__dirname, 'Reports', 'CrystalPrinter.exe');

  if (!fs.existsSync(exePath)) {
    return res.status(500).json({ error: 'CrystalPrinter utility not found. Please compile it.' });
  }

  // Create a unique temporary PDF path
  const pdfFileName = `Invoice_${invoiceNo}_${Date.now()}.pdf`;
  const pdfPath = path.join(__dirname, 'Reports', pdfFileName);

  const args = [
    '--report', reportPath,
    '--server', dbServer,
    '--database', dbName,
    '--user', dbUser,
    '--password', dbPassword,
    '--brn', String(brnCode || '1'),
    '--invoice', String(invoiceNo),
    '--type', String(trnType || 6),
    '--amount', String(netAmount || 0),
    '--pdf', pdfPath
  ];

  console.log(`Executing CrystalPrinter.exe for invoice ${invoiceNo} (PDF: ${pdfFileName})...`);

  execFile(exePath, args, (error, stdout, stderr) => {
    if (error) {
      console.error(`Crystal Reports Printing failed:`, error);
      return res.status(500).json({ error: 'Printing failed', details: error.message, stderr, stdout });
    }

    if (fs.existsSync(pdfPath)) {
      try {
        const pdfBuffer = fs.readFileSync(pdfPath);
        const base64 = pdfBuffer.toString('base64');
        fs.unlinkSync(pdfPath); // Cleanup
        return res.json({ success: true, pdfBase64: base64, output: stdout });
      } catch (err) {
        console.error("Failed to read generated PDF:", err);
        return res.status(500).json({ error: 'Failed to read generated PDF', details: err.message });
      }
    } else {
      return res.status(500).json({ error: 'PDF was not generated by CrystalPrinter.exe', stdout });
    }
  });
});

app.get('/api/application-setup', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT * FROM dbo.AC_OPTIONS WHERE ID = 1');
    res.json({ success: true, data: result.recordset[0] || {} });
  } catch (err) {
    console.error('Failed to get application setup:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/application-setup', async (req, res) => {
  try {
    const pool = await getPool();
    const data = req.body;

    const cleanData = {};
    Object.keys(data).forEach(k => {
      // Force empty strings to null for better DB compatibility
      cleanData[k] = data[k] === '' ? null : data[k];
    });

    const existing = await pool.request().query('SELECT ID FROM dbo.AC_OPTIONS WHERE ID = 1');

    if (existing.recordset.length > 0) {
      // UPDATE existing row
      let setClause = Object.keys(cleanData).filter(k => k !== 'ID').map(k => `[${k}] = @${k}`).join(', ');
      if (!setClause) return res.json({ success: true });

      let q = pool.request();
      Object.keys(cleanData).forEach(k => {
        if (k !== 'ID') q.input(k, cleanData[k]);
      });
      q.input('ID', 1);
      await q.query(`UPDATE dbo.AC_OPTIONS SET ${setClause} WHERE ID = @ID`);

    } else {
      // INSERT new row with ID = 1
      let cols = Object.keys(cleanData).filter(k => k !== 'ID').map(k => `[${k}]`).join(', ');
      let vals = Object.keys(cleanData).filter(k => k !== 'ID').map(k => `@${k}`).join(', ');

      if (!cols) {
        cols = '[ID]';
        vals = '1';
      } else {
        cols = '[ID], ' + cols;
        vals = '1, ' + vals;
      }

      let q = pool.request();
      Object.keys(cleanData).forEach(k => {
        if (k !== 'ID') q.input(k, cleanData[k]);
      });
      await q.query(`INSERT INTO dbo.AC_OPTIONS (${cols}) VALUES (${vals})`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save application setup:', err);
    res.status(500).json({ error: err.message, details: err.originalError?.info?.message || '' });
  }
});

app.get('/api/zatca/invoices', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TOP 100
        e.REC_NO,
        e.invoice_no as INVOICE_NO,
        e.TRN_TYPE,
        e.CURDATE,
        e.ENAME,
        e.NET_AMOUNT,
        e.CURRENCY_CODE,
        e.QR_CODE,
        e.ZATCA_SEND
      FROM dbo.DATA_ENTRY e
      WHERE e.TRN_TYPE IN (6, 7, 3, 4)
      ORDER BY e.CURDATE DESC, e.invoice_no DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Failed to fetch ZATCA invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/zatca/submit', async (req, res) => {
  const { invoiceNo, trnType } = req.body;
  if (!invoiceNo || !trnType) {
    return res.status(400).json({ error: 'invoiceNo and trnType are required' });
  }

  try {
    const pool = await getPool();

    // 1. Fetch options
    const optionsResult = await pool.request().query('SELECT TOP 1 * FROM dbo.AC_OPTIONS WHERE ID = 1');
    const options = optionsResult.recordset[0] || {};
    const envId = options.ZATCA_ENV_ID || options.zatca_env_id || 1;
    const envType = options.ZATCA_ENV_TYPE || options.zatca_env_type || 'TEST';
    const apiUrlXml = options.API_URL_XML;
    const apiUrlSubmit = options.API_URL_SUBMIT;
    const cashSaleAc = options.CASH_SALE_AC;
    const cashPurAc = options.CASH_PUR_AC;

    if (!apiUrlXml || !apiUrlSubmit) {
      return res.status(400).json({ error: 'ZATCA API URLs are not configured in Application Setup' });
    }

    // 2. Fetch company and ZATCA credentials
    const cmpResult = await pool.request()
      .input('envId', sql.Int, envId)
      .query(`
        SELECT TOP 1
          C.CR_NO AS cr_number,
          C.CompanyName,
          C.CompanyAName,
          C.Vat_RegName,
          C.Vat_ARegName,
          C.Address1,
          C.Address2,
          C.Address3,
          C.Building_No,
          C.Ecity AS ecity,
          C.Acity AS acity,
          C.Address1_Ar,
          C.Address2_Ar,
          C.Address3_Ar,
          C.Postal_Zone AS postal_zone,
          C.esubcity,
          C.asubcity,
          a.pih,
          A.UID as uid,
          A.private_key,
          A.x509_certificate as certificate,
          A.x509_secret,
          A.CSID as csid,
          A.secret_csid,
          A.Vat_number AS vat_Tinno,
          C.ID as cmp_id,
          A.ENV_ID as env_id,
          1 as brn_code
        FROM dbo.COMPANY as c 
        LEFT JOIN dbo.ZATCA_CREDENTIAL as A on a.cmp_id=c.id 
        WHERE A.ENV_ID = @envId
      `);
    const cmpRaw = cmpResult.recordset[0];
    if (!cmpRaw) {
      return res.status(400).json({ error: 'ZATCA Credentials or Company info not found for the configured environment' });
    }

    const cmp = {
      uid: String(cmpRaw.uid || ''),
      cr_number: String(cmpRaw.cr_number || ''),
      CompanyName: String(cmpRaw.CompanyName || ''),
      CompanyAName: String(cmpRaw.CompanyAName || ''),
      Vat_RegName: String(cmpRaw.Vat_RegName || ''),
      Vat_ARegName: String(cmpRaw.Vat_ARegName || ''),
      vat_Tinno: String(cmpRaw.vat_Tinno || ''),
      Address1: String(cmpRaw.Address1 || ''),
      Address2: String(cmpRaw.Address2 || ''),
      Address3: String(cmpRaw.Address3 || ''),
      Building_No: String(cmpRaw.Building_No || ''),
      Ecity: String(cmpRaw.ecity || ''),
      Acity: String(cmpRaw.acity || ''),
      Address1_Ar: String(cmpRaw.Address1_Ar || ''),
      Address2_Ar: String(cmpRaw.Address2_Ar || ''),
      Address3_Ar: String(cmpRaw.Address3_Ar || ''),
      Postal_Zone: String(cmpRaw.postal_zone || ''),
      esubcity: String(cmpRaw.esubcity || ''),
      asubcity: String(cmpRaw.asubcity || ''),
      pih: String(cmpRaw.pih || ''),
      private_key: String(cmpRaw.private_key || ''),
      certificate: String(cmpRaw.certificate || ''),
      x509_secret: String(cmpRaw.x509_secret || ''),
      csid: String(cmpRaw.csid || ''),
      secret_csid: String(cmpRaw.secret_csid || ''),
      brn_code: String(cmpRaw.brn_code || '1'),
      cmp_id: String(cmpRaw.cmp_id || '1'),
      env_id: String(cmpRaw.env_id || '1')
    };

    // 3. Fetch invoice summary (inv) and ACCODE/VAT_AMOUNT for customer logic
    const invResult = await pool.request()
      .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
      .input('trnType', sql.Int, parseInt(trnType))
      .query(`
        SELECT 
          e.invoice_no as inv_number, 
          CONVERT(VARCHAR(19), CURDATE, 120) as inv_date, 
          G_TOTAL as tot_amount, 
          DISC_PRCNT as Disc_prcnt, 
          DISC_AMT as Disc_amount, 
          NET_AMOUNT as net_amount, 
          vat_amount as vat_amount, 
          e.TRN_TYPE as trn_type, 
          isnull(CASH_PAID,0) + isnull(other_paid,0) as cash_paid,
          VAT_number as cus_vatnumber, 
          VAT_PERCENT as vat_percent,  
          cast(PRICE_INCLUDE_VAT as varchar) as price_include_vat, 
          TAXABLE_AMOUNT as taxabale_amount, 
          CONVERT(VARCHAR(19), REF_DELIVERY_DATE, 120) as delivery_date,
          i.pih,
          ref_no as inv_refno,
          e.ACCODE as customer_acc,
          e.vat_amount as raw_vat_amount
        FROM dbo.DATA_ENTRY E 
        LEFT JOIN dbo.inv_image1 as i on e.trn_type=i.trn_type and e.invoice_no=i.invoice_no 
        WHERE e.trn_type = @trnType and e.invoice_no = @invoiceNo
      `);
    const invRaw = invResult.recordset[0];
    if (!invRaw) {
      return res.status(400).json({ error: `Invoice #${invoiceNo} not found` });
    }

    // Format fields to string matching C# types as requested
    const inv = {
      trn_type: String(invRaw.trn_type),
      cus_vatnumber: invRaw.cus_vatnumber ? String(invRaw.cus_vatnumber) : null,
      inv_date: String(invRaw.inv_date),
      inv_number: String(invRaw.inv_number),
      tot_amount: String(invRaw.tot_amount || 0),
      net_amount: String(invRaw.net_amount || 0),
      taxabale_amount: String(invRaw.taxabale_amount || 0),
      vat_amount: String(invRaw.vat_amount || 0),
      delivery_date: invRaw.delivery_date ? String(invRaw.delivery_date) : null,
      pih: invRaw.pih ? String(invRaw.pih) : null,
      inv_refno: invRaw.inv_refno ? String(invRaw.inv_refno) : null,
      amount_paid: String(invRaw.cash_paid || 0),
      price_include_vat: String(invRaw.price_include_vat || '0'),
      vat_percent: String(invRaw.vat_percent || 0),
      disc_prcnt: String(invRaw.Disc_prcnt || 0),
      disc_amount: String(invRaw.Disc_amount || 0),
      xml_path: '',
      xml_Spath: '',
      error: '',
      qrcode: '',
      qrimg: null,
      Incoded64Invoice: '',
      inv_hash: '',
      inv_xml_status: false,
      save_qrImg: 0,
      create_P2qr: 0,
      success: false,
      summary: ''
    };

    // 4. Fetch invoice details (items)
    const itemsResult = await pool.request()
      .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
      .input('trnType', sql.Int, parseInt(trnType))
      .query(`
        SELECT 
          item_code, 
          DESCRIPTION as item_name, 
          isnull('', '') as item_aname, 
          G.qty as item_qty, 
          fprice as item_price,
          VAT_PERCENT as item_vat_percent, 
          VAT_AMOUNT as item_vat_amount, 
          TAXABLE_AMOUNT as item_taxable_price, 
          DISC as item_discount,
          isnull(Unit_name, 'Piece') as item_unit_name 
        FROM dbo.data_entry_grid as g 
        LEFT JOIN dbo.unitmaster as u on g.unit=u.unit_id 
        WHERE trn_type = @trnType and invoice_no = @invoiceNo
      `);
    const items = itemsResult.recordset.map(it => ({
      item_code: String(it.item_code),
      item_name: String(it.item_name || ''),
      item_aname: String(it.item_aname || ''),
      item_qty: String(it.item_qty || 0),
      item_price: String(it.item_price || 0),
      item_vat_percent: String(it.item_vat_percent || 0),
      item_vat_amount: String(it.item_vat_amount || 0),
      item_net_amount: String((Number(it.item_qty) * Number(it.item_price)) || 0),
      item_taxable_price: String(it.item_taxable_price || 0),
      item_discount: String(it.item_discount || 0),
      item_unit_name: String(it.item_unit_name || 'Piece'),
      error: ''
    }));

    // 5. Fetch customer info (cus)
    const customerAcc = invRaw.customer_acc;
    const rawVatAmt = invRaw.raw_vat_amount;
    let cusResult;
    const isCashSale = (customerAcc === cashSaleAc || customerAcc === cashPurAc) && rawVatAmt !== null && rawVatAmt !== undefined;

    if (isCashSale) {
      cusResult = await pool.request()
        .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
        .input('trnType', sql.Int, parseInt(trnType))
        .input('customerAcc', sql.NVarChar(50), String(customerAcc))
        .query(`
          SELECT 
            a.ACCODE AS acc_no,
            a.Ename AS acc_name,
            '' AS acc_aname, 
            isnull(street_name,'') as street_name,
            '' as street_aname,  
            isnull(city_name,'') as city_name,
            '' as city_aname,
            isnull(city_subdivision_name,'') as city_subdivision_name,
            '' as city_subdivision_aname,  
            isnull(building_no,'1000') as cus_building_no,  
            isnull(postal_zone,'12345') as postal_zone,
            '' as regsitered_name  
          FROM dbo.DATA_ENTRY AS A  
          LEFT JOIN dbo.cash_acc_info as c ON a.accode=c.acc_no and a.invoice_no=c.invoice_no  
          WHERE A.invoice_no = @invoiceNo and A.trn_type = @trnType and a.ACCODE = @customerAcc
        `);
    } else {
      cusResult = await pool.request()
        .input('customerAcc', sql.NVarChar(50), String(customerAcc))
        .query(`
          SELECT 
            b.ACC_NO as acc_no, 
            b.ACC_NAME as acc_name, 
            b.ACC_ANAME as acc_aname,  
            isnull(street_name,'') as street_name,
            '' as street_aname,  
            isnull(city_name,'') as city_name, 
            isnull(city_aname,'') as city_aname,
            isnull(city_subdivision_name,'') as city_subdivision_name,
            '' as city_subdivision_aname, 
            isnull(building_no,'1000') as cus_building_no, 
            isnull(postal_zone,'11111') as postal_zone,
            '' as regsitered_name 
          FROM dbo.ACCOUNTS_INFO as b 
          WHERE b.ACC_NO = @customerAcc
        `);
    }

    const cusRaw = cusResult.recordset[0] || {};
    const cus = {
      ACC_NO: String(cusRaw.acc_no || ''),
      ACC_NAME: String(cusRaw.acc_name || ''),
      ACC_ANAME: String(cusRaw.acc_aname || ''),
      VAT_Tinno: String(cusRaw.vat_Tinno || ''),
      street_name: String(cusRaw.street_name || ''),
      street_aname: String(cusRaw.street_aname || ''),
      city_subdivision_name: String(cusRaw.city_subdivision_name || ''),
      city_subdivision_aname: String(cusRaw.city_subdivision_aname || ''),
      city_name: String(cusRaw.city_name || ''),
      city_aname: String(cusRaw.city_aname || ''),
      postal_zone: String(cusRaw.postal_zone || ''),
      cus_building_no: String(cusRaw.cus_building_no || ''),
      regsitered_name: String(cusRaw.regsitered_name || '')
    };

    // 6. Call the XML API
    console.log(`Sending to XML API URL: ${apiUrlXml}`);
    const xmlResponse = await fetch(apiUrlXml, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cus, cmp, inv, items })
    });

    if (!xmlResponse.ok) {
      const errorText = await xmlResponse.text();
      // Update qr_code = 2 on XML API error
      await pool.request()
        .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
        .input('trnType', sql.Int, parseInt(trnType))
        .query('UPDATE dbo.DATA_ENTRY SET QR_CODE = 2 WHERE invoice_no = @invoiceNo and trn_type = @trnType');
      return res.status(500).json({ success: false, error: 'XML API Call failed', details: errorText });
    }

    let xmlResult = await xmlResponse.json();
    console.log('XML Response Result:', xmlResult);

    // Some versions of the API wrap the payload in a 'result' object
    if (xmlResult && xmlResult.result) {
      xmlResult = xmlResult.result;
    }

    // If XML creation succeeded
    if (xmlResult.success || xmlResult.Incoded64Invoice || xmlResult.incoded64Invoice) {
      // Update qr_code = 1
      await pool.request()
        .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
        .input('trnType', sql.Int, parseInt(trnType))
        .query('UPDATE dbo.DATA_ENTRY SET QR_CODE = 1 WHERE invoice_no = @invoiceNo and trn_type = @trnType');

      // 7. Call the Submit API
      let submitUsername = '';
      let submitPassword = '';

      if (envType === 'TEST') {
        submitUsername = cmp.csid || '';
        submitPassword = cmp.secret_csid || '';
      } else if (envType === 'PROD') {
        submitUsername = cmp.certificate || '';
        submitPassword = cmp.x509_secret || '';
      } else {
        submitUsername = cmp.csid || cmp.certificate || '';
        submitPassword = cmp.secret_csid || '';
      }

      // Fetch the generated Inv_hash and Inv_base64 directly from the database table (Inv_Image1) as required
      const submitInfoResult = await pool.request()
        .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
        .input('trnType', sql.Int, parseInt(trnType))
        .input('cmpId', sql.Int, parseInt(cmp.cmp_id) || 0)
        .input('brnCode', sql.NVarChar(50), String(cmp.brn_code || '1'))
        .query('SELECT TOP 1 Inv_hash, Inv_base64 FROM dbo.Inv_Image1 WHERE invoice_no = @invoiceNo AND trn_type = @trnType AND cmp_id = @cmpId AND brn_code = @brnCode');

      const submitInfo = submitInfoResult.recordset[0] || {};
      const finalInvHash = submitInfo.Inv_hash || xmlResult.inv_hash || xmlResult.Inv_hash || '';
      const finalInvBase64 = submitInfo.Inv_base64 || xmlResult.Incoded64Invoice || xmlResult.incoded64Invoice || '';

      // Calculate dynamic ZATCA Fatoora Portal URL ID based on environment and VAT number
      let url_id = 6;
      const envIdStr = String(envId);
      const cusVatLength = String(cus.vat_Tinno || '').length;

      if (envIdStr === "0") {
        url_id = 4;
      } else if (envIdStr === "1") {
        if (envType === "TEST") {
          url_id = 2;
        } else if (envType === "PROD") {
          url_id = cusVatLength < 15 ? 12 : 14;
        }
      } else if (envIdStr === "2") {
        if (envType === "TEST") {
          url_id = 6;
        } else if (envType === "PROD") {
          url_id = cusVatLength < 15 ? 17 : 15;
        }
      } else if (envIdStr === "3") {
        if (envType === "TEST") {
          url_id = 11;
        } else if (envType === "PROD") {
          url_id = cusVatLength < 15 ? 13 : 16;
        }
      }

      // Fetch the actual URL from Zatca_weburls table
      const urlResult = await pool.request()
        .input('urlId', sql.Int, url_id)
        .query('SELECT TOP 1 url FROM dbo.Zatca_weburls WHERE ID = @urlId');

      const targetPortalUrl = urlResult.recordset[0]?.url || '';

      const submitPayload = {
        url: targetPortalUrl,
        Inv_hash: finalInvHash,
        uid: cmp.uid || '',
        Inv_base64: finalInvBase64,
        username: submitUsername,
        password: submitPassword,
        invno: String(invoiceNo)
      };

      console.log(`Sending to Submit API URL: ${apiUrlSubmit}`);
      const submitResponse = await fetch(apiUrlSubmit, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitPayload)
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        // Update zatca_send = 2 on error
        await pool.request()
          .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
          .input('trnType', sql.Int, parseInt(trnType))
          .query('UPDATE dbo.DATA_ENTRY SET ZATCA_SEND = 2 WHERE invoice_no = @invoiceNo and trn_type = @trnType');
        return res.json({ success: false, error: 'Submission API Call failed', details: errorText, xmlResult });
      }

      const submitResult = await submitResponse.json();
      console.log('Submit Response Result:', submitResult);

      if (submitResult.success || submitResult.reportingStatus === 'REPORTED' || submitResult.clearanceStatus === 'CLEARED') {
        // Update zatca_send = 1
        await pool.request()
          .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
          .input('trnType', sql.Int, parseInt(trnType))
          .query('UPDATE dbo.DATA_ENTRY SET ZATCA_SEND = 1 WHERE invoice_no = @invoiceNo and trn_type = @trnType');
        return res.json({ success: true, message: 'ZATCA Invoice Submitted Successfully', xmlResult, submitResult });
      } else {
        // Update zatca_send = 2
        await pool.request()
          .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
          .input('trnType', sql.Int, parseInt(trnType))
          .query('UPDATE dbo.DATA_ENTRY SET ZATCA_SEND = 2 WHERE invoice_no = @invoiceNo and trn_type = @trnType');
        return res.json({ success: false, error: 'ZATCA Submission rejected/warned', xmlResult, submitResult });
      }
    } else {
      // XML failed
      await pool.request()
        .input('invoiceNo', sql.NVarChar(50), String(invoiceNo))
        .input('trnType', sql.Int, parseInt(trnType))
        .query('UPDATE dbo.DATA_ENTRY SET QR_CODE = 2 WHERE invoice_no = @invoiceNo and trn_type = @trnType');
      return res.json({ success: false, error: 'ZATCA XML Generation failed, Error1:' + xmlResult.success + ':' + xmlResult.Incoded64Invoice, xmlResult });
    }

  } catch (err) {
    console.error('ZATCA submit endpoint failed:', err);

    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// --- REPORT APIs ---


// =============================================
// STOCK REPORT APIs
// =============================================

// GET Item Categories for dropdown
app.get('/api/reports/item-categories', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ITM_CAT_CODE, ITM_CAT_NAME, ITM_CAT_ANAME, VAT_PERCENT
      FROM dbo.ITEM_CAT
      ORDER BY ITM_CAT_NAME
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Item categories fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Stock Report Data
app.get('/api/reports/stock', async (req, res) => {
  try {
    const pool = await getPool();
    const { fromDate, toDate, categoryCode, dateFilter } = req.query;

    const request = pool.request();
    let catWhere = '';

    if (categoryCode && categoryCode !== '0') {
      catWhere = 'AND H.ITM_CAT_CODE = @catCode';
      request.input('catCode', sql.VarChar(50), categoryCode);
    }

    let result;

    if (dateFilter === 'custom' && fromDate && toDate) {
      // Date-range query: stock movement from DATA_ENTRY_GRID within the period
      request.input('dt1', sql.VarChar(20), fromDate);
      request.input('dt2', sql.VarChar(20), toDate);

      result = await request.query(`
        SELECT
          H.ITEM_CODE,
          H.DESCRIPTION AS ITEM_NAME,
          H.AR_DESC AS ITEM_ANAME,
          C.ITM_CAT_NAME AS GROUP_NAME,
          C.ITM_CAT_ANAME AS GROUP_ANAME,
          U.Unit_Name,
          U.Unit_AName,
          g.STOCK,
          S.AVG_PUR_PRICE AS COST,
          S.RETAIL_PRICE AS SALE_PRICE,
          g.STOCK * S.AVG_PUR_PRICE AS TOTAL_COST,
          g.STOCK * S.RETAIL_PRICE AS TOTAL_AMOUNT
        FROM dbo.HD_ITEMMASTER AS H
        INNER JOIN dbo.ITEM_CAT AS C ON C.ITM_CAT_CODE = H.ITM_CAT_CODE
        INNER JOIN dbo.UnitMaster AS U ON H.UNIT = U.Unit_id
        INNER JOIN dbo.STOCK_MASTER AS S ON H.ITEM_CODE = S.ITEM_CODE
        INNER JOIN (
          SELECT g2.ITEM_CODE,
            SUM(CASE WHEN d2.TRN_TYPE < 6 THEN g2.QTY ELSE g2.QTY * -1 END) AS STOCK
          FROM dbo.DATA_ENTRY_GRID AS g2
          INNER JOIN dbo.DATA_ENTRY AS d2 ON g2.REC_NO = d2.REC_NO
          WHERE CONVERT(DATE, d2.CURDATE) BETWEEN CONVERT(DATE, @dt1) AND CONVERT(DATE, @dt2)
          GROUP BY g2.ITEM_CODE
        ) AS g ON H.ITEM_CODE = g.ITEM_CODE
        WHERE 1=1 ${catWhere}
        ORDER BY H.DESCRIPTION
      `);
    } else {
      // All-time query: use STOCK_MASTER current stock
      result = await request.query(`
        SELECT
          H.ITEM_CODE,
          H.DESCRIPTION AS ITEM_NAME,
          H.AR_DESC AS ITEM_ANAME,
          C.ITM_CAT_NAME AS GROUP_NAME,
          C.ITM_CAT_ANAME AS GROUP_ANAME,
          U.Unit_Name,
          U.Unit_AName,
          S.STOCK,
          S.AVG_PUR_PRICE AS COST,
          S.RETAIL_PRICE AS SALE_PRICE,
          S.STOCK * S.AVG_PUR_PRICE AS TOTAL_COST,
          S.STOCK * S.RETAIL_PRICE AS TOTAL_AMOUNT
        FROM dbo.HD_ITEMMASTER AS H
        INNER JOIN dbo.ITEM_CAT AS C ON C.ITM_CAT_CODE = H.ITM_CAT_CODE
        INNER JOIN dbo.UnitMaster AS U ON H.UNIT = U.Unit_id
        INNER JOIN dbo.STOCK_MASTER AS S ON H.ITEM_CODE = S.ITEM_CODE
        WHERE 1=1 ${catWhere}
        ORDER BY H.DESCRIPTION
      `);
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Stock report fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});


// =============================================
// STOCK REPORT BY WAREHOUSE APIs
// =============================================

// GET Warehouse list for dropdown
app.get('/api/reports/warehouses', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT WR_CODE, WR_NAME, WR_ANAME FROM dbo.WRHOUSE_MASTER ORDER BY WR_NAME
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Warehouses fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Warehouse Stock Report Data
app.get('/api/reports/stock-warehouse', async (req, res) => {
  try {
    const pool = await getPool();
    const { fromDate, toDate, categoryCode, dateFilter, wrCode } = req.query;

    const request = pool.request();
    let catWhere = '';
    let wrWhere = '';

    if (categoryCode && categoryCode !== '0') {
      catWhere = 'AND H.ITM_CAT_CODE = @catCode';
      request.input('catCode', sql.VarChar(50), categoryCode);
    }
    if (wrCode && wrCode !== '0') {
      wrWhere = 'AND W.WR_CODE = @wrCode';
      request.input('wrCode', sql.VarChar(50), wrCode);
    }

    let result;

    if (dateFilter === 'custom' && fromDate && toDate) {
      request.input('dt1', sql.VarChar(20), fromDate);
      request.input('dt2', sql.VarChar(20), toDate);

      result = await request.query(`
        SELECT
          WH.WR_NAME, WH.WR_ANAME,
          H.ITEM_CODE,
          H.DESCRIPTION AS ITEM_NAME,
          H.AR_DESC AS ITEM_ANAME,
          C.ITM_CAT_NAME AS GROUP_NAME,
          C.ITM_CAT_ANAME AS GROUP_ANAME,
          U.Unit_Name,
          U.Unit_AName,
          g.STOCK,
          S.STOCK AS TOT_STOCK,
          S.AVG_PUR_PRICE AS COST,
          S.RETAIL_PRICE AS SALE_PRICE,
          S.STOCK * S.AVG_PUR_PRICE AS TOTAL_COST,
          g.STOCK * S.RETAIL_PRICE AS TOTAL_AMOUNT
        FROM dbo.HD_ITEMMASTER AS H
        INNER JOIN dbo.ITEM_CAT AS C ON C.ITM_CAT_CODE = H.ITM_CAT_CODE
        INNER JOIN dbo.UnitMaster AS U ON H.UNIT = U.Unit_id
        INNER JOIN dbo.STOCK_MASTER AS S ON H.ITEM_CODE = S.ITEM_CODE
        INNER JOIN dbo.wr_stock_master AS W ON W.ITEM_CODE = H.ITEM_CODE
        INNER JOIN dbo.WRHOUSE_MASTER AS WH ON W.WR_CODE = WH.WR_CODE
        INNER JOIN (
          SELECT g2.ITEM_CODE, g2.WR_CODE,
            SUM(CASE WHEN d2.TRN_TYPE < 6 THEN g2.QTY ELSE g2.QTY * -1 END) AS STOCK
          FROM dbo.DATA_ENTRY_GRID AS g2
          INNER JOIN dbo.DATA_ENTRY AS d2 ON g2.REC_NO = d2.REC_NO
          WHERE CONVERT(DATE, d2.CURDATE) BETWEEN CONVERT(DATE, @dt1) AND CONVERT(DATE, @dt2)
          GROUP BY g2.ITEM_CODE, g2.WR_CODE
        ) AS g ON H.ITEM_CODE = g.ITEM_CODE AND g.WR_CODE = WH.WR_CODE
        WHERE 1=1 ${catWhere} ${wrWhere}
        ORDER BY WH.WR_NAME, H.DESCRIPTION
      `);
    } else {
      result = await request.query(`
        SELECT
          WH.WR_NAME, WH.WR_ANAME,
          H.ITEM_CODE,
          H.DESCRIPTION AS ITEM_NAME,
          H.AR_DESC AS ITEM_ANAME,
          C.ITM_CAT_NAME AS GROUP_NAME,
          C.ITM_CAT_ANAME AS GROUP_ANAME,
          U.Unit_Name,
          U.Unit_AName,
          W.STOCK,
          S.STOCK AS TOT_STOCK,
          S.AVG_PUR_PRICE AS COST,
          S.RETAIL_PRICE AS SALE_PRICE,
          S.STOCK * S.AVG_PUR_PRICE AS TOTAL_COST,
          W.STOCK * S.RETAIL_PRICE AS TOTAL_AMOUNT
        FROM dbo.HD_ITEMMASTER AS H
        INNER JOIN dbo.ITEM_CAT AS C ON C.ITM_CAT_CODE = H.ITM_CAT_CODE
        INNER JOIN dbo.UnitMaster AS U ON H.UNIT = U.Unit_id
        INNER JOIN dbo.STOCK_MASTER AS S ON H.ITEM_CODE = S.ITEM_CODE
        INNER JOIN dbo.wr_stock_master AS W ON W.ITEM_CODE = H.ITEM_CODE
        INNER JOIN dbo.WRHOUSE_MASTER AS WH ON W.WR_CODE = WH.WR_CODE
        WHERE 1=1 ${catWhere} ${wrWhere}
        ORDER BY WH.WR_NAME, H.DESCRIPTION
      `);
    }

    res.json(result.recordset);
  } catch (err) {
    console.error('Warehouse stock report fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// INVOICE REPORT APIs
// =============================================

// GET Transaction Types for dropdown
app.get('/api/reports/trn-types', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT TRN_CODE, TRN_NAME, TRN_ANAME
      FROM dbo.TRN_TYPE_REP
      WHERE REP_CAT = 1
      ORDER BY TRN_CODE
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('TRN types fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Users list for invoice report dropdown
app.get('/api/reports/users-list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT UserId, UserName FROM dbo.UserInfo ORDER BY UserName
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Invoice Report Data
app.get('/api/reports/invoice', async (req, res) => {
  try {
    const pool = await getPool();
    const { fromDate, toDate, trnCode, accNo, userId, dateFilter } = req.query;

    const selectedTrn = parseInt(trnCode || '0', 10);

    const request = pool.request();
    request.input('selectedTrn', sql.Int, selectedTrn);

    let extraWhere = '';
    if (dateFilter !== 'all' && fromDate && toDate) {
      request.input('fromDate', sql.VarChar(20), fromDate);
      request.input('toDate', sql.VarChar(20), toDate);
      extraWhere += ' AND CAST(D.CURDATE AS DATE) >= CAST(@fromDate AS DATE) AND CAST(D.CURDATE AS DATE) <= CAST(@toDate AS DATE)';
    }
    if (accNo && accNo !== '0') {
      extraWhere += ' AND D.ACCODE = @accNo';
      request.input('accNo', sql.VarChar(50), accNo);
    }
    if (userId && userId !== '0') {
      extraWhere += ' AND D.USER_ID = @userId';
      request.input('userId', sql.VarChar(50), userId);
    }

    console.log('Invoice report params:', { dateFilter, fromDate, toDate, trnCode, accNo, userId });

    const result = await request.query(`
      SELECT DISTINCT
        D.CURDATE, D.INVOICE_NO, D.ACCODE, D.ENAME, D.REF_NO,
        D.VAT_Number AS VAT_NUMBER, UI.UserName,
        C.Currency_Name, D.G_TOTAL, D.DISC_AMT, D.NET_AMOUNT, D.FRN_AMOUNT,
        D.CASH_PAID, D.OTHER_PAID, ISNULL(D.ZATCA_SEND, 0) AS ZATCA_SEND,
        TT.TRN_NAME, TT.TRN_ANAME, D.TRN_TYPE, WH.WR_NAME,
        D.VAT_AMOUNT AS INV_VAT_AMOUNT,
        G.ITEM_CODE, G.DESCRIPTION, G.QTY, G.PRICE,
        G.SALE_PUR_AMT, G.ITM_TOTAL, G.VAT_AMOUNT, G.VAT_PERCENT,
        U.Unit_Name, U.Unit_AName, D.REC_NO
      FROM dbo.DATA_ENTRY AS D
      INNER JOIN dbo.DATA_ENTRY_GRID AS G ON D.BRN_CODE = G.BRN_CODE AND D.REC_NO = G.REC_NO
      INNER JOIN dbo.trn_type AS TT ON D.TRN_TYPE = TT.TRN_CODE
      INNER JOIN dbo.WRHOUSE_MASTER AS WH ON D.WR_CODE = WH.WR_CODE AND G.WR_CODE = WH.WR_CODE
      INNER JOIN dbo.CURRENCY_MASTER AS C ON D.CURRENCY = C.Currency_No
      LEFT OUTER JOIN dbo.UnitMaster AS U ON G.UNIT = U.Unit_id
      LEFT OUTER JOIN dbo.ACCOUNTS_INFO AS ACC ON D.ACCODE = ACC.ACC_NO
      LEFT OUTER JOIN dbo.UserInfo AS UI ON D.USER_ID = UI.UserId
      INNER JOIN dbo.TRN_TYPE_REP AS B ON D.TRN_TYPE IN (
        SELECT Value FROM dbo.SplitString(B.CODES, ',')
      )
      WHERE
        B.REP_CAT = 1
        AND B.TRN_CODE = CASE WHEN @selectedTrn = 0 THEN B.TRN_CODE ELSE @selectedTrn END
        ${extraWhere}
      ORDER BY D.CURDATE, D.INVOICE_NO, G.ITEM_CODE
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Invoice report fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET Customer Report Data from CUS_SUP_TRN_DET
app.get('/api/reports/customer-report', async (req, res) => {
  try {
    const pool = await getPool();
    const { fromDate, toDate, accNo, dateFilter, accType } = req.query;

    const request = pool.request();

    let extraWhere = '';
    if (dateFilter !== 'all' && fromDate && toDate) {
      request.input('fromDate', sql.VarChar(20), fromDate);
      request.input('toDate', sql.VarChar(20), toDate);
      extraWhere += ' AND CAST(PAY_DATE AS DATE) >= CAST(@fromDate AS DATE) AND CAST(PAY_DATE AS DATE) <= CAST(@toDate AS DATE)';
    }
    if (accNo && accNo !== '0') {
      extraWhere += ' AND ACC_NO = @accNo';
      request.input('accNo', sql.VarChar(50), accNo);
    }

    if (accType && accType !== '0') {
      extraWhere += ' AND ACC_TYPE = @accType';
      request.input('accType', sql.Int, parseInt(accType));
    }

    console.log('Customer report params:', { dateFilter, fromDate, toDate, accNo, accType });

    const result = await request.query(`
      SELECT 
        ACC_NO, ACC_NAME, ACC_ANAME, LEDGER_ACC,
        PAY_DATE, PAY_AMOUNT, CR_AMOUNT, DR_AMOUNT,
        TRN_NAME, TRN_ANAME, DR_CR, NARRATION, INVOICE_NO, UserName
      FROM dbo.CUS_SUP_TRN_DET
      WHERE 1=1
      ${extraWhere}
      ORDER BY PAY_DATE, INVOICE_NO
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Customer report fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET items list for dropdown
app.get('/api/reports/items-list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT ITEM_CODE, DESCRIPTION AS Item_Name, AR_DESC AS Item_AName 
      FROM dbo.HD_ITEMMASTER 
      ORDER BY DESCRIPTION
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Accounts List
app.get('/api/reports/accounts-list', async (req, res) => {
  try {
    const pool = await getPool();
    const { accType } = req.query;
    let query = 'SELECT ACC_NO, ACC_NAME, ACC_ANAME FROM dbo.ACCOUNTS_INFO';
    if (accType && accType !== '0') {
      query += ` WHERE ACC_TYPE = ${parseInt(accType)}`;
    }
    query += ' ORDER BY ACC_NAME';
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Warehouses List
app.get('/api/reports/warehouses-list', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT WR_CODE, WR_NAME, WR_ANAME FROM dbo.WRHOUSE_MASTER ORDER BY WR_NAME
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Stock Movement Report Data
app.get('/api/reports/stock-movement', async (req, res) => {
  try {
    const pool = await getPool();
    const { fromDate, toDate, itemCode, dateFilter, accNo, wrCode } = req.query;

    const request = pool.request();
    request.input('itemCode', sql.VarChar(50), itemCode);

    let extraWhere = '';
    if (dateFilter !== 'all') {
      request.input('fromDate', sql.VarChar(20), fromDate);
      request.input('toDate', sql.VarChar(20), toDate);
      extraWhere += ' AND CAST(d.CURDATE AS DATE) BETWEEN CAST(@fromDate AS DATE) AND CAST(@toDate AS DATE)';
    }
    if (accNo && accNo !== '0') {
      request.input('accNo', sql.VarChar(50), accNo);
      extraWhere += ' AND d.ACCODE = @accNo';
    }
    if (wrCode && wrCode !== '0') {
      request.input('wrCode', sql.VarChar(50), wrCode);
      extraWhere += ' AND g.WR_CODE = @wrCode';
    }

    const result = await request.query(`
      SELECT 
        d.CURDATE, t.TRN_NAME, d.INVOICE_NO, Ename as Account, 
        case when d.trn_type < 6 then g.QTY else g.qty *-1 end as Qty, 
        g.PRICE, g.SALE_PUR_AMT, g.ITM_TOTAL, g.FRACTION, 
        w.WR_NAME, U.Unit_Name, U.Unit_AName, t.TRN_ANAME, d.TRN_TYPE
      FROM dbo.DATA_ENTRY AS d 
      INNER JOIN dbo.DATA_ENTRY_GRID AS g ON d.BRN_CODE = g.BRN_CODE AND d.REC_NO = g.REC_NO 
      INNER JOIN dbo.WRHOUSE_MASTER AS w ON g.WR_CODE = w.WR_CODE 
      INNER JOIN dbo.TRN_TYPE AS t ON d.TRN_TYPE = t.TRN_CODE 
      LEFT OUTER JOIN dbo.UnitMaster AS U ON U.Unit_id = g.UNIT
      WHERE g.ITEM_CODE = @itemCode
        ${extraWhere}
      ORDER BY d.CURDATE, d.REC_NO
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Stock movement fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET VAT Report Data
app.get('/api/reports/vat-report', async (req, res) => {
  try {
    const pool = await getPool();
    const { fromDate, toDate, trnCode, accNo, dateFilter } = req.query;

    const request = pool.request();
    let extraWhere = '';

    if (dateFilter !== 'all') {
      request.input('fromDate', sql.VarChar(20), fromDate);
      request.input('toDate', sql.VarChar(20), toDate);
      extraWhere += ' AND CAST(d.CURDATE AS DATE) BETWEEN CAST(@fromDate AS DATE) AND CAST(@toDate AS DATE)';
    }
    const selectedTrn = parseInt(trnCode || '0', 10);
    request.input('selectedTrn', sql.Int, selectedTrn);
    // extraWhere handled in query join
    if (accNo && accNo !== '0') {
      request.input('accNo', sql.VarChar(50), accNo);
      extraWhere += ' AND d.ACCODE = @accNo';
    }

    const result = await request.query(`
      SELECT 
        d.CURDATE, d.INVOICE_NO, d.ENAME, d.NET_AMOUNT, d.CASH_PAID, d.OTHER_PAID, 
        d.VAT_AMOUNT, d.VAT_PERCENT, d.VAT_NUMBER, d.TAXABLE_AMOUNT, 
        ISNULL(d.ZATCA_SEND, 0) AS ZATCA_SEND, d.submit_date, t.TRN_NAME, t.TRN_ANAME
      FROM dbo.DATA_ENTRY AS d 
      INNER JOIN dbo.TRN_TYPE AS t ON d.TRN_TYPE = t.TRN_CODE
      INNER JOIN dbo.TRN_TYPE_REP AS B ON d.TRN_TYPE IN (
        SELECT Value FROM dbo.SplitString(B.CODES, ',')
      )
      WHERE B.REP_CAT = 1
        AND B.TRN_CODE = CASE WHEN @selectedTrn = 0 THEN B.TRN_CODE ELSE @selectedTrn END
        ${extraWhere}
      ORDER BY d.CURDATE, d.INVOICE_NO
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('VAT report fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});


// --- PRODUCTION CATCH-ALL ---
app.use((req, res) => {

  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    const pool = await getPool();
    console.log('📡 Attempting to connect to database...');
    console.log('✅ Connected to MSSQL');
    console.log('✅ Successfully connected to the Microsoft SQL Server database!');

    // Initialize translations table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WEB_TRANSLATIONS' AND xtype='U')
      CREATE TABLE WEB_TRANSLATIONS (
        TRANSLATION_KEY VARCHAR(100) PRIMARY KEY,
        EN_VALUE NVARCHAR(MAX),
        AR_VALUE NVARCHAR(MAX)
      )
    `);
    console.log('✅ WEB_TRANSLATIONS table initialized');

    // Initialize options table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='User_Entry_Options' AND xtype='U')
      BEGIN
        CREATE TABLE User_Entry_Options (
          User_id INT NOT NULL,
          Trn_type INT NOT NULL,
          Auto_Print BIT NOT NULL DEFAULT 0,
          Default_Print_Paper NVARCHAR(50) NOT NULL DEFAULT 'Thermal',
          Show_Invoice BIT NOT NULL DEFAULT 1,
          Auto_Next_line BIT NOT NULL DEFAULT 0,
          grid_columns VARCHAR(50) NOT NULL DEFAULT '1111111111',
          Crystal_Print BIT NOT NULL DEFAULT 0,
          PRIMARY KEY (User_id, Trn_type)
        )
      END
      ELSE
      BEGIN
        IF NOT EXISTS (
          SELECT * FROM sys.columns 
          WHERE object_id = OBJECT_ID(N'[dbo].[User_Entry_Options]') 
          AND name = 'Crystal_Print'
        )
        BEGIN
          ALTER TABLE dbo.User_Entry_Options ADD Crystal_Print BIT NOT NULL DEFAULT 0;
        END
      END
    `);
    console.log('✅ User_entry_Option table initialized');

  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
  }
});



