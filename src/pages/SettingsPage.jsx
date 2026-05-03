import React from 'react';
import { Moon, Sun, Settings as SettingsIcon, Monitor, Bell, Shield, Table, History, Cloud } from 'lucide-react';
import { useCache } from '../context/CacheContext';

export default function SettingsPage({ theme, setTheme }) {
  const { historyInvoiceColumns, setHistoryInvoiceColumns, currencies, defaultCurrency, setDefaultCurrency } = useCache();

  const toggleColumn = (key) => {
    setHistoryInvoiceColumns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const columns = [
    { key: 'barcode', label: 'Barcode' },
    { key: 'description', label: 'Description' },
    { key: 'unit', label: 'Unit Price' },
    { key: 'qty', label: 'Quantity' },
    { key: 'price', label: 'Subtotal' },
    { key: 'vatPercent', label: 'VAT %' },
    { key: 'vatAmt', label: 'VAT Amount' },
    { key: 'total', label: 'Total Amount' },
  ];

  const themes = [
    { id: 'light', label: 'Light', icon: Sun, color: 'bg-amber-100 text-amber-600' },
    { id: 'dark', label: 'Dark', icon: Moon, color: 'bg-indigo-900/30 text-indigo-400' },
    { id: 'skyblue', label: 'Sky Blue', icon: Cloud, color: 'bg-sky-100 text-sky-600' }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Control your application preferences and theme</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation - Sidebar subtle */}
        <div className="md:col-span-1 space-y-1">
          <button 
            onClick={() => {
               const el = document.getElementById('appearance-section');
               el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold rounded-xl text-sm transition-all"
          >
            <Monitor size={18} />
            Appearance
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('software-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm transition-all group"
          >
            <SettingsIcon size={18} className="group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
            Software Settings
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('columns-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm transition-all group"
          >
            <History size={18} className="group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
            Invoice Layout
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          <section id="appearance-section" className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">Appearance Settings</h2>
            
            <div className="grid grid-cols-3 gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    theme === t.id 
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' 
                    : 'border-transparent bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${t.color}`}>
                    <t.icon size={24} />
                  </div>
                  <span className={`text-xs font-bold ${theme === t.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </section>
          
          <section id="software-section" className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                 <SettingsIcon size={16} />
               </div>
               <h2 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Software Settings</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Default Base Currency</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 font-medium">
                  This currency will be used for analytics, reports, and as the initial default for new sales.
                </p>
                <div className="flex flex-wrap gap-2">
                  {currencies.map((curr) => (
                    <button
                      key={curr.Currency_No}
                      onClick={() => setDefaultCurrency({ code: curr.Currency_code, no: curr.Currency_No })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        defaultCurrency.no === curr.Currency_No
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100'
                      }`}
                    >
                      {curr.Currency_code} - {curr.Currency_Name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="columns-section" className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                 <Table size={16} />
               </div>
               <h2 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">History Invoice Columns</h2>
            </div>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
              Choose which columns to show when viewing a saved invoice in the Sales History Dashboard.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {columns.map((col) => (
                <div 
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    historyInvoiceColumns[col.key]
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800'
                  }`}
                >
                  <span className={`text-[11px] font-black uppercase tracking-tight ${
                    historyInvoiceColumns[col.key] ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
                  }`}>
                    {col.label}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    historyInvoiceColumns[col.key] 
                    ? 'bg-indigo-600 border-indigo-600' 
                    : 'bg-transparent border-zinc-300 dark:border-zinc-700'
                  }`}>
                    {historyInvoiceColumns[col.key] && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
