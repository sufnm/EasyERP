import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, FileText, User, ChevronRight } from 'lucide-react';
import { useCache } from '../context/CacheContext';
import InvoiceModal from '../components/InvoiceModal';

export default function SalesHistoryPage({ setActivePage }) {
  const { cachedSales, isReady, historyInvoiceColumns, defaultCurrency } = useCache();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(!isReady);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, sales, returns
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    setSales(cachedSales);
    if (isReady) setLoading(false);
  }, [cachedSales, isReady]);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      String(sale.INVOICE_NO).includes(searchQuery) || 
      String(sale.ENAME || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'cash' && (sale.TRN_TYPE === 6 || sale.TRN_TYPE === 3)) || 
      (filterType === 'credit' && (sale.TRN_TYPE === 7 || sale.TRN_TYPE === 4)) ||
      (filterType === 'pending' && (Number(sale.CASH_PAID || 0) + Number(sale.OTHER_PAID || 0)) !== Number(sale.NET_AMOUNT || 0));
    
    const matchesCategory = 
      categoryFilter === 'all' ||
      (categoryFilter === 'sales' && (sale.TRN_TYPE === 6 || sale.TRN_TYPE === 7)) ||
      (categoryFilter === 'returns' && (sale.TRN_TYPE === 3 || sale.TRN_TYPE === 4));

    return matchesSearch && matchesType && matchesCategory;
  });

  const handleEditInvoice = (sale) => {
    if (sale.TRN_TYPE === 3 || sale.TRN_TYPE === 4) {
      setActivePage('edit-sales-return', { editSale: sale });
    } else {
      setActivePage('edit-sale', { editSale: sale });
    }
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in duration-500 relative">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">Sales Dashboard</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Real-time performance metrics and history</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm">
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Revenue</p>
                  <p className="text-xl font-black text-emerald-600 leading-none">
                    {defaultCurrency.code} {filteredSales.reduce((acc, curr) => acc + (Number(curr.NET_AMOUNT) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Orders</p>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {filteredSales.length}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Avg. Value</p>
                  <p className="text-xl font-black text-amber-500 leading-none">
                    {defaultCurrency.code} {filteredSales.length > 0 
                      ? (filteredSales.reduce((acc, curr) => acc + (Number(curr.G_TOTAL) || 0), 0) / filteredSales.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : '0'}
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Invoice # or Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm dark:text-zinc-200"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1 shadow-sm">
              <button 
                onClick={() => setCategoryFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter === 'all' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                All Transactions
              </button>
              <button 
                onClick={() => setCategoryFilter('sales')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter === 'sales' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Sales
              </button>
              <button 
                onClick={() => setCategoryFilter('returns')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter === 'returns' 
                  ? 'bg-white dark:bg-zinc-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Returns
              </button>
            </div>
          
            <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setFilterType('all')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === 'all' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType('cash')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === 'cash' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-emerald-600'
                }`}
              >
                Cash
              </button>
              <button 
                onClick={() => setFilterType('credit')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === 'credit' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-amber-500'
                }`}
              >
                Credit
              </button>
              <button 
                onClick={() => setFilterType('pending')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterType === 'pending' 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-rose-500'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Invoice</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Type</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">No sales found matching your criteria</td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr 
                    key={sale.REC_NO} 
                    onClick={() => setSelectedSale(sale)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-700 dark:text-zinc-200 block">#{sale.INVOICE_NO}</span>
                          {sale.REF_NO && <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-tighter">Ref: #{sale.REF_NO}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(sale.CURDATE).toLocaleDateString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{sale.ENAME || 'Cash Customer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                          (sale.TRN_TYPE === 6 || sale.TRN_TYPE === 3)
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800'
                        }`}>
                          {sale.TRN_TYPE === 6 ? 'Cash' : sale.TRN_TYPE === 3 ? 'Return Cash' : sale.TRN_TYPE === 4 ? 'Return Credit' : 'Others'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-zinc-800 dark:text-zinc-100">
                        {sale.CURRENCY_CODE || 'SAR'} {(Number(sale.NET_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 group-hover:text-primary transition-all">
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <InvoiceModal 
        sale={selectedSale} 
        onClose={() => setSelectedSale(null)} 
        onEdit={handleEditInvoice}
        historyInvoiceColumns={historyInvoiceColumns}
      />
    </div>
  );
}
