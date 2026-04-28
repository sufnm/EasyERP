import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import SalesPage from './pages/SalesPage';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from './pages/SettingsPage';
import { CacheProvider } from './context/CacheContext';

function App() {
  const [activePage, setActivePage] = useState('sales');
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

  return (
    <CacheProvider>
      <div className={`flex h-screen overflow-hidden font-sans antialiased selection:bg-indigo-200 transition-colors duration-300 bg-background text-foreground ${darkMode ? 'dark' : ''}`}>
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        
        <main className="flex-1 overflow-y-auto">
          {activePage === 'home' && <HomePage />}
          {activePage === 'sales' && <SalesPage />}
          {activePage === 'accounts' && <AccountsPage />}
          {activePage === 'settings' && <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />}
          {activePage !== 'home' && activePage !== 'sales' && activePage !== 'settings' && (
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
