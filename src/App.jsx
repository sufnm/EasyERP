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
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import { CacheProvider } from './context/CacheContext';

function App() {
  const [activePage, setActivePage] = useState('sales');
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

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
      <div className={`flex h-screen overflow-hidden font-sans antialiased selection:bg-indigo-200 transition-colors duration-300 bg-background text-foreground ${darkMode ? 'dark' : ''}`}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} onLogout={handleLogout} user={user} />
        
        <main className="flex-1 overflow-y-auto">
          {activePage === 'home' && <HomePage />}
          {activePage === 'sales' && <SalesPage user={user} />}
          {activePage === 'sales-history' && <SalesHistoryPage />}
          {activePage === 'accounts' && <AccountsPage setActivePage={setActivePage} />}
          {activePage === 'expense-accounts' && <ExpenseAccountsPage setActivePage={setActivePage} />}
          {activePage === 'customers-account' && <CustomersAccountPage setActivePage={setActivePage} />}
          {activePage === 'supplier-accounts' && <SupplierAccountsPage setActivePage={setActivePage} />}
          {activePage === 'chart-of-accounts' && <ChartOfAccountsPage setActivePage={setActivePage} />}
          {activePage === 'create-account' && <CreateAccountPage setActivePage={setActivePage} />}
          {activePage === 'settings' && <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />}
          {['home', 'sales', 'sales-history', 'accounts', 'expense-accounts', 'customers-account', 'supplier-accounts', 'chart-of-accounts', 'create-account', 'settings'].includes(activePage) ? null : (
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
