import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FileText, Filter, Download, Search, X, ChevronDown, Printer } from 'lucide-react';
import API_BASE_URL from '../config';

export default function CustomerReportPage({ activePage }) {
  const { language, t } = useLanguage();
  const isAr = language === 'ar';
  const isSupplier = activePage === 'supplier-report';
  const title = isSupplier ? (isAr ? 'تقرير الموردين' : 'Supplier Report') : (isAr ? 'تقرير العملاء' : 'Customer Report');
  const fmt = n => Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtDate = d => d ? String(d).split('T')[0] : '';

  const [fromDate, setFromDate] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedAcc, setSelectedAcc] = useState('0');
  const [accType, setAccType] = useState(isSupplier ? '2' : '1');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('custom');

  const [accounts, setAccounts] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/accounts-list?accType=${accType}`)
      .then(r=>r.json()).then(d=>setAccounts(Array.isArray(d)?d:[])).catch(console.error);
  }, [accType]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true); setError('');
    try {
      const params = new URLSearchParams({ fromDate, toDate, accNo: selectedAcc, dateFilter, accType });
      const res = await fetch(`${API_BASE_URL}/api/reports/customer-report?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); setReportData([]); }
      else { setReportData(Array.isArray(data)?data:[]); }
      setHasLoaded(true);
    } catch(err) { setError(err.message); setReportData([]); }
    finally { setIsLoading(false); }
  }, [fromDate, toDate, selectedAcc, dateFilter, accType]);

  const filtered = reportData.filter(r => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return String(r.INVOICE_NO||'').toLowerCase().includes(t) ||
           String(r.ACC_NAME||'').toLowerCase().includes(t) ||
           String(r.NARRATION||'').toLowerCase().includes(t) ||
           String(r.TRN_NAME||'').toLowerCase().includes(t);
  });

  const totDr = filtered.reduce((s,r)=>s+Number(r.DR_AMOUNT||0),0);
  const totCr = filtered.reduce((s,r)=>s+Number(r.CR_AMOUNT||0),0);
  const totBal = totDr - totCr;

  let runningBal = 0;
  const dataWithRunningTotal = filtered.map(r => {
    runningBal += (Number(r.DR_AMOUNT || 0) - Number(r.CR_AMOUNT || 0));
    return { ...r, runningTotal: runningBal };
  });

  const exportCSV = () => {
    const hdrs = ['Date','Invoice','Account','Type','Narration','Debit','Credit','Running Total'];
    const rows = dataWithRunningTotal.map(r=>[fmtDate(r.PAY_DATE),r.INVOICE_NO,r.ACC_NAME,isAr?r.TRN_ANAME:r.TRN_NAME,r.NARRATION,r.DR_AMOUNT,r.CR_AMOUNT,r.runningTotal]);
    const csv=[hdrs,...rows].map(r=>r.map(v=>`"${v??''}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;
    a.download=`customer_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    let rowsHtml = '';
    dataWithRunningTotal.forEach((r, i) => {
      const bg = i % 2 ? '#f8f8f8' : '#fff';
      rowsHtml += `<tr style="background:${bg}">
        <td>${fmtDate(r.PAY_DATE)}</td>
        <td>${r.INVOICE_NO || ''}</td>
        <td>${r.ACC_NAME}</td>
        <td>${isAr ? r.TRN_ANAME : r.TRN_NAME}</td>
        <td>${r.NARRATION || ''}</td>
        <td style="text-align:right">${fmt(r.DR_AMOUNT)}</td>
        <td style="text-align:right">${fmt(r.CR_AMOUNT)}</td>
        <td style="text-align:right;font-weight:bold;color:${r.runningTotal>=0?'#059669':'#e11d48'}">${fmt(r.runningTotal)}</td>
      </tr>`;
    });

    const html=`<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}"><head><meta charset="UTF-8"><title>Customer Report</title>
<style>body{font-family:Arial,sans-serif;font-size:10px;margin:15px}h2{margin:0 0 4px;font-size:15px}p{margin:0 0 8px;color:#666;font-size:9px}
table{width:100%;border-collapse:collapse}th{background:#1e40af;color:#fff;padding:5px 6px;text-align:left;font-size:9px;text-transform:uppercase}
td{padding:4px 6px;border-bottom:1px solid #e2e8f0}tfoot td{background:#1e3a8a;color:#fff;font-weight:700;padding:5px 6px}
.sum{display:flex;gap:12px;margin-bottom:10px}.card{border:1px solid #e2e8f0;border-radius:5px;padding:6px 12px}
.cl{font-size:8px;text-transform:uppercase;color:#888;font-weight:700}.cv{font-size:15px;font-weight:900;color:#1e40af}</style></head><body>
<h2>${title}</h2>
<p>${fromDate} — ${toDate}</p>
<div class="sum">
<div class="card"><div class="cl">${isAr?'المدين':'Debit'}</div><div class="cv">${fmt(totDr)}</div></div>
<div class="card"><div class="cl">${isAr?'الدائن':'Credit'}</div><div class="cv">${fmt(totCr)}</div></div>
<div class="card"><div class="cl">${isAr?'الرصيد':'Balance'}</div><div class="cv">${fmt(totBal)}</div></div>
</div>
<thead><tr><th>Date</th><th>Invoice</th><th>Account</th><th>Type</th><th>Narration</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Running Total</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td colspan="5">${isAr?'المجموع':'Total'} (${filtered.length})</td><td style="text-align:right">${fmt(totDr)}</td><td style="text-align:right">${fmt(totCr)}</td><td style="text-align:right">${fmt(totBal)}</td></tr></tfoot>
</table></body></html>`;
    const win=window.open('','_blank');
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(()=>{win.print();},400);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${isAr?'rtl':''}`}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground font-medium">{isAr?'تقرير مفصل لحركات العملاء والموردين':'Detailed customer and supplier transaction report'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!hasLoaded||filtered.length===0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"><Download size={13}/>CSV</button>
            <button onClick={exportPDF} disabled={!hasLoaded||filtered.length===0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20"><Printer size={13}/>PDF</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border bg-card/30">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'نوع التاريخ':'Date Type'}</label>
            <div className="relative">
              <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[100px]">
                <option value="custom">{isAr?'محدد':'Custom'}</option>
                <option value="all">{isAr?'الكل':'All'}</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'من تاريخ':'From Date'}</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} disabled={dateFilter==='all'} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'إلى تاريخ':'To Date'}</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} disabled={dateFilter==='all'} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'معايير الاختيار':'Selection Criteria'}</label>
            <div className="relative">
              <select value={accType} onChange={e=>setAccType(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[130px]">
                <option value="0">{isAr?'الكل':'All'}</option>
                <option value="1">{isAr?'العملاء':'Customers'}</option>
                <option value="2">{isAr?'الموردين':'Suppliers'}</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'الحساب':'Account'}</label>
            <div className="relative">
              <select value={selectedAcc} onChange={e=>setSelectedAcc(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[200px]">
                <option value="0">{isAr?'كل الحسابات':'All Accounts'}</option>
                {accounts.map(a=><option key={a.ACC_NO} value={a.ACC_NO}>{isAr?a.ACC_ANAME:a.ACC_NAME}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'بحث':'Search'}</label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
              <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder={isAr?'بحث...':'Search...'} className="h-9 pl-9 pr-3 w-full rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"/>
              {searchTerm&&<button onClick={()=>setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12}/></button>}
            </div>
          </div>
          <button onClick={fetchReport} disabled={isLoading} className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            {isLoading?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Filter size={13}/>}
            {isAr?'عرض':'Go'}
          </button>
        </div>
        {error&&<p className="mt-2 text-xs text-rose-500 font-bold">{error}</p>}
      </div>

      {/* Summary Cards */}
      {hasLoaded&&(
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {label:isAr?'الحركات':'Transactions',value:filtered.length.toLocaleString(),color:'indigo'},
            {label:isAr?'المدين':'Debit',value:fmt(totDr),color:'emerald'},
            {label:isAr?'الدائن':'Credit',value:fmt(totCr),color:'rose'},
            {label:isAr?'الرصيد':'Balance',value:fmt(totBal),color:'amber'},
          ].map(c=>(
            <div key={c.label} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-xl font-black text-${c.color}-500`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="px-6 pb-8">
        {!hasLoaded?(
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4"><FileText size={28} className="text-indigo-500"/></div>
            <p className="text-base font-black text-foreground mb-1">{isAr?'انقر على "عرض التقرير"':'Click "Go" to load report'}</p>
            <p className="text-xs text-muted-foreground">{isAr?'حدد الفترة والحساب':'Select date range and account'}</p>
          </div>
        ):isLoading?(
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ):filtered.length===0?(
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-base font-black text-foreground mb-1">{isAr?'لا توجد بيانات':'No data found'}</p>
            <p className="text-xs text-muted-foreground">{isAr?'حاول تغيير الفلاتر':'Try adjusting your filters'}</p>
          </div>
        ):(
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
                    {[
                      { l: isAr ? 'التاريخ' : 'Date', a: 'text-left' },
                      { l: isAr ? 'المرجع/الفاتورة' : 'Invoice/Ref', a: 'text-left' },
                      { l: isAr ? 'الحساب' : 'Account', a: 'text-left' },
                      { l: isAr ? 'النوع' : 'Type', a: 'text-left' },
                      { l: isAr ? 'البيان' : 'Narration', a: 'text-left' },
                      { l: isAr ? 'مدين' : 'Debit', a: 'text-right' },
                      { l: isAr ? 'دائن' : 'Credit', a: 'text-right' },
                      { l: isAr ? 'الرصيد التراكمي' : 'Running Total', a: 'text-right' }
                    ].map((h, i) => (
                      <th key={i} className={`px-4 py-3 ${h.a} font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap text-[10px]`}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r,i)=>(
                    <tr key={i} className={`border-b border-border/50 hover:bg-accent/40 transition-colors ${i%2===0?'':'bg-zinc-50/30 dark:bg-zinc-800/20'}`}>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(r.PAY_DATE)}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{r.INVOICE_NO}</td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">{r.ACC_NAME}</td>
                      <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">{isAr?r.TRN_ANAME:r.TRN_NAME}</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground italic">{r.NARRATION}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">{fmt(r.DR_AMOUNT)}</td>
                      <td className="px-4 py-2.5 text-right text-rose-600 font-bold">{fmt(r.CR_AMOUNT)}</td>
                      <td className={`px-4 py-2.5 text-right font-black ${r.runningTotal>=0?'text-emerald-600':'text-rose-600'}`}>{fmt(r.runningTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 border-t-2 border-border font-black">
                    <td colSpan={5} className="px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">{isAr?`المجموع (${filtered.length} حركة)`:`Total (${filtered.length} transactions)`}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 text-sm">{fmt(totDr)}</td>
                    <td className="px-4 py-3 text-right text-rose-600 text-sm">{fmt(totCr)}</td>
                    <td className="px-4 py-3 text-right text-foreground text-sm border-l border-border/50">{fmt(totBal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
