import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import SalesPage from './pages/SalesPage';
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
<<<<<<< HEAD
import PurchasePage from './pages/PurchasePage';
import PurchaseHistoryPage from './pages/PurchaseHistoryPage';
=======
import ItemCreationPage from './pages/ItemCreationPage';
import OpeningStockPage from './pages/OpeningStockPage';
>>>>>>> 927ced4 (6 may)
import { CacheProvider } from './context/CacheContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Menu } from 'lucide-react';

function AppContent({ theme, setTheme, activePage, activePageParams, navigateTo, user, handleLogout, prevPage }) {
  const { language, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          {activePage === 'opening-stock' && <OpeningStockPage />}
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
          {activePage === 'translation-manager' && <TranslationManagerPage />}
          {['home', 'sales', 'sales-history', 'accounts', 'expense-accounts', 'customers-account', 'supplier-accounts', 'purchase-accounts', 'chart-of-accounts', 'create-account', 'customer-account-form', 'settings', 'lookup-master', 'item-group', 'customer-receivable', 'supplier-payable', 'general-voucher', 'expense-entry', 'employee-salary', 'sales-return', 'edit-sales-return', 'purchase', 'purchase-return', 'translation-manager', 'item-creation', 'opening-stock'].includes(activePage) ? null : (
            <div className="flex items-center justify-center p-12 h-screen">
              <p className="text-zinc-400 text-lg font-medium text-center w-full">{t('comingSoon')}</p>
            </div>
          )}
        </main>
      </div>
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
