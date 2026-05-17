import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, FileText, User, ChevronRight, ArrowLeft, Download } from 'lucide-react';
import { useCache } from '../context/CacheContext';
import { useLanguage } from '../context/LanguageContext';
import InvoiceModal from '../components/InvoiceModal';

export default function ActiveQuotationsPage({ setActivePage }) {
  const { language } = useLanguage();
  const { historyInvoiceColumns, defaultCurrency } = useCache();
  
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, COMPLETED, PENDING

  useEffect(() => {
    setLoading(true);
    fetch(`${API_ENDPOINTS.SALES_HISTORY}?trnType=19`)
      .then(res => res.json())
      .then(data => {
        setQuotations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch active quotations:", err);
        setLoading(false);
      });
  }, []);

  const filteredQuotations = quotations.filter(quote => {
    const matchesSearch = 
      String(quote.INVOICE_NO).includes(searchQuery) || 
      String(quote.ENAME || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const isCompleted = quote.QOT_INV_NO && quote.QOT_INV_NO !== '0';
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'COMPLETED' && isCompleted) || 
      (statusFilter === 'PENDING' && !isCompleted);

    return matchesSearch && matchesStatus;
  });

  const handleEditQuotation = (quote) => {
    setActivePage('quotation-entry', { editQuotation: quote });
  };

  const totalEstimatedValue = filteredQuotations.reduce((acc, curr) => acc + (Number(curr.NET_AMOUNT) || 0), 0);
  const avgValue = filteredQuotations.length > 0 ? (totalEstimatedValue / filteredQuotations.length) : 0;

  const handleExportExcel = () => {
    const headers = language === 'ar' 
      ? ['رقم العرض', 'التاريخ', 'اسم العميل', 'الحالة', 'المبلغ']
      : ['Quotation No', 'Date', 'Customer Name', 'Type', 'Amount'];
    const data = filteredQuotations.map(quote => [
      quote.INVOICE_NO,
      quote.CURDATE ? new Date(quote.CURDATE).toLocaleDateString() : '',
      quote.ENAME || 'Cash Customer',
      language === 'ar' ? 'عرض سعر' : 'Quotation',
      ((Number(quote.NET_AMOUNT) || 0) / (quote.CRATE || 1)).toFixed(2)
    ]);
    
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head>';
    html += '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Active Quotations</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->';
    html += '<style>table { border-collapse: collapse; } th { background-color: #4F46E5; color: white; font-weight: bold; padding: 8px; border: 1px solid #D1D5DB; font-family: sans-serif; font-size: 13px; } td { padding: 8px; border: 1px solid #D1D5DB; font-family: sans-serif; font-size: 12px; }</style>';
    html += '</head><body>';
    html += '<h3>' + (language === 'ar' ? 'قائمة عروض الأسعار النشطة' : 'Active Quotations List') + '</h3>';
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
    link.download = 'quotations_history_' + new Date().toISOString().slice(0,10) + '.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const headers = language === 'ar' 
      ? ['رقم العرض', 'التاريخ', 'اسم العميل', 'الحالة', 'المبلغ']
      : ['Quotation No', 'Date', 'Customer Name', 'Type', 'Amount'];
    const data = filteredQuotations.map(quote => [
      quote.INVOICE_NO,
      quote.CURDATE ? new Date(quote.CURDATE).toLocaleDateString() : '',
      quote.ENAME || 'Cash Customer',
      language === 'ar' ? 'عرض سعر' : 'Quotation',
      ((Number(quote.NET_AMOUNT) || 0) / (quote.CRATE || 1)).toFixed(2)
    ]);

    const printWindow = window.open('', '_blank');
    let html = '<html><head><title>' + (language === 'ar' ? 'العروض النشطة' : 'Active Quotations') + '</title>';
    html += '<style>body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1F2937; } h1 { color: #4F46E5; font-size: 20px; margin-bottom: 5px; } p { font-size: 11px; color: #6B7280; margin-bottom: 20px; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th { background-color: #F3F4F6; text-align: left; padding: 8px; border-bottom: 2px solid #E5E7EB; font-size: 11px; font-weight: bold; text-transform: uppercase; } td { padding: 8px; border-bottom: 1px solid #E5E7EB; font-size: 11px; } tr:nth-child(even) { background-color: #F9FAFB; } @media print { body { padding: 0; } }</style>';
    html += '</head><body>';
    html += '<h1>' + (language === 'ar' ? 'قائمة عروض الأسعار النشطة / Active Quotations' : 'Active Quotations List') + '</h1>';
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
    <div className="flex flex-col h-full p-6 animate-in fade-in duration-500 relative">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActivePage('quotation-entry')}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              title="Back to Quotation Entry"
            >
              <ArrowLeft size={24} className={language === 'ar' ? 'rotate-180' : ''} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">
                {language === 'ar' ? 'العروض النشطة' : 'Active Quotations'}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                {language === 'ar' ? 'متابعة وإدارة العروض النشطة وتقديرات الأسعار' : 'Manage and monitor customer estimates and active quotations'}
              </p>
            </div>
          </div>
          
          {/* Metrics Group */}
          <div className="flex flex-wrap items-center gap-3">
             <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-sm">
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
                    {language === 'ar' ? 'إجمالي القيمة التقديرية' : 'Estimated Value'}
                  </p>
                  <p className="text-xl font-black text-emerald-600 leading-none">
                    {defaultCurrency.code} {totalEstimatedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
                    {language === 'ar' ? 'إجمالي العروض' : 'Total Estimates'}
                  </p>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {filteredQuotations.length}
                  </p>
                </div>
                <div className="h-10 w-px bg-zinc-100 dark:bg-zinc-800"></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">
                    {language === 'ar' ? 'متوسط قيمة العرض' : 'Avg. Quote Value'}
                  </p>
                  <p className="text-xl font-black text-amber-500 leading-none">
                    {defaultCurrency.code} {avgValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={handleExportExcel}
                 className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider shadow-sm h-[46px]"
                 title={language === 'ar' ? 'تحميل اكسل' : 'Download Excel'}
               >
                 <Download size={14} />
                 Excel
               </button>
               <button
                 onClick={handleExportPDF}
                 className="flex items-center gap-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider shadow-sm h-[46px]"
                 title={language === 'ar' ? 'تحميل PDF' : 'Download PDF'}
               >
                 <Download size={14} />
                 PDF
               </button>
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder={language === 'ar' ? 'البحث بواسطة رقم العرض أو اسم العميل...' : 'Search by Quotation # or Customer Name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm dark:text-zinc-200"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full md:w-auto">
            {[
              { id: 'ALL', label: language === 'ar' ? 'الكل' : 'All' },
              { id: 'PENDING', label: language === 'ar' ? 'قيد الانتظار' : 'Pending' },
              { id: 'COMPLETED', label: language === 'ar' ? 'مكتمل' : 'Completed' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === btn.id 
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quotations List */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className={`px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'عرض السعر' : 'Quotation #'}
                </th>
                <th className={`px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'التاريخ' : 'Date'}
                </th>
                <th className={`px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'العميل' : 'Customer'}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                  {language === 'ar' ? 'الحالة' : 'Type'}
                </th>
                {statusFilter === 'COMPLETED' && (
                  <th className={`px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center`}>
                    {language === 'ar' ? 'رقم فاتورة البيع' : 'Sale Invoice No.'}
                  </th>
                )}
                <th className={`px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                  {language === 'ar' ? 'المبلغ' : 'Amount'}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={statusFilter === 'COMPLETED' ? 7 : 6} className="px-6 py-6"><div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div></td>
                  </tr>
                ))
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={statusFilter === 'COMPLETED' ? 7 : 6} className="px-6 py-12 text-center text-zinc-400 italic">
                    {language === 'ar' ? 'لم يتم العثور على عروض أسعار نشطة' : 'No active quotations found'}
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quote) => (
                  <tr 
                    key={quote.REC_NO} 
                    onClick={() => setSelectedQuotation(quote)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-zinc-700 dark:text-zinc-200 block">#{quote.INVOICE_NO}</span>
                          {quote.REF_NO && quote.REF_NO !== '0' && String(quote.REF_NO).trim() !== '' && (
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-tighter">
                              Ref: #{quote.REF_NO}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(quote.CURDATE).toLocaleDateString(undefined, { 
                        year: 'numeric', month: 'short', day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-zinc-400" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{quote.ENAME || 'Cash Customer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tighter bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                          {language === 'ar' ? 'مسودة عرض' : 'Quotation'}
                        </span>
                      </div>
                    </td>
                    {statusFilter === 'COMPLETED' && (
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          #{quote.QOT_INV_NO}
                        </span>
                      </td>
                    )}
                    <td className={`px-6 py-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                      <span className="font-black text-zinc-800 dark:text-zinc-100">
                        {quote.CURRENCY_CODE || 'SAR'} {((Number(quote.NET_AMOUNT) || 0) / (quote.CRATE || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className={`px-6 py-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                      <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 group-hover:text-indigo-600 transition-all">
                        <ChevronRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quotation View and Edit Details Modal */}
      <InvoiceModal 
        sale={selectedQuotation} 
        onClose={() => setSelectedQuotation(null)} 
        onEdit={handleEditQuotation}
        onCompleteSales={(quote) => setActivePage('sales', { loadQuotation: quote })}
        historyInvoiceColumns={historyInvoiceColumns}
        onShare={(sale) => {
          setActivePage('share', { invoice: sale });
        }}
      />
    </div>
  );
}
