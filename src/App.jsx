import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import SalesPage from './pages/SalesPage';
import QuotationPage from './pages/QuotationPage';
import ActiveQuotationsPage from './pages/ActiveQuotationsPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import AccountsPage from './pages/AccountsPage';
import CreateAccountPage from './pages/CreateAccountPage';
import ChartOfAccountsPage from './pages/ChartOfAccountsPage';
import ExpenseAccountsPage from './pages/ExpenseAccountsPage';
import CustomersAccountPage from './pages/CustomersAccountPage';
import SupplierAccountsPage from './pages/SupplierAccountsPage';
import PurchaseAccountsPage from './pages/PurchaseAccountsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import CustomerAccountForm from './pages/CustomerAccountForm';
import ItemGroupPage from './pages/ItemGroupPage';
import UnitMasterPage from './pages/UnitMasterPage';
import TransactionTypesPage from './pages/TransactionTypesPage';
import UserPrivilegesPage from './pages/UserPrivilegesPage';
import UserInfoPage from './pages/UserInfoPage';
import CustomerReceivablePage from './pages/CustomerReceivablePage';
import SupplierPayablePage from './pages/SupplierPayablePage';
import TranslationManagerPage from './pages/TranslationManagerPage';
import SalesReturnPage from './pages/SalesReturnPage';
import GeneralVoucherPage from './pages/GeneralVoucherPage';
import ExpenseEntryPage from './pages/ExpenseEntryPage';
import EmployeeSalaryEntryPage from './pages/EmployeeSalaryEntryPage';
import PurchasePage from './pages/PurchasePage';
import PurchaseReturnPage from './pages/PurchaseReturnPage';
import PurchaseHistoryPage from './pages/PurchaseHistoryPage';
import ItemCreationPage from './pages/ItemCreationPage';
import OpeningStockPage from './pages/OpeningStockPage';
import DeliveryNotePage from './pages/DeliveryNotePage';
import DeliveryHistoryPage from './pages/DeliveryHistoryPage';
import ApplicationSetupPage from './pages/ApplicationSetupPage';
import ZatcaSubmissionPage from './pages/ZatcaSubmissionPage';
import { CacheProvider } from './context/CacheContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Menu, AlertCircle, CheckCircle, X } from 'lucide-react';

