import { sql, getPool } from '../db.js';

const defaultMenus = [
  // Stock Master
  { Head: 'Stock Master', Menu_Code: 'stock-master', Menu_type: 1, Menu_Name: 'Stock Master', Form_name: 'stock-master', FLAG: 'A', Head_Det: 0 },
  { Head: 'Stock Master', Menu_Code: 'item-creation', Menu_type: 2, Menu_Name: 'Item Creation/Edit', Form_name: 'item-creation', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'opening-stock', Menu_type: 2, Menu_Name: 'Opening stock/Price Update', Form_name: 'opening-stock', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'item-search', Menu_type: 2, Menu_Name: 'Item Search', Form_name: 'item-search', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'update-stock', Menu_type: 2, Menu_Name: 'Update Stock', Form_name: 'update-stock', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'project-master', Menu_type: 2, Menu_Name: 'Project Master', Form_name: 'project-master', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'stock-transfer', Menu_type: 2, Menu_Name: 'Stock Transfer', Form_name: 'stock-transfer', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'stock-adjust', Menu_type: 2, Menu_Name: 'Stock Adjust', Form_name: 'stock-adjust', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'item-group', Menu_type: 2, Menu_Name: 'Item Group', Form_name: 'item-group', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock Master', Menu_Code: 'unit-master', Menu_type: 2, Menu_Name: 'Unit Master', Form_name: 'unit-master', FLAG: 'A', Head_Det: 1 },

  // Sales & Return
  { Head: 'Sales', Menu_Code: 'sales', Menu_type: 2, Menu_Name: 'Sales', Form_name: 'sales', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'sales-return', Menu_type: 2, Menu_Name: 'Sales Return', Form_name: 'sales-return', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'sales-history', Menu_type: 2, Menu_Name: 'Sales History', Form_name: 'sales-history', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'quotation-entry', Menu_type: 2, Menu_Name: 'Quotation Entry', Form_name: 'quotation-entry', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'delivery-note', Menu_type: 2, Menu_Name: 'Delivery Note', Form_name: 'delivery-note', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'item-issue', Menu_type: 2, Menu_Name: 'Item Issue', Form_name: 'item-issue', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'zatca-submission-sales', Menu_type: 2, Menu_Name: 'Zatca Submission', Form_name: 'zatca-submission-sales', FLAG: 'A', Head_Det: 1 },
  { Head: 'Sales', Menu_Code: 'day-close', Menu_type: 2, Menu_Name: 'Day Close', Form_name: 'day-close', FLAG: 'A', Head_Det: 1 },

  // Purchase & Return
  { Head: 'Purchase', Menu_Code: 'purchase', Menu_type: 2, Menu_Name: 'Purchase', Form_name: 'purchase', FLAG: 'A', Head_Det: 1 },
  { Head: 'Purchase', Menu_Code: 'purchase-return', Menu_type: 2, Menu_Name: 'Purchase Return', Form_name: 'purchase-return', FLAG: 'A', Head_Det: 1 },
  { Head: 'Purchase', Menu_Code: 'item-receivable', Menu_type: 2, Menu_Name: 'Item Receivable', Form_name: 'item-receivable', FLAG: 'A', Head_Det: 1 },
  { Head: 'Purchase', Menu_Code: 'purchase-expense', Menu_type: 2, Menu_Name: 'Purchase Expense', Form_name: 'purchase-expense', FLAG: 'A', Head_Det: 1 },

  // Stock & Invoice Report
  { Head: 'Stock & Invoice Report', Menu_Code: 'stock-report', Menu_type: 2, Menu_Name: 'Stock Report', Form_name: 'stock-report', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'stock-report-warehouse', Menu_type: 2, Menu_Name: 'Stock Report By Warehouse', Form_name: 'stock-report-warehouse', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'invoice-report', Menu_type: 2, Menu_Name: 'Invoice Report', Form_name: 'invoice-report', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'stock-movement', Menu_type: 2, Menu_Name: 'Stock Movement detail', Form_name: 'stock-movement', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'vat-report', Menu_type: 2, Menu_Name: 'VAT Report', Form_name: 'vat-report', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'daily-sales-purchase', Menu_type: 2, Menu_Name: 'Daily Sales N Purchase', Form_name: 'daily-sales-purchase', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'customer-report', Menu_type: 2, Menu_Name: 'Customer Report', Form_name: 'customer-report', FLAG: 'A', Head_Det: 1 },
  { Head: 'Stock & Invoice Report', Menu_Code: 'supplier-report', Menu_type: 2, Menu_Name: 'Supplier Report', Form_name: 'supplier-report', FLAG: 'A', Head_Det: 1 },

  // Accounts
  { Head: 'Accounts', Menu_Code: 'chart-of-accounts', Menu_type: 2, Menu_Name: 'Chart of Accounts', Form_name: 'chart-of-accounts', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'customers-account', Menu_type: 2, Menu_Name: 'Customer Account', Form_name: 'customers-account', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'supplier-accounts', Menu_type: 2, Menu_Name: 'Supplier Account', Form_name: 'supplier-accounts', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'purchase-accounts', Menu_type: 2, Menu_Name: 'Purchase Account', Form_name: 'purchase-accounts', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'accounts', Menu_type: 2, Menu_Name: 'Bank & Cash Accounts', Form_name: 'accounts', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'expense-accounts', Menu_type: 2, Menu_Name: 'Expense Accounts', Form_name: 'expense-accounts', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'currency-master', Menu_type: 2, Menu_Name: 'Currency Master', Form_name: 'currency-master', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'cost-center', Menu_type: 2, Menu_Name: 'Cost Center', Form_name: 'cost-center', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'acc-department', Menu_type: 2, Menu_Name: 'Acc department', Form_name: 'acc-department', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'financial-session', Menu_type: 2, Menu_Name: 'Financial Session', Form_name: 'financial-session', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts', Menu_Code: 'transaction-search', Menu_type: 2, Menu_Name: 'Transaction Search', Form_name: 'transaction-search', FLAG: 'A', Head_Det: 1 },

  // Transactions
  { Head: 'Transactions', Menu_Code: 'customer-receivable', Menu_type: 2, Menu_Name: 'Customer Receivable', Form_name: 'customer-receivable', FLAG: 'A', Head_Det: 1 },
  { Head: 'Transactions', Menu_Code: 'supplier-payable', Menu_type: 2, Menu_Name: 'Supplier Payable', Form_name: 'supplier-payable', FLAG: 'A', Head_Det: 1 },
  { Head: 'Transactions', Menu_Code: 'general-voucher', Menu_type: 2, Menu_Name: 'General Voucher Entry', Form_name: 'general-voucher', FLAG: 'A', Head_Det: 1 },
  { Head: 'Transactions', Menu_Code: 'expense-entry', Menu_type: 2, Menu_Name: 'Expense Entry', Form_name: 'expense-entry', FLAG: 'A', Head_Det: 1 },
  { Head: 'Transactions', Menu_Code: 'employee-salary', Menu_type: 2, Menu_Name: 'Emp. Salary Pay', Form_name: 'employee-salary', FLAG: 'A', Head_Det: 1 },

  // Accounts Report
  { Head: 'Accounts Report', Menu_Code: 'accounts-summary', Menu_type: 2, Menu_Name: 'Accounts Summary', Form_name: 'accounts-summary', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts Report', Menu_Code: 'accounts-detail', Menu_type: 2, Menu_Name: 'Accounts Detail', Form_name: 'accounts-detail', FLAG: 'A', Head_Det: 1 },
  { Head: 'Accounts Report', Menu_Code: 'cash-bank-report', Menu_type: 2, Menu_Name: 'Cash N Bank Report', Form_name: 'cash-bank-report', FLAG: 'A', Head_Det: 1 },

  // Finance Report
  { Head: 'Finance Report', Menu_Code: 'income-expense', Menu_type: 2, Menu_Name: 'Income and Expense', Form_name: 'income-expense', FLAG: 'A', Head_Det: 1 },
  { Head: 'Finance Report', Menu_Code: 'trial-balance', Menu_type: 2, Menu_Name: 'Trial Balance', Form_name: 'trial-balance', FLAG: 'A', Head_Det: 1 },
  { Head: 'Finance Report', Menu_Code: 'profit-loss', Menu_type: 2, Menu_Name: 'Profit and Loss', Form_name: 'profit-loss', FLAG: 'A', Head_Det: 1 },
  { Head: 'Finance Report', Menu_Code: 'balance-sheet', Menu_type: 2, Menu_Name: 'Balance Sheet', Form_name: 'balance-sheet', FLAG: 'A', Head_Det: 1 },

  // Admin Setup
  { Head: 'Admin Setup', Menu_Code: 'transaction-types', Menu_type: 2, Menu_Name: 'Transaction Types', Form_name: 'transaction-types', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'user-privileges', Menu_type: 2, Menu_Name: 'User Privileges', Form_name: 'user-privileges', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'user-info', Menu_type: 2, Menu_Name: 'User Info', Form_name: 'user-info', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'translation-manager', Menu_type: 2, Menu_Name: 'Translation Manager', Form_name: 'translation-manager', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'company-info', Menu_type: 2, Menu_Name: 'Company Info', Form_name: 'company-info', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'common-setting', Menu_type: 2, Menu_Name: 'Common Setting', Form_name: 'common-setting', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'entry-settings', Menu_type: 2, Menu_Name: 'Entry Settings', Form_name: 'entry-settings', FLAG: 'A', Head_Det: 1 },
  { Head: 'Admin Setup', Menu_Code: 'zatca-config', Menu_type: 2, Menu_Name: 'Zatca Config', Form_name: 'zatca-config', FLAG: 'A', Head_Det: 1 },
];

async function run() {
  console.log("🚀 Starting Menu_Master_Web population...");
  const pool = await getPool();

  for (const menu of defaultMenus) {
    try {
      const check = await pool.request()
        .input('code', sql.NVarChar, menu.Menu_Code)
        .query('SELECT 1 FROM dbo.Menu_Master_Web WHERE Menu_Code = @code');

      if (check.recordset.length === 0) {
        await pool.request()
          .input('head', sql.NVarChar, menu.Head)
          .input('code', sql.NVarChar, menu.Menu_Code)
          .input('type', sql.Int, menu.Menu_type)
          .input('name', sql.NVarChar, menu.Menu_Name)
          .input('form', sql.NVarChar, menu.Form_name)
          .input('flag', sql.NVarChar, menu.FLAG)
          .input('det', sql.Int, menu.Head_Det)
          .query(`
            INSERT INTO dbo.Menu_Master_Web (Head, Menu_Code, Menu_type, Menu_Name, Form_name, FLAG, Head_Det)
            VALUES (@head, @code, @type, @name, @form, @flag, @det)
          `);
        console.log(`✅ Inserted menu: ${menu.Menu_Name} (${menu.Menu_Code})`);
      } else {
        console.log(`ℹ️ Menu already exists: ${menu.Menu_Name} (${menu.Menu_Code})`);
      }
    } catch (err) {
      console.error(`❌ Failed to insert menu ${menu.Menu_Name}:`, err.message);
    }
  }

  console.log("🎉 Menu population completed!");
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
