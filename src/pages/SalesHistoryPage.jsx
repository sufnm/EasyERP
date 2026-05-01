import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, Calendar, FileText, User, CreditCard, ChevronRight, Filter, X, Package } from 'lucide-react';
import { useCache } from '../context/CacheContext';

export default function SalesHistoryPage() {
  const { cachedSales, refreshCache, isReady, historyInvoiceColumns } = useCache();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(!isReady);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    setSales(cachedSales);
    if (isReady) setLoading(false);
  }, [cachedSales, isReady]);

  const fetchSaleDetails = async (sale) => {
    setSelectedSale(sale);
    setLoadingItems(true);
    try {
      const res = await fetch(API_ENDPOINTS.SALE_ITEMS(sale.REC_NO));
      if (res.ok) {
        const data = await res.json();
        setSaleItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch sale items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      String(sale.INVOICE_NO).includes(searchQuery) || 
      String(sale.ENAME || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = 
      filterType === 'all' || 
      (filterType === 'cash' && sale.TRN_TYPE === 6) || 
      (filterType === 'credit' && sale.TRN_TYPE === 7);

    return matchesSearch && matchesType;
  });

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
                    SAR {filteredSales.reduce((acc, curr) => acc + (Number(curr.NET_AMOUNT) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                    SAR {filteredSales.length > 0 
                      ? (filteredSales.reduce((acc, curr) => acc + (Number(curr.G_TOTAL) || 0), 0) / filteredSales.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : '0'}
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Invoice # or Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm dark:text-zinc-200"
            />
          </div>
          
          <div className="lg:col-span-4 flex gap-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                filterType === 'all' 
                ? 'bg-zinc-800 text-white border-zinc-800 shadow-lg shadow-zinc-900/20' 
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('cash')}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                filterType === 'cash' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-900/20' 
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
              }`}
            >
              Cash
            </button>
            <button 
              onClick={() => setFilterType('credit')}
              className={`flex-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                filterType === 'credit' 
                ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-900/20' 
                : 'bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50'
              }`}
            >
              Credit
            </button>
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
                    onClick={() => fetchSaleDetails(sale)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <FileText size={16} />
                        </div>
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">#{sale.INVOICE_NO}</span>
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
                          sale.TRN_TYPE === 6 
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' 
                          : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800'
                        }`}>
                          {sale.TRN_TYPE === 6 ? 'Cash' : 'Others'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-zinc-800 dark:text-zinc-100">
                        SAR {(Number(sale.NET_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
      {selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setSelectedSale(null)}></div>
          
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">Invoice #{selectedSale.INVOICE_NO}</h2>
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} /> {new Date(selectedSale.CURDATE).toLocaleDateString()}
                    <span className="mx-1">•</span>
                    <User size={12} /> {selectedSale.ENAME || 'Cash Customer'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingItems ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Loading items...</p>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                          {historyInvoiceColumns.barcode && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Barcode</th>}
                          {historyInvoiceColumns.description && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Description</th>}
                          {historyInvoiceColumns.unit && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">UNIT</th>}
                          {historyInvoiceColumns.qty && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Qty</th>}
                          {historyInvoiceColumns.price && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">PRICE</th>}
                          {historyInvoiceColumns.vatPercent && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">VAT%</th>}
                          {historyInvoiceColumns.vatAmt && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">VAT Amt</th>}
                          {historyInvoiceColumns.total && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Total</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {saleItems.map((item, idx) => {
                          const unitPrice = Number(item.UNIT_PRICE) || 0;
                          const qty = Number(item.QTY) || 0;
                          const netSubtotal = unitPrice * qty;
                          
                          return (
                            <tr key={idx} className="text-[11px]">
                              {historyInvoiceColumns.barcode && <td className="px-4 py-3 font-mono text-zinc-500">{item.BARCODE}</td>}
                              {historyInvoiceColumns.description && <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200">{item.DESCRIPTION}</td>}
                              {historyInvoiceColumns.unit && <td className="px-4 py-3 text-center font-medium">SAR {unitPrice.toFixed(2)}</td>}
                              {historyInvoiceColumns.qty && <td className="px-4 py-3 text-center">{qty.toFixed(2)}</td>}
                              {historyInvoiceColumns.price && <td className="px-4 py-3 text-right text-zinc-500 font-bold">SAR {netSubtotal.toFixed(2)}</td>}
                              {historyInvoiceColumns.vatPercent && <td className="px-4 py-3 text-right text-zinc-400">{Number(item.VAT_PERCENT || 0).toFixed(0)}%</td>}
                              {historyInvoiceColumns.vatAmt && <td className="px-4 py-3 text-right text-zinc-400">SAR {Number(item.VAT_AMOUNT || 0).toFixed(2)}</td>}
                              {historyInvoiceColumns.total && <td className="px-4 py-3 text-right font-black text-zinc-800 dark:text-zinc-100">SAR {Number(item.ITM_TOTAL).toFixed(2)}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Gross Total</p>
                      <p className="text-lg font-black text-zinc-700 dark:text-zinc-200">
                        SAR {(Number(selectedSale.G_TOTAL) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Discount</p>
                      <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                        SAR {(Number(selectedSale.DISC_AMT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">VAT Amount</p>
                      <p className="text-lg font-black text-zinc-700 dark:text-zinc-200">
                        SAR {(Number(selectedSale.VAT_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 ml-auto w-full text-right">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Net Total</p>
                      <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                        SAR {(Number(selectedSale.NET_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end gap-3">
               <button 
                onClick={() => setSelectedSale(null)}
                className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
               >
                Close
               </button>
               <button className="px-6 py-2 rounded-xl bg-zinc-800 dark:bg-zinc-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-900 transition-all flex items-center gap-2 shadow-lg shadow-zinc-900/20">
                 <FileText size={14} /> Print Invoice
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
