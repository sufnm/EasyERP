-- Populate WEB_TRANSLATIONS with Menu and Submenu items
-- If keys already exist, they won't be duplicated (using a check)

BEGIN TRANSACTION;

DECLARE @translations TABLE (
    [KEY] NVARCHAR(100),
    [EN] NVARCHAR(200),
    [AR] NVARCHAR(200)
);

INSERT INTO @translations ([KEY], [EN], [AR]) VALUES
('home', 'Home', N'الرئيسية'),
('sales', 'Sales', N'المبيعات'),
('salesNReturn', 'Sales & Return', N'المبيعات والمرتجع'),
('salesReturn', 'Sales Return', N'مرتجع المبيعات'),
('salesHistory', 'Sales History', N'سجل المبيعات'),
('purchaseNReturn', 'Purchase & Return', N'المشتريات والمرتجع'),
('purchase', 'Purchase', N'المشتريات'),
('purchaseReturn', 'Purchase Return', N'مرتجع المشتريات'),
('accounts', 'Accounts', N'الحسابات'),
('chartOfAccounts', 'Chart of Accounts', N'دليل الحسابات'),
('customerAccount', 'Customer Account', N'حساب العميل'),
('supplierAccount', 'Supplier Account', N'حساب المورد'),
('purchaseAccount', 'Purchase Account', N'حساب المشتريات'),
('bankNCashAccounts', 'Bank & Cash Accounts', N'حسابات البنوك والنقدية'),
('expenseAccounts', 'Expense Accounts', N'حسابات المصروفات'),
('transactions', 'Transactions', N'العمليات'),
('customerReceivable', 'Customer Receivable', N'سند قبض عميل'),
('supplierPayable', 'Supplier Payable', N'سند صرف مورد'),
('generalVoucherEntry', 'General Voucher Entry', N'قيد محاسبي عام'),
('expenseEntry', 'Expense Entry', N'قيد مصروفات'),
('employeesSalaryEntry', 'Employees Salary Entry', N'مسير الرواتب'),
('lookupMaster', 'Lookup Master', N'البيانات الأساسية'),
('itemGroup', 'Item Group', N'مجموعات الأصناف'),
('unitMaster', 'Unit Master', N'وحدات القياس'),
('adminSetup', 'Admin Setup', N'إعدادات النظام'),
('transactionTypes', 'Transaction Types', N'أنواع العمليات'),
('userPrivileges', 'User Privileges', N'صلاحيات المستخدمين'),
('userInfo', 'User Info', N'معلومات المستخدمين'),
('translationManager', 'Translation Manager', N'مدير الترجمة'),
('settings', 'Settings', N'الإعدادات');

MERGE dbo.WEB_TRANSLATIONS AS target
USING @translations AS source
ON (target.TRANSLATION_KEY = source.[KEY])
WHEN MATCHED THEN
    UPDATE SET EN_VALUE = source.[EN], AR_VALUE = source.[AR]
WHEN NOT MATCHED THEN
    INSERT (TRANSLATION_KEY, EN_VALUE, AR_VALUE)
    VALUES (source.[KEY], source.[EN], source.[AR]);

COMMIT;
