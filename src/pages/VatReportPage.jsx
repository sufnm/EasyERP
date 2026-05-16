import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Filter, Download, Search, X, ChevronDown, Printer, FileText } from 'lucide-react';
import API_BASE_URL from '../config';

export default function VatReportPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d => d ? String(d).split('T')[0] : '';

  // Filter state
  const [dateFilter, setDateFilter] = useState('custom');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTrn, setSelectedTrn] = useState('0');
  const [selectedAccount, setSelectedAccount] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/reports/trn-types`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/reports/accounts-list`).then(r => r.json())
    ]).then(([trnData, accData]) => {
      setTransactions(Array.isArray(trnData) ? trnData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
    }).catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ 
        dateFilter, fromDate, toDate, 
        trnCode: selectedTrn, 
        accNo: selectedAccount 
      });
      const res = await fetch(`${API_BASE_URL}/api/reports/vat-report?${params}`);
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch (err) {
      console.error(err);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, fromDate, toDate, selectedTrn, selectedAccount]);

  const filteredData = reportData.filter(row => {
    const term = searchTerm.toLowerCase();
    return !term || 
      String(row.INVOICE_NO || '').toLowerCase().includes(term) ||
      String(row.ENAME || '').toLowerCase().includes(term) ||
      String(row.VAT_NUMBER || '').toLowerCase().includes(term);
  });

  const totTaxable = filteredData.reduce((s, r) => s + Number(r.TAXABLE_AMOUNT || 0), 0);
  const totVat = filteredData.reduce((s, r) => s + Number(r.VAT_AMOUNT || 0), 0);
  const totNet = filteredData.reduce((s, r) => s + Number(r.NET_AMOUNT || 0), 0);

  const exportCSV = () => {
    const headers = ['Date', 'Invoice', 'Customer', 'TRN Type', 'Taxable Amt', 'VAT%', 'VAT Amount', 'Net Amount', 'VAT Number', 'Zatca Status', 'Submit Date'];
    const rows = filteredData.map(r => [
      fmtDate(r.CURDATE), r.INVOICE_NO, r.ENAME, isAr ? r.TRN_ANAME : r.TRN_NAME,
      r.TAXABLE_AMOUNT, r.VAT_PERCENT, r.VAT_AMOUNT, r.NET_AMOUNT, r.VAT_NUMBER,
      r.ZATCA_SEND === 1 ? 'Submitted' : 'Pending', fmtDate(r.submit_date)
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `vat_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const rows = filteredData.map((r, i) => `
      <tr style="background:${i%2===0?'#fff':'#f8f8f8'}">
        <td>${fmtDate(r.CURDATE)}</td>
        <td>${r.INVOICE_NO}</td>
        <td>${r.ENAME}</td>
        <td style="text-align:right">${fmt(r.TAXABLE_AMOUNT)}</td>
        <td style="text-align:center">${r.VAT_PERCENT}%</td>
        <td style="text-align:right;color:#7c3aed">${fmt(r.VAT_AMOUNT)}</td>
        <td style="text-align:right;font-weight:bold">${fmt(r.NET_AMOUNT)}</td>
        <td>${r.VAT_NUMBER || ''}</td>
        <td>${r.ZATCA_SEND === 1 ? 'SENT' : ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}">
<head><meta charset="UTF-8"><title>VAT Report</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#111}
  table{width:100%;border-collapse:collapse} th{background:#1e40af;color:#fff;padding:6px 8px;text-align:left}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
  tfoot td{background:#f1f5f9;font-weight:bold;border-top:2px solid #cbd5e1}
</style></head><body>
<h2>${isAr ? 'تقرير ضريبة القيمة المضافة' : 'VAT Report'}</h2>
<table>
<thead><tr>
  <th>${isAr?'التاريخ':'Date'}</th><th>${isAr?'الفاتورة':'Inv#'}</th><th>${isAr?'العميل':'Customer'}</th>
  <th style="text-align:right">${isAr?'الخاضع':'Taxable'}</th><th style="text-align:center">%</th>
  <th style="text-align:right">${isAr?'الضريبة':'VAT'}</th><th style="text-align:right">${isAr?'الصافي':'Net'}</th>
  <th>${isAr?'الرقم الضريبي':'VAT No.'}</th><th>Status</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr>
  <td colspan="3">${isAr?'الإجمالي':'Total'}</td>
  <td style="text-align:right">${fmt(totTaxable)}</td><td></td>
  <td style="text-align:right">${fmt(totVat)}</td><td style="text-align:right">${fmt(totNet)}</td>
  <td colspan="2"></td>
</tr></tfoot></table></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${isAr ? 'rtl' : ''}`}>
      <div className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">{isAr ? 'تقرير الضريبة' : 'VAT Report'}</h1>
              <p className="text-xs text-muted-foreground font-medium">{isAr ? 'تحليل ضريبة القيمة المضافة' : 'VAT analysis and reporting'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!hasLoaded || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"><Download size={13}/> CSV</button>
            <button onClick={exportPDF} disabled={!hasLoaded || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20"><Printer size={13}/> PDF</button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-border bg-card/30 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'الفترة' : 'Period'}</label>
            <div className="flex rounded-xl overflow-hidden border border-border h-9 text-[10px] font-black uppercase tracking-widest">
              {['custom', 'all'].map(o => <button key={o} onClick={()=>setDateFilter(o)} className={`px-4 ${dateFilter===o?'bg-indigo-600 text-white':'bg-card text-muted-foreground'}`}>{o==='all'?(isAr?'الكل':'All'):(isAr?'مخصص':'Custom')}</button>)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'من' : 'From'}</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} disabled={dateFilter==='all'} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'إلى' : 'To'}</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} disabled={dateFilter==='all'} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium" />
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'العملية' : 'Transaction'}</label>
            <select value={selectedTrn} onChange={e=>setSelectedTrn(e.target.value)} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium appearance-none">
              <option value="0">{isAr ? 'الكل' : 'All Types'}</option>
              {transactions.map(t => <option key={t.TRN_CODE} value={t.TRN_CODE}>{isAr ? t.TRN_ANAME : t.TRN_NAME}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'العميل' : 'Customer'}</label>
            <select value={selectedAccount} onChange={e=>setSelectedAccount(e.target.value)} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium appearance-none">
              <option value="0">{isAr ? 'الكل' : 'All Customers'}</option>
              {accounts.map(a => <option key={a.ACC_NO} value={a.ACC_NO}>{isAr ? a.ACC_ANAME : a.ACC_NAME}</option>)}
            </select>
          </div>
          <button onClick={fetchReport} disabled={isLoading} className="h-9 px-6 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Filter size={13} />} {isAr ? 'عرض' : 'Generate'}
          </button>
        </div>
        <div className="relative max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={isAr ? 'بحث عن فاتورة أو عميل...' : 'Search invoice or customer...'} className="h-9 pl-9 pr-3 w-full rounded-xl border border-border bg-card text-xs font-medium" />
        </div>
      </div>

      {hasLoaded && (
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {label: isAr?'إجمالي الخاضع':'Total Taxable', value: fmt(totTaxable), color: 'indigo'},
            {label: isAr?'إجمالي الضريبة':'Total VAT', value: fmt(totVat), color: 'violet'},
            {label: isAr?'إجمالي الصافي':'Total Net', value: fmt(totNet), color: 'emerald'},
          ].map(c => (
            <div key={c.label} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-2xl font-black text-${c.color}-500`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-6 pb-8 pt-4">
        {!hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4"><FileText size={28} className="text-violet-500" /></div>
            <p className="text-base font-black text-foreground mb-1">{isAr ? 'انقر على "عرض التقرير"' : 'Click "Generate" to load report'}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24"><p className="text-base font-black text-foreground">{isAr ? 'لا توجد بيانات' : 'No data found'}</p></div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
                    {[
                      { l: isAr ? 'التاريخ' : 'Date', a: 'text-left' },
                      { l: isAr ? 'الفاتورة' : 'Invoice', a: 'text-left' },
                      { l: isAr ? 'العميل' : 'Customer', a: 'text-left' },
                      { l: isAr ? 'الخاضع' : 'Taxable', a: 'text-right' },
                      { l: '%', a: 'text-center' },
                      { l: isAr ? 'الضريبة' : 'VAT', a: 'text-right' },
                      { l: isAr ? 'الصافي' : 'Net', a: 'text-right' },
                      { l: isAr ? 'الرقم الضريبي' : 'VAT No.', a: 'text-left' }
                    ].map((h, i) => (
                      <th key={i} className={`px-4 py-3 ${h.a} font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap`}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className={`border-b border-border/50 hover:bg-accent/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-zinc-50/30 dark:bg-zinc-800/20'}`}>
                      <td className="px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{fmtDate(row.CURDATE)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{row.INVOICE_NO}</td>
                      <td className="px-4 py-2.5 font-semibold text-foreground max-w-[200px] truncate">{row.ENAME}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{fmt(row.TAXABLE_AMOUNT)}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{row.VAT_PERCENT}%</td>
                      <td className="px-4 py-2.5 text-right font-bold text-violet-600">{fmt(row.VAT_AMOUNT)}</td>
                      <td className="px-4 py-2.5 text-right font-black text-indigo-600">{fmt(row.NET_AMOUNT)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono">{row.VAT_NUMBER}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const RefreshCw = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
