
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

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

async function test() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected');
        
        const triggerFix = `
ALTER TRIGGER [dbo].[trg_data_entry_web_ins_upd]
ON [dbo].[DATA_ENTRY_WEB]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF TRIGGER_NESTLEVEL() > 1
        RETURN;

    -- 1. UPDATE existing records
    UPDATE d
    SET
        d.ACCODE = i.ACCODE,
        d.ENAME = i.ENAME,
        d.CURRENCY = i.CURRENCY,
        d.CRATE = i.CRATE,
        d.G_TOTAL = i.G_TOTAL,
        d.DISC_PRCNT = i.DISC_PRCNT,
        d.DISC_AMT = i.DISC_AMT,
        d.NET_AMOUNT = i.NET_AMOUNT,
        d.FRN_AMOUNT = i.FRN_AMOUNT,
        d.TRN_TYPE = i.TRN_TYPE,
        d.CASH_PAID = i.CASH_PAID,
        d.OTHER_PAID = i.OTHER_PAID,
        d.CASH_ACC = i.CASH_ACC,
        d.BANK_ACC = i.BANK_ACC,
        d.REMARKS = i.REMARKS,
        d.TAXABLE_AMOUNT = i.TAXABLE_AMOUNT
    FROM DATA_ENTRY d
    JOIN inserted i 
        ON d.TRAN_NO = i.REC_NO;

    -- 2. Prepare temp table for output
    DECLARE @InsertedInvoices TABLE
    (
        REC_NO INT,
        invoice_no INT
    );

    -- 3. INSERT new rows
    ;WITH new_rows AS (
        SELECT i.*
        FROM inserted i
        LEFT JOIN DATA_ENTRY d 
            ON d.TRAN_NO = i.REC_NO
        WHERE d.TRAN_NO IS NULL
    ),
    grouped AS (
        SELECT 
            n.*,
            CASE 
                WHEN n.TRN_TYPE IN (6,7) THEN 'A'
                WHEN n.TRN_TYPE IN (1,2) THEN 'B'
                ELSE CAST(n.TRN_TYPE AS VARCHAR(10))
            END AS grp
        FROM new_rows n
    ),
    max_vals AS (
        SELECT 
            g.grp,
            -- FIX: Cast to INT before taking MAX to avoid alphabetical ordering issues ('9' > '10')
            ISNULL(MAX(CASE WHEN ISNUMERIC(d.invoice_no) = 1 THEN CAST(d.invoice_no AS INT) ELSE 0 END), 0) AS max_invoice_no
        FROM grouped g
        LEFT JOIN DATA_ENTRY d WITH (UPDLOCK, HOLDLOCK)
            ON (
                (g.grp = 'A' AND d.TRN_TYPE IN (6,7)) OR
                (g.grp = 'B' AND d.TRN_TYPE IN (1,2)) OR
                (g.grp NOT IN ('A','B') AND d.TRN_TYPE = g.TRN_TYPE)
            )
            -- FIX: Ensure we are only looking at the same year to avoid PK conflicts
            AND d.NYEAR = g.NYEAR
        GROUP BY g.grp
    ),
    numbered AS (
        SELECT 
            g.*,
            mv.max_invoice_no,
            ROW_NUMBER() OVER (PARTITION BY g.grp ORDER BY g.REC_NO) AS rn
        FROM grouped g
        JOIN max_vals mv 
            ON g.grp = mv.grp
    )

    INSERT INTO DATA_ENTRY
    (
        invoice_no, ACCODE, ENAME, CURRENCY, CRATE, ENTRY_TYPE, CURDATE,
        G_TOTAL, DISC_PRCNT, DISC_AMT, NET_AMOUNT, FRN_AMOUNT, TRN_TYPE,
        ORG_DUP, FLAG, TRAN_NO, SALES_CODE, BRN_CODE, REF_NO, WR_CODE,
        to_date, USER_NAME, NYEAR, TAG, ENTRY_STATUS, CASH_PAID, OTHER_PAID,
        REMARKS, INV_PREFEX, ORDER_NO, ORDER_RECNO, VAT_AMOUNT, VAT_PERCENT,
        VAT_NUMBER, PRINT_COUNT, CMP_ID, PRICE_INCLUDE_VAT, TENDERED_AMT,
        BALANCE_AMT, CREATE_USER, TAXABLE_AMOUNT
    )
    OUTPUT inserted.TRAN_NO, inserted.invoice_no
    INTO @InsertedInvoices(REC_NO, invoice_no)
    SELECT 
        CAST(n.max_invoice_no + n.rn AS VARCHAR(20)),
        n.ACCODE,
        n.ENAME,
        n.CURRENCY,
        n.CRATE,
        'Retail',
        n.CURDATE,
        n.G_TOTAL,
        n.DISC_PRCNT,
        n.DISC_AMT,
        n.NET_AMOUNT,
        n.FRN_AMOUNT,
        n.TRN_TYPE,
        'ORG',
        'A',
        n.REC_NO,
        n.SALES_CODE,
        n.BRN_CODE,
        n.REF_NO,
        n.WR_CODE,
        GETDATE(),
        n.USER_NAME,
        n.NYEAR,
        n.TAG,
        'N',
        n.CASH_PAID,
        n.OTHER_PAID,
        n.REMARKS,
        t.INV_PREFEX,
        n.ORDER_NO,
        n.ORDER_RECNO,
        n.VAT_AMOUNT,
        n.VAT_PERCENT,
        n.VAT_NUMBER,
        1,
        n.CMP_ID,
        n.PRICE_INCLUDE_VAT,
        n.TENDERED_AMT,
        n.BALANCE_AMT,
        n.CREATE_USER,
        n.TAXABLE_AMOUNT
    FROM numbered n
    LEFT JOIN TRN_TYPE t 
        ON t.TRN_CODE = n.TRN_TYPE;

    -- 4. Update back to DATA_ENTRY_WEB
    UPDATE w
    SET w.invoice_no = i.invoice_no
    FROM DATA_ENTRY_WEB w
    JOIN @InsertedInvoices i
        ON w.REC_NO = i.REC_NO
    WHERE ISNULL(w.invoice_no,0) <> ISNULL(i.invoice_no,0);

END;
        `;
        
        await pool.request().query(triggerFix);
        console.log('✅ Trigger trg_data_entry_web_ins_upd updated successfully!');

        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

test();
