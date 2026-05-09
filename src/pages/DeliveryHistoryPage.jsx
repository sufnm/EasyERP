import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, FileText, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { useCache } from '../context/CacheContext';
import InvoiceModal from '../components/InvoiceModal';

export default function DeliveryHistoryPage({ setActivePage }) {
  const { cachedSales, isReady, historyInvoiceColumns } = useCache();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(!isReady);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    // Filter specifically for TRN_TYPE = 16 (Delivery Notes)
    const filtered = cachedSales.filter(sale => sale.TRN_TYPE === 16);
    setDeliveries(filtered);
    if (isReady) setLoading(false);
  }, [cachedSales, isReady]);

  const filteredDeliveries = deliveries.filter(sale => {
    const matchesSearch = 
      String(sale.INVOICE_NO).includes(searchQuery) || 
      String(sale.ENAME || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(sale.REF_NO || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const handleEditInvoice = (sale) => {
    setActivePage('delivery-note', { editSale: sale });
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in duration-500 relative">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActivePage('delivery-note')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              title="Back to Delivery Note"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">Delivery Dashboard</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Real-time delivery fulfillment and logs</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm">
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Deliveries</p>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {filteredDeliveries.length}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Unique Consignees</p>
                  <p className="text-xl font-black text-emerald-600 leading-none">
                    {new Set(filteredDeliveries.map(d => d.ACCODE)).size}
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
              placeholder="Search by Delivery #, Customer Name, or Ref Doc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm dark:text-zinc-200"
            />
          </div>
        </div>

        {/* Deliveries List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Delivery Note #</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Reference Doc</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">No delivery notes found matching your criteria</td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr 
                    key={delivery.REC_NO} 
                    onClick={() => setSelectedDelivery(delivery)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-700 dark:text-zinc-200 block">#{delivery.INVOICE_NO}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(delivery.CURDATE).toLocaleDateString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{delivery.ENAME || 'Cash Customer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {delivery.REF_NO && delivery.REF_NO !== '0' && String(delivery.REF_NO).trim() !== '' ? (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40">
                          Ref: #{delivery.REF_NO}
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-600 text-xs">-</span>
                      )}
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
        sale={selectedDelivery} 
        onClose={() => setSelectedDelivery(null)} 
        onEdit={handleEditInvoice}
        historyInvoiceColumns={historyInvoiceColumns}
      />
    </div>
  );
}
