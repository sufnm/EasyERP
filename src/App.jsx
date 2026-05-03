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
import CustomerReceivablePage from './pages/CustomerReceivablePage';
import { CacheProvider } from './context/CacheContext';

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
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <CacheProvider>
      <div className={`flex h-screen overflow-hidden font-sans antialiased selection:bg-indigo-200 transition-colors duration-300 bg-background text-foreground ${(theme === 'dark' || theme === 'skyblue') ? 'dark' : ''} ${theme === 'skyblue' ? 'skyblue' : ''}`}>
        <Sidebar activePage={activePage} setActivePage={navigateTo} onLogout={handleLogout} user={user} />
        
        <main className="flex-1 overflow-y-auto">
          {activePage === 'home' && <HomePage />}
           {activePage === 'sales' && <SalesPage user={user} params={activePageParams} />}
           {activePage === 'edit-sale' && <SalesPage user={user} params={activePageParams} onBack={() => navigateTo('sales-history')} />}
          {activePage === 'sales-history' && <SalesHistoryPage setActivePage={navigateTo} />}
          {activePage === 'accounts' && <AccountsPage setActivePage={navigateTo} />}
          {activePage === 'expense-accounts' && <ExpenseAccountsPage setActivePage={navigateTo} />}
          {activePage === 'customers-account' && <CustomersAccountPage setActivePage={navigateTo} />}
          {activePage === 'supplier-accounts' && <SupplierAccountsPage setActivePage={navigateTo} />}
          {activePage === 'purchase-accounts' && <PurchaseAccountsPage setActivePage={navigateTo} />}
          {activePage === 'customer-account-form' && <CustomerAccountForm setActivePage={navigateTo} params={activePageParams} />}
          {activePage === 'item-group' && <ItemGroupPage />}
          {activePage === 'chart-of-accounts' && <ChartOfAccountsPage setActivePage={navigateTo} params={activePageParams} />}
          {activePage === 'create-account' && <CreateAccountPage setActivePage={navigateTo} initialData={activePageParams} prevPage={prevPage} />}
          {activePage === 'settings' && <SettingsPage theme={theme} setTheme={setTheme} />}
          {activePage === 'customer-receivable' && <CustomerReceivablePage setActivePage={navigateTo} />}
          {['home', 'sales', 'edit-sale', 'sales-history', 'accounts', 'expense-accounts', 'customers-account', 'supplier-accounts', 'purchase-accounts', 'chart-of-accounts', 'create-account', 'customer-account-form', 'settings', 'lookup-master', 'item-group', 'customer-receivable', 'supplier-payable', 'general-voucher', 'expense-entry', 'employee-salary', 'sales-return', 'purchase', 'purchase-return'].includes(activePage) ? null : (
            <div className="flex items-center justify-center p-12 h-screen">
               <p className="text-zinc-400 text-lg font-medium">Coming Soon</p>
            </div>
          )}
        </main>
      </div>
    </CacheProvider>
  );
}

export default App;
