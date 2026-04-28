import React, { useState, useEffect } from 'react';

export default function InvoiceHeader({ invoiceNo }) {
  const getLocalDate = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Inv. No</label>
          <input 
            type="text" 
            value={invoiceNo}
            readOnly
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-bold text-zinc-700 dark:text-zinc-300 outline-none" 
          />
        </div>
        
        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Ref #</label>
          <input 
            type="text" 
            placeholder="Reference"
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/10 outline-none transition-all hover:border-zinc-300 dark:text-zinc-200" 
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Salesman</label>
          <div className="relative">
            <select className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm appearance-none focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/10 outline-none hover:border-zinc-300 transition-all cursor-pointer font-medium text-zinc-700 dark:text-zinc-200">
              <option>Admin</option>
              <option>John Doe</option>
              <option>Jane Smith</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
        </div>

        <div>
           <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Date</label>
           <input 
            type="date" 
            value={getLocalDate()}
            readOnly
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 outline-none" 
          />
        </div>
      </div>
    </div>
  );
}
