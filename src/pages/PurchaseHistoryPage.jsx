import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, FileText, Truck, ChevronRight, ArrowLeft } from 'lucide-react';
import { useCache } from '../context/CacheContext';
import InvoiceModal from '../components/InvoiceModal';

export default function PurchaseHistoryPage({ setActivePage }) {
  const { cachedPurchases, isReady, historyInvoiceColumns, defaultCurrency } = useCache();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(!isReady);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  useEffect(() => {
    setPurchases(cachedPurchases);
    if (isReady) setLoading(false);
  }, [cachedPurchases, isReady]);

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      String(p.INVOICE_NO).includes(searchQuery) || 
      String(p.ENAME || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'cash' && p.TRN_TYPE === 1) || 
      (filterType === 'credit' && p.TRN_TYPE === 2);
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in duration-500 relative bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActivePage('purchase')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-500"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">Purchase History</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Manage your inventory inflows</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Purchases</p>
              <p className="text-xl font-black text-indigo-600 leading-none">
                {defaultCurrency.code} {filteredPurchases.reduce((acc, curr) => acc + (Number(curr.NET_AMOUNT) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Orders</p>
              <p className="text-xl font-black text-zinc-800 dark:text-zinc-100 leading-none">{filteredPurchases.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Invoice # or Supplier Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
            {['all', 'cash', 'credit'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === type ? 'bg-white dark:bg-zinc-700 shadow-sm text-primary' : 'text-zinc-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center animate-pulse text-zinc-400">Loading history...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">No purchases found</td></tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.REC_NO} onClick={() => setSelectedPurchase(p)} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                        <FileText size={16} />
                      </div>
                      <span className="font-bold text-zinc-700 dark:text-zinc-200">#{p.INVOICE_NO}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(p.CURDATE).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{p.ENAME || 'Cash Supplier'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                        p.TRN_TYPE === 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {p.TRN_TYPE === 1 ? 'Cash' : 'Credit'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-zinc-800 dark:text-zinc-100">
                      {p.CURRENCY_CODE || 'SAR'} {(Number(p.NET_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-400 group-hover:text-primary transition-colors">
                      <ChevronRight size={18} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceModal 
        sale={selectedPurchase} 
        onClose={() => setSelectedPurchase(null)} 
        historyInvoiceColumns={historyInvoiceColumns}
        isPurchase={true}
      />
    </div>
  );
}
