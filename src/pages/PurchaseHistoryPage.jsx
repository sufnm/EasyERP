import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, FileText, Truck, ChevronRight, ArrowLeft, Download } from 'lucide-react';
import { useCache } from '../context/CacheContext';
import InvoiceModal from '../components/InvoiceModal';

export default function PurchaseHistoryPage({ setActivePage }) {
  const { cachedPurchases, isReady, historyInvoiceColumns, defaultCurrency } = useCache();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(!isReady);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, purchases, returns
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
      (filterType === 'cash' && (p.TRN_TYPE === 1 || p.TRN_TYPE === 8)) || 
      (filterType === 'credit' && (p.TRN_TYPE === 2 || p.TRN_TYPE === 9)) ||
      (filterType === 'pending' && (Number(p.CASH_PAID || 0) + Number(p.OTHER_PAID || 0)) !== Number(p.NET_AMOUNT || 0));
    
    const matchesCategory = 
      categoryFilter === 'all' ||
      (categoryFilter === 'purchases' && (p.TRN_TYPE === 1 || p.TRN_TYPE === 2)) ||
      (categoryFilter === 'returns' && (p.TRN_TYPE === 8 || p.TRN_TYPE === 9));

    return matchesSearch && matchesType && matchesCategory;
  });

  const handleExportExcel = () => {
    const headers = ['Invoice No', 'Date', 'Supplier Name', 'Type', 'Amount'];
    const data = filteredPurchases.map(p => [
      p.INVOICE_NO,
      new Date(p.CURDATE).toLocaleDateString(),
      p.ENAME || 'Cash Supplier',
      p.TRN_TYPE === 1 ? 'Cash' : p.TRN_TYPE === 2 ? 'Credit' : p.TRN_TYPE === 8 ? 'Cash Return' : 'Credit Return',
      p.NET_AMOUNT
    ]);
    
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head>';
    html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Purchase History</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
    html += '<style>table { border-collapse: collapse; } th { background-color: #4F46E5; color: white; font-weight: bold; padding: 8px; border: 1px solid #D1D5DB; font-family: sans-serif; font-size: 13px; } td { padding: 8px; border: 1px solid #D1D5DB; font-family: sans-serif; font-size: 12px; }</style>';
    html += '</head><body>';
    html += '<h3>Purchase Transactions List / قائمة مشتريات</h3>';
    html += '<table><thead><tr>';
    headers.forEach(h => {
      html += '<th>' + h + '</th>';
    });
    html += '</tr></thead><tbody>';
    data.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += '<td>' + (cell !== null && cell !== undefined ? cell : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></body></html>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'purchase_history_' + new Date().toISOString().slice(0,10) + '.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const headers = ['Invoice No', 'Date', 'Supplier Name', 'Type', 'Amount'];
    const data = filteredPurchases.map(p => [
      p.INVOICE_NO,
      new Date(p.CURDATE).toLocaleDateString(),
      p.ENAME || 'Cash Supplier',
      p.TRN_TYPE === 1 ? 'Cash' : p.TRN_TYPE === 2 ? 'Credit' : p.TRN_TYPE === 8 ? 'Cash Return' : 'Credit Return',
      p.NET_AMOUNT
    ]);

    const printWindow = window.open('', '_blank');
    let html = '<html><head><title>Purchase History</title>';
    html += '<style>body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1F2937; } h1 { color: #4F46E5; font-size: 20px; margin-bottom: 5px; } p { font-size: 11px; color: #6B7280; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th { background-color: #F3F4F6; text-align: left; padding: 8px; border-bottom: 2px solid #E5E7EB; font-size: 11px; font-weight: bold; text-transform: uppercase; } td { padding: 8px; border-bottom: 1px solid #E5E7EB; font-size: 11px; } tr:nth-child(even) { background-color: #F9FAFB; } @media print { body { padding: 0; } }</style>';
    html += '</head><body>';
    html += '<h1>Purchase Transactions List / قائمة مشتريات</h1>';
    html += '<p>Generated on: ' + new Date().toLocaleString() + '</p>';
    html += '<table><thead><tr>';
    headers.forEach(h => {
      html += '<th>' + h + '</th>';
    });
    html += '</tr></thead><tbody>';
    data.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += '<td>' + (cell !== null && cell !== undefined ? cell : '') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '<script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>';
    html += '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
  };

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
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm">
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Total Purchases</p>
                <p className="text-xl font-black text-emerald-600 leading-none">
                  {defaultCurrency.code} {filteredPurchases.reduce((acc, curr) => acc + (Number(curr.NET_AMOUNT) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Orders</p>
                <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{filteredPurchases.length}</p>
              </div>
              <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Avg. Value</p>
                <p className="text-xl font-black text-amber-500 leading-none">
                  {defaultCurrency.code} {filteredPurchases.length > 0 
                    ? (filteredPurchases.reduce((acc, curr) => acc + (Number(curr.NET_AMOUNT) || 0), 0) / filteredPurchases.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                    : '0'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider shadow-sm h-[46px]"
                title="Download Excel / تحميل اكسل"
              >
                <Download size={14} />
                Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider shadow-sm h-[46px]"
                title="Download PDF / تحميل PDF"
              >
                <Download size={14} />
                PDF
              </button>
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
                onClick={() => setCategoryFilter('purchases')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  categoryFilter === 'purchases' 
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Purchases
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
                      <div>
                        <span className="font-bold text-zinc-700 dark:text-zinc-200 block">#{p.INVOICE_NO}</span>
                        {p.REF_NO && p.REF_NO !== '0' && String(p.REF_NO).trim() !== '' && (
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-tighter">Ref: #{p.REF_NO}</span>
                        )}
                      </div>
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
                        p.TRN_TYPE === 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        p.TRN_TYPE === 2 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {p.TRN_TYPE === 1 ? 'Cash' : 
                         p.TRN_TYPE === 2 ? 'Credit' : 
                         p.TRN_TYPE === 8 ? 'Cash Return' : 'Credit Return'}
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