function AppContent({ theme, setTheme, activePage, activePageParams, navigateTo, user, handleLogout, prevPage }) {
  const { language, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState(null);

  useEffect(() => {
    const originalAlert = window.alert;
    
    window.alert = (message) => {
      const msgStr = String(message || '');
      const isSuccess = msgStr.toLowerCase().includes('success') || 
                        msgStr.includes('تم ') || 
                        msgStr.includes('بنجاح') ||
                        msgStr.includes('موفق');
      setGlobalToast({
        message: msgStr,
        type: isSuccess ? 'success' : 'error'
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  useEffect(() => {
    if (globalToast) {
      const timer = setTimeout(() => {
        setGlobalToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [globalToast]);

  return (
    <div className={`flex h-screen overflow-hidden font-sans antialiased selection:bg-indigo-200 transition-colors duration-300 bg-background text-foreground ${(theme === 'dark' || theme === 'skyblue') ? 'dark' : ''} ${theme === 'skyblue' ? 'skyblue' : ''} ${language === 'ar' ? 'rtl' : ''}`}>
      <Sidebar 
        activePage={activePage} 
        setActivePage={navigateTo} 
        onLogout={handleLogout} 
        user={user} 
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Navbar */}
        <header className="lg:hidden h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Menu size={18} onClick={() => setIsMobileMenuOpen(true)} className="cursor-pointer" />
            </div>
            <span className="font-black text-foreground uppercase tracking-tighter text-lg">EazyERP</span>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
            {user?.username?.substring(0, 1).toUpperCase() || 'A'}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {activePage === 'home' && <HomePage />}
          {activePage === 'sales' && <SalesPage user={user} params={activePageParams} navigateTo={navigateTo} />}
          {activePage === 'sales-return' && <SalesReturnPage user={user} params={activePageParams} navigateTo={navigateTo} />}
          {activePage === 'edit-sale' && <SalesPage user={user} params={activePageParams} navigateTo={navigateTo} onBack={() => navigateTo('sales-history')} />}
          {activePage === 'edit-sales-return' && <SalesReturnPage user={user} params={activePageParams} navigateTo={navigateTo} onBack={() => navigateTo('sales-history')} />}
          {activePage === 'sales-history' && <SalesHistoryPage setActivePage={navigateTo} />}
          {activePage === 'accounts' && <AccountsPage setActivePage={navigateTo} />}
          {activePage === 'expense-accounts' && <ExpenseAccountsPage setActivePage={navigateTo} />}
          {activePage === 'customers-account' && <CustomersAccountPage setActivePage={navigateTo} />}
          {activePage === 'supplier-accounts' && <SupplierAccountsPage setActivePage={navigateTo} />}
          {activePage === 'purchase-accounts' && <PurchaseAccountsPage setActivePage={navigateTo} />}
          {activePage === 'customer-account-form' && <CustomerAccountForm setActivePage={navigateTo} params={activePageParams} />}
          {activePage === 'item-creation' && <ItemCreationPage />}
          {activePage === 'opening-stock' && <OpeningStockPage user={user} />}
          {activePage === 'item-group' && <ItemGroupPage />}
          {activePage === 'unit-master' && <UnitMasterPage />}
          {activePage === 'transaction-types' && <TransactionTypesPage />}
          {activePage === 'user-privileges' && <UserPrivilegesPage />}
          {activePage === 'user-info' && <UserInfoPage />}
          {activePage === 'chart-of-accounts' && <ChartOfAccountsPage setActivePage={navigateTo} params={activePageParams} />}
          {activePage === 'create-account' && <CreateAccountPage setActivePage={navigateTo} initialData={activePageParams} prevPage={prevPage} />}
          {activePage === 'settings' && <SettingsPage theme={theme} setTheme={setTheme} />}
          {activePage === 'customer-receivable' && <CustomerReceivablePage setActivePage={navigateTo} user={user} />}
          {activePage === 'supplier-payable' && <SupplierPayablePage setActivePage={navigateTo} user={user} />}
          {activePage === 'general-voucher' && <GeneralVoucherPage setActivePage={navigateTo} user={user} />}
          {activePage === 'expense-entry' && <ExpenseEntryPage setActivePage={navigateTo} user={user} />}
          {activePage === 'employee-salary' && <EmployeeSalaryEntryPage setActivePage={navigateTo} user={user} />}
          {activePage === 'purchase' && <PurchasePage user={user} params={activePageParams} navigateTo={navigateTo} />}
          {activePage === 'purchase-history' && <PurchaseHistoryPage setActivePage={navigateTo} />}
          {activePage === 'purchase-return' && <PurchaseReturnPage user={user} params={activePageParams} navigateTo={navigateTo} />}
          {activePage === 'edit-purchase' && <PurchasePage user={user} params={activePageParams} navigateTo={navigateTo} onBack={() => navigateTo('purchase-history')} />}
          {activePage === 'edit-purchase-return' && <PurchaseReturnPage user={user} params={activePageParams} navigateTo={navigateTo} onBack={() => navigateTo('purchase-history')} />}
           {activePage === 'quotation-entry' && <QuotationPage user={user} params={activePageParams} navigateTo={navigateTo} onBack={activePageParams?.editQuotation ? () => navigateTo('active-quotations') : null} />}
          {activePage === 'active-quotations' && <ActiveQuotationsPage setActivePage={navigateTo} />}
          {activePage === 'delivery-note' && <DeliveryNotePage user={user} params={activePageParams} navigateTo={navigateTo} />}
          {activePage === 'delivery-history' && <DeliveryHistoryPage setActivePage={navigateTo} />}
          {activePage === 'application-setup' && <ApplicationSetupPage />}
          {activePage === 'zatca-submission-sales' && <ZatcaSubmissionPage />}
          {activePage === 'translation-manager' && <TranslationManagerPage />}
          {['home', 'sales', 'sales-history', 'accounts', 'expense-accounts', 'customers-account', 'supplier-accounts', 'purchase-accounts', 'chart-of-accounts', 'create-account', 'customer-account-form', 'settings', 'lookup-master', 'item-group', 'customer-receivable', 'supplier-payable', 'general-voucher', 'expense-entry', 'employee-salary', 'sales-return', 'edit-sales-return', 'purchase', 'purchase-return', 'translation-manager', 'item-creation', 'opening-stock', 'quotation-entry', 'active-quotations', 'delivery-note', 'delivery-history', 'application-setup', 'zatca-submission-sales'].includes(activePage) ? null : (
            <div className="flex items-center justify-center p-12 h-screen">
              <p className="text-zinc-400 text-lg font-medium text-center w-full">{t('comingSoon')}</p>
            </div>
          )}
        </main>
      </div>

      {/* Centralized Glassmorphic Toast Container */}
      {globalToast && (
        <div 
          onClick={() => setGlobalToast(null)}
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 border cursor-pointer max-w-md w-full sm:w-auto ${
            globalToast.type === 'error'
              ? 'bg-rose-500/90 dark:bg-rose-950/90 border-rose-500/20 text-white backdrop-blur-xl shadow-rose-500/10'
              : 'bg-emerald-500/90 dark:bg-emerald-950/90 border-emerald-500/20 text-white backdrop-blur-xl shadow-emerald-500/10'
          }`}
        >
          {globalToast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-white shrink-0 animate-bounce" />
          ) : (
            <CheckCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs font-black tracking-wide leading-relaxed">{globalToast.message}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setGlobalToast(null); }}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState('sales');
  const [activePageParams, setActivePageParams] = useState({});
  const [prevPage, setPrevPage] = useState('home');

  const navigateTo = (page, params = {}) => {
    setPrevPage(activePage);
    setActivePage(page);
    setActivePageParams(params);
  };

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'skyblue');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'skyblue') {
      document.documentElement.classList.add('dark', 'skyblue');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return (
      <LanguageProvider>
        <CacheProvider>
          <LoginPage onLogin={handleLogin} />
        </CacheProvider>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <CacheProvider>
        <AppContent 
          theme={theme} 
          setTheme={setTheme} 
          activePage={activePage} 
          activePageParams={activePageParams}
          navigateTo={navigateTo}
          user={user}
          handleLogout={handleLogout}
          prevPage={prevPage}
        />
      </CacheProvider>
    </LanguageProvider>
  );
}

export default App;
