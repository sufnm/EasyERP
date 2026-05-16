import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FileText, Filter, Download, Search, X, ChevronDown, Printer, List, LayoutGrid } from 'lucide-react';
import API_BASE_URL from '../config';

export default function InvoiceReportPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const fmt = n => Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtDate = d => d ? String(d).split('T')[0] : '';

  const [fromDate, setFromDate] = useState(() => { const d=new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTrn, setSelectedTrn] = useState('0');
  const [selectedAcc, setSelectedAcc] = useState('0');
  const [selectedUser, setSelectedUser] = useState('0');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('summary');
  const [showDetail, setShowDetail] = useState(false);
  const [expandedInv, setExpandedInv] = useState({});
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState('custom'); // 'all' | 'custom'

  const [trnTypes, setTrnTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/trn-types`)
      .then(r=>r.json()).then(d=>setTrnTypes(Array.isArray(d)?d:[])).catch(console.error);
    fetch(`${API_BASE_URL}/api/reports/accounts-list`)
      .then(r=>r.json()).then(d=>setAccounts(Array.isArray(d)?d:[])).catch(console.error);
    fetch(`${API_BASE_URL}/api/reports/users-list`)
      .then(r=>r.json()).then(d=>setUsers(Array.isArray(d)?d:[])).catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    setIsLoading(true); setError(''); setExpandedInv({});
    try {
      const params = new URLSearchParams({ fromDate, toDate, trnCode: selectedTrn, accNo: selectedAcc, userId: selectedUser, dateFilter });
      const res = await fetch(`${API_BASE_URL}/api/reports/invoice?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error'); setReportData([]); }
      else { setReportData(Array.isArray(data)?data:[]); }
      setHasLoaded(true);
    } catch(err) { setError(err.message); setReportData([]); }
    finally { setIsLoading(false); }
  }, [fromDate, toDate, selectedTrn, selectedAcc, selectedUser, dateFilter]);

  const toggleExpand = (key) => setExpandedInv(p => ({ ...p, [key]: !p[key] }));
  const getInvDetails = (trnType, invNo) => filtered.filter(r => r.TRN_TYPE === trnType && r.INVOICE_NO === invNo);

  const filtered = reportData.filter(r => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return String(r.INVOICE_NO||'').toLowerCase().includes(t) ||
           String(r.ENAME||'').toLowerCase().includes(t) ||
           String(r.ACCODE||'').toLowerCase().includes(t) ||
           String(r.DESCRIPTION||'').toLowerCase().includes(t);
  });

  // Summary: group by TRN_TYPE + INVOICE_NO
  const summaryMap = {};
  filtered.forEach(r => {
    const key = `${r.TRN_TYPE}_${r.INVOICE_NO}`;
    if (!summaryMap[key]) summaryMap[key] = {
      TRN_TYPE: r.TRN_TYPE, TRN_NAME: r.TRN_NAME, TRN_ANAME: r.TRN_ANAME,
      INVOICE_NO: r.INVOICE_NO, CURDATE: r.CURDATE, ACCODE: r.ACCODE, ENAME: r.ENAME,
      Currency_Name: r.Currency_Name, WR_NAME: r.WR_NAME,
      G_TOTAL: r.G_TOTAL, DISC_AMT: r.DISC_AMT, NET_AMOUNT: r.NET_AMOUNT, VAT_AMOUNT: 0,
      CASH_PAID: Number(r.CASH_PAID||0), OTHER_PAID: Number(r.OTHER_PAID||0), ZATCA_SEND: Number(r.ZATCA_SEND||0)
    };
    summaryMap[key].VAT_AMOUNT += Number(r.VAT_AMOUNT||0);
  });
  const allSummary = Object.values(summaryMap);

  // Status filter
  const summary = allSummary.filter(r => {
    const bal = Number(r.NET_AMOUNT||0) - (Number(r.CASH_PAID||0) + Number(r.OTHER_PAID||0));
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'fully_paid') return Math.abs(bal) < 0.01;
    if (selectedStatus === 'not_paid') return bal > 0.01;
    if (selectedStatus === 'zatca') return Number(r.ZATCA_SEND) === 1;
    if (selectedStatus === 'cash') return Number(r.CASH_PAID) > 0;
    if (selectedStatus === 'bank') return Number(r.OTHER_PAID) > 0;
    return true;
  });

  const totNet = summary.reduce((s,r)=>s+Number(r.NET_AMOUNT||0),0);
  const totVat = summary.reduce((s,r)=>s+Number(r.VAT_AMOUNT||0),0);
  const totGross = summary.reduce((s,r)=>s+Number(r.G_TOTAL||0),0);
  const totCash = summary.reduce((s,r)=>s+Number(r.CASH_PAID||0),0);
  const totBank = summary.reduce((s,r)=>s+Number(r.OTHER_PAID||0),0);

  // Grouped data for Detail View
  const groupedData = {};
  filtered.forEach(item => {
    const trnKey = isAr ? item.TRN_ANAME : item.TRN_NAME;
    if (!groupedData[trnKey]) groupedData[trnKey] = {};
    if (!groupedData[trnKey][item.INVOICE_NO]) groupedData[trnKey][item.INVOICE_NO] = {
      header: {
        INVOICE_NO: item.INVOICE_NO,
        ACCODE: item.ACCODE,
        ENAME: item.ENAME,
        CURDATE: item.CURDATE,
        VAT_NUMBER: item.VAT_NUMBER,
        WR_NAME: item.WR_NAME,
        UserName: item.UserName,
        REF_NO: item.REF_NO,
        DISC_AMT: item.DISC_AMT,
        NET_AMOUNT: item.NET_AMOUNT,
        G_TOTAL: item.G_TOTAL,
        INV_VAT_AMOUNT: item.INV_VAT_AMOUNT,
        CASH_PAID: item.CASH_PAID,
        OTHER_PAID: item.OTHER_PAID
      },
      items: [],
      vatSum: 0,
      vatPercent: item.VAT_PERCENT // Just pick first item's vat percent or we can handle per item
    };
    groupedData[trnKey][item.INVOICE_NO].items.push(item);
    groupedData[trnKey][item.INVOICE_NO].vatSum += Number(item.VAT_AMOUNT || 0);
  });

  const exportCSV = () => {
    const data = viewMode==='summary' ? summary : filtered;
    const hdrs = viewMode==='summary'
      ? ['Date','Invoice','Account','Customer','Type','Warehouse','Currency','Gross','Disc','Net','VAT','Cash','Bank']
      : ['Date','Invoice','Account','Customer','Type','Warehouse','Item Code','Description','Qty','Price','Amount','VAT'];
    const rows = viewMode==='summary'
      ? data.map(r=>[fmtDate(r.CURDATE),r.INVOICE_NO,r.ACCODE,r.ENAME,isAr?r.TRN_ANAME:r.TRN_NAME,r.WR_NAME,r.Currency_Name,r.G_TOTAL,r.DISC_AMT,r.NET_AMOUNT,r.VAT_AMOUNT,r.CASH_PAID,r.OTHER_PAID])
      : data.map(r=>[fmtDate(r.CURDATE),r.INVOICE_NO,r.ACCODE,r.ENAME,isAr?r.TRN_ANAME:r.TRN_NAME,r.WR_NAME,r.ITEM_CODE,r.DESCRIPTION,r.QTY,r.PRICE,r.ITM_TOTAL,r.VAT_AMOUNT]);
    const csv=[hdrs,...rows].map(r=>r.map(v=>`"${v??''}"`).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url;
    a.download=`invoice_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const data = viewMode==='summary' ? summary : filtered;
    const hdrs = viewMode==='summary'
      ? ['Date','Invoice','Customer','Type','Net','VAT','Gross','Cash','Bank']
      : ['Date','Invoice','Customer','Item','Qty','Price','Amount','VAT'];
    
    let rowsHtml = '';
    if (viewMode === 'summary') {
      summary.forEach((r, i) => {
        const bg = i % 2 ? '#f8f8f8' : '#fff';
        rowsHtml += `<tr style="background:${bg}">
          <td>${fmtDate(r.CURDATE)}</td>
          <td>${r.INVOICE_NO}</td>
          <td>${r.ENAME}</td>
          <td>${isAr ? r.TRN_ANAME : r.TRN_NAME}</td>
          <td style="text-align:right">${fmt(r.NET_AMOUNT)}</td>
          <td style="text-align:right">${fmt(r.VAT_AMOUNT)}</td>
          <td style="text-align:right">${fmt(r.G_TOTAL)}</td>
          <td style="text-align:right">${fmt(r.CASH_PAID)}</td>
          <td style="text-align:right">${fmt(r.OTHER_PAID)}</td>
        </tr>`;

        if (showDetail) {
          const details = getInvDetails(r.TRN_TYPE, r.INVOICE_NO);
          details.forEach(d => {
            rowsHtml += `<tr style="background:#f0f7ff;font-size:8px">
              <td colspan="2"></td>
              <td colspan="2" style="color:#555">↳ ${d.ITEM_CODE} - ${d.DESCRIPTION}</td>
              <td style="text-align:right">${fmt(d.QTY)} x ${fmt(d.PRICE)}</td>
              <td style="text-align:right">${fmt(d.VAT_AMOUNT)}</td>
              <td style="text-align:right">${fmt(d.ITM_TOTAL)}</td>
              <td colspan="2"></td>
            </tr>`;
          });
        }
      });
    } else {
      filtered.forEach((r, i) => {
        const bg = i % 2 ? '#f8f8f8' : '#fff';
        rowsHtml += `<tr style="background:${bg}">
          <td>${fmtDate(r.CURDATE)}</td>
          <td>${r.INVOICE_NO}</td>
          <td>${r.ENAME}</td>
          <td>${r.DESCRIPTION}</td>
          <td style="text-align:right">${fmt(r.QTY)}</td>
          <td style="text-align:right">${fmt(r.PRICE)}</td>
          <td style="text-align:right">${fmt(r.ITM_TOTAL)}</td>
          <td style="text-align:right">${fmt(r.VAT_AMOUNT)}</td>
        </tr>`;
      });
    }
    const hdrsHtml = viewMode === 'summary' 
      ? `<th>Date</th><th>Invoice</th><th>Customer</th><th>Type</th><th style="text-align:right">Net</th><th style="text-align:right">VAT</th><th style="text-align:right">Gross</th><th style="text-align:right">Cash</th><th style="text-align:right">Bank</th>`
      : `<th>Date</th><th>Invoice</th><th>Customer</th><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th><th style="text-align:right">VAT</th>`;

    const html=`<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}"><head><meta charset="UTF-8"><title>Invoice Report</title>
<style>body{font-family:Arial,sans-serif;font-size:10px;margin:15px}h2{margin:0 0 4px;font-size:15px}p{margin:0 0 8px;color:#666;font-size:9px}
table{width:100%;border-collapse:collapse}th{background:#1e40af;color:#fff;padding:5px 6px;text-align:left;font-size:9px;text-transform:uppercase}
td{padding:4px 6px;border-bottom:1px solid #e2e8f0}tfoot td{background:#1e3a8a;color:#fff;font-weight:700;padding:5px 6px}
.sum{display:flex;gap:12px;margin-bottom:10px}.card{border:1px solid #e2e8f0;border-radius:5px;padding:6px 12px}
.cl{font-size:8px;text-transform:uppercase;color:#888;font-weight:700}.cv{font-size:15px;font-weight:900;color:#1e40af}</style></head><body>
<h2>${isAr?'تقرير الفواتير':'Invoice Report'}</h2>
<p>${fromDate} — ${toDate}</p>
<div class="sum">
<div class="card"><div class="cl">${isAr?'الفواتير':'Invoices'}</div><div class="cv">${summary.length}</div></div>
<div class="card"><div class="cl">${isAr?'الصافي':'Net'}</div><div class="cv">${fmt(totNet)}</div></div>
<div class="card"><div class="cl">${isAr?'الضريبة':'VAT'}</div><div class="cv">${fmt(totVat)}</div></div>
<div class="card"><div class="cl">${isAr?'الإجمالي':'Gross'}</div><div class="cv">${fmt(totGross)}</div></div>
<div class="card"><div class="cl">${isAr?'نقدي':'Cash'}</div><div class="cv">${fmt(totCash)}</div></div>
<div class="card"><div class="cl">${isAr?'بنك':'Bank'}</div><div class="cv">${fmt(totBank)}</div></div>
</div>
<table><thead><tr>${hdrsHtml}</tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td colspan="${viewMode==='summary' ? 4 : 4}">${isAr?'المجموع':'Total'} (${data.length})</td>
<td style="text-align:right">${fmt(totNet)}</td><td style="text-align:right">${fmt(totVat)}</td><td style="text-align:right">${fmt(totGross)}</td>
${viewMode==='summary' ? `<td style="text-align:right">${fmt(totCash)}</td><td style="text-align:right">${fmt(totBank)}</td>` : ''}
</tr></tfoot>
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">{isAr?'تقرير الفواتير':'Invoice Report'}</h1>
              <p className="text-xs text-muted-foreground font-medium">{isAr?'تقرير مفصل وملخص للفواتير':'Detailed and summary invoice report'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button onClick={()=>setViewMode('summary')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode==='summary'?'bg-indigo-600 text-white':'bg-card text-muted-foreground hover:bg-accent'}`}><LayoutGrid size={12}/>{isAr?'ملخص':'Summary'}</button>
              <button onClick={()=>setViewMode('detail')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-widest transition-all ${viewMode==='detail'?'bg-indigo-600 text-white':'bg-card text-muted-foreground hover:bg-accent'}`}><List size={12}/>{isAr?'تفصيل':'Detail'}</button>
            </div>
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
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'نوع العملية':'Transaction'}</label>
            <div className="relative">
              <select value={selectedTrn} onChange={e=>setSelectedTrn(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[160px]">
                <option value="0">{isAr?'كل العمليات':'All Transactions'}</option>
                {trnTypes.map(t=><option key={t.TRN_CODE} value={t.TRN_CODE}>{isAr?t.TRN_ANAME:t.TRN_NAME}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'الحساب':'Account'}</label>
            <div className="relative">
              <select value={selectedAcc} onChange={e=>setSelectedAcc(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[160px]">
                <option value="0">{isAr?'كل الحسابات':'All Accounts'}</option>
                {accounts.map(a=><option key={a.ACC_NO} value={a.ACC_NO}>{isAr?a.ACC_ANAME:a.ACC_NAME}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'المستخدم':'User'}</label>
            <div className="relative">
              <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[130px]">
                <option value="0">{isAr?'الكل':'All Users'}</option>
                {users.map(u=><option key={u.UserId} value={u.UserId}>{u.UserName}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'الحالة':'Status'}</label>
            <div className="relative">
              <select value={selectedStatus} onChange={e=>setSelectedStatus(e.target.value)} className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[130px]">
                <option value="all">{isAr?'الكل':'All'}</option>
                <option value="fully_paid">{isAr?'مدفوع بالكامل':'Fully Paid'}</option>
                <option value="not_paid">{isAr?'غير مدفوع':'Not Fully Paid'}</option>
                <option value="zatca">{isAr?'مرسل ZATCA':'Zatca Submitted'}</option>
                <option value="cash">{isAr?'دفع نقدي':'Cash Paid'}</option>
                <option value="bank">{isAr?'دفع بنكي':'Bank Paid'}</option>
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr?'التفاصيل':'Detail'}</label>
            <label className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-card cursor-pointer">
              <input type="checkbox" checked={showDetail} onChange={e=>setShowDetail(e.target.checked)} className="w-4 h-4 rounded accent-indigo-600"/>
              <span className="text-xs font-bold">{isAr?'عرض':'Show'}</span>
            </label>
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
        <div className="px-6 py-4 grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            {label:isAr?'الفواتير':'Invoices',value:summary.length.toLocaleString(),color:'indigo'},
            {label:isAr?'الإجمالي':'Gross',value:fmt(totGross),color:'amber'},
            {label:isAr?'الضريبة':'VAT',value:fmt(totVat),color:'violet'},
            {label:isAr?'الصافي':'Net',value:fmt(totNet),color:'emerald'},
            {label:isAr?'نقدي':'Cash',value:fmt(totCash),color:'sky'},
            {label:isAr?'بنك':'Bank',value:fmt(totBank),color:'orange'},
          ].map(c=>(
            <div key={c.label} className="bg-card rounded-2xl border border-border p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{c.label}</p>
              <p className={`text-lg font-black text-${c.color}-500`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="px-6 pb-8">
        {!hasLoaded?(
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4"><FileText size={28} className="text-blue-500"/></div>
            <p className="text-base font-black text-foreground mb-1">{isAr?'انقر على "عرض التقرير"':'Click "Generate" to load report'}</p>
            <p className="text-xs text-muted-foreground">{isAr?'حدد الفترة ونوع العملية':'Select date range and transaction type'}</p>
          </div>
        ):isLoading?(
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
        ):filtered.length===0?(
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-base font-black text-foreground mb-1">{isAr?'لا توجد بيانات':'No data found'}</p>
            <p className="text-xs text-muted-foreground">{isAr?'حاول تغيير الفلاتر':'Try adjusting your filters'}</p>
          </div>
        ):viewMode==='summary'?(
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
                    {[
                      { l: isAr ? 'التاريخ' : 'Date', a: 'text-left' },
                      { l: isAr ? 'رقم الفاتورة' : 'Invoice', a: 'text-left' },
                      { l: isAr ? 'العميل' : 'Customer', a: 'text-left' },
                      { l: isAr ? 'النوع' : 'Type', a: 'text-left' },
                      { l: isAr ? 'الإجمالي' : 'Gross', a: 'text-right' },
                      { l: isAr ? 'الخصم' : 'Disc', a: 'text-right' },
                      { l: isAr ? 'الصافي' : 'Net', a: 'text-right' },
                      { l: isAr ? 'الضريبة' : 'VAT', a: 'text-right' },
                      { l: isAr ? 'نقدي' : 'Cash', a: 'text-right' },
                      { l: isAr ? 'بنك' : 'Bank', a: 'text-right' }
                    ].map((h, i) => (
                      <th key={i} className={`px-3 py-3 ${h.a} font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap text-[10px]`}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r,i)=>{ 
                    const key=`${r.TRN_TYPE}_${r.INVOICE_NO}`; 
                    const isExpanded = showDetail || expandedInv[key]; 
                    const details = getInvDetails(r.TRN_TYPE, r.INVOICE_NO); 
                    return (<React.Fragment key={key+'_'+i}>
                    {isExpanded && (
                      <tr className="bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
                        <td colSpan={10} className="px-3 py-1.5">
                          <table className="w-full text-[11px]">
                            <thead><tr className="text-muted-foreground">
                              <th className="px-2 py-1 text-left text-[9px] font-bold uppercase">{isAr?'الرمز':'Code'}</th>
                              <th className="px-2 py-1 text-left text-[9px] font-bold uppercase">{isAr?'الوصف':'Description'}</th>
                              <th className="px-2 py-1 text-left text-[9px] font-bold uppercase">{isAr?'الوحدة':'Unit'}</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase">{isAr?'الكمية':'Qty'}</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase">{isAr?'السعر':'Price'}</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase">{isAr?'المبلغ':'Amount'}</th>
                              <th className="px-2 py-1 text-right text-[9px] font-bold uppercase">{isAr?'الضريبة':'VAT'}</th>
                            </tr></thead>
                            <tbody>{details.map((d,j)=>(
                              <tr key={j} className={j%2?'bg-white/40 dark:bg-zinc-800/20':''}>
                                <td className="px-2 py-1 font-mono text-violet-500">{d.ITEM_CODE}</td>
                                <td className="px-2 py-1">{d.DESCRIPTION}</td>
                                <td className="px-2 py-1 text-muted-foreground">{isAr?d.Unit_AName:d.Unit_Name}</td>
                                <td className="px-2 py-1 text-right font-semibold">{fmt(d.QTY)}</td>
                                <td className="px-2 py-1 text-right text-muted-foreground">{fmt(d.PRICE)}</td>
                                <td className="px-2 py-1 text-right text-emerald-600">{fmt(d.ITM_TOTAL)}</td>
                                <td className="px-2 py-1 text-right text-violet-500">{fmt(d.VAT_AMOUNT)}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    <tr className={`border-b border-border/50 hover:bg-accent/40 transition-colors ${i%2===0?'':'bg-zinc-50/30 dark:bg-zinc-800/20'}`}>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(r.CURDATE)}</td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-500 flex items-center gap-2">
                        <button onClick={()=>toggleExpand(key)} className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-all">
                          {isExpanded ? '-' : '+'}
                        </button>
                        {r.INVOICE_NO}
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground max-w-[160px] truncate">{r.ENAME}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">{isAr?r.TRN_ANAME:r.TRN_NAME}</span></td>
                      <td className="px-3 py-2 text-right text-amber-600 font-semibold">{fmt(r.G_TOTAL)}</td>
                      <td className="px-3 py-2 text-right text-rose-500">{fmt(r.DISC_AMT)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmt(r.NET_AMOUNT)}</td>
                      <td className="px-3 py-2 text-right text-violet-600">{fmt(r.VAT_AMOUNT)}</td>
                      <td className="px-3 py-2 text-right text-sky-600">{fmt(r.CASH_PAID)}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{fmt(r.OTHER_PAID)}</td>
                    </tr>
                  </React.Fragment>);})}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 border-t-2 border-border font-black">
                    <td colSpan={4} className="px-3 py-3 text-xs uppercase tracking-widest text-muted-foreground">{isAr?`المجموع (${summary.length} فاتورة)`:`Total (${summary.length} invoices)`}</td>
                    <td className="px-3 py-3 text-right text-amber-600">{fmt(totGross)}</td>
                    <td className="px-3 py-3 text-right text-rose-500">{fmt(summary.reduce((s,r)=>s+Number(r.DISC_AMT||0),0))}</td>
                    <td className="px-3 py-3 text-right text-emerald-600">{fmt(totNet)}</td>
                    <td className="px-3 py-3 text-right text-violet-600">{fmt(totVat)}</td>
                    <td className="px-3 py-3 text-right text-sky-600">{fmt(totCash)}</td>
                    <td className="px-3 py-3 text-right text-orange-600">{fmt(totBank)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ):(
          <div className="space-y-6">
            {Object.keys(groupedData).map(trnName => (
              <div key={trnName} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-zinc-100 dark:bg-zinc-800/50 px-4 py-2 border-b border-border">
                  <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600">{trnName}</h3>
                </div>
                <div className="p-0">
                  {Object.values(groupedData[trnName]).map((inv, idx) => (
                    <div key={inv.header.INVOICE_NO} className={idx > 0 ? 'border-t border-border/50' : ''}>
                      {/* Invoice Header (Compact One-Line) */}
                      <div className="bg-zinc-50/80 dark:bg-zinc-900/40 px-4 py-1.5 border-b border-border/30 flex items-center justify-between gap-4 text-[10px] font-bold overflow-x-auto whitespace-nowrap no-scrollbar">
                        <div className="flex items-center gap-4 divide-x divide-border dark:divide-zinc-800 rtl:divide-x-reverse">
                          <div className="flex items-center gap-1.5 pr-4 first:pr-0">
                            <span className="text-indigo-600 font-black">#{inv.header.INVOICE_NO}</span>
                            <span className="text-muted-foreground font-mono">{fmtDate(inv.header.CURDATE)}</span>
                          </div>
                          <div className="flex items-center gap-2 px-4">
                            <span className="text-muted-foreground">{isAr ? 'العميل:' : 'Cust:'}</span>
                            <span className="text-foreground">{inv.header.ENAME}</span>
                            <span className="text-muted-foreground font-mono">({inv.header.ACCODE})</span>
                          </div>
                          {inv.header.VAT_NUMBER && (
                            <div className="flex items-center gap-2 px-4">
                              <span className="text-muted-foreground">{isAr ? 'الضريبة:' : 'VAT#:'}</span>
                              <span className="text-foreground">{inv.header.VAT_NUMBER}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 px-4">
                            <span className="text-muted-foreground">{isAr ? 'المستودع:' : 'WH:'}</span>
                            <span className="text-emerald-600">{inv.header.WR_NAME}</span>
                          </div>
                          {inv.header.REF_NO && (
                            <div className="flex items-center gap-2 px-4">
                              <span className="text-muted-foreground">{isAr ? 'المرجع:' : 'Ref:'}</span>
                              <span className="text-amber-600">{inv.header.REF_NO}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{isAr ? 'المستخدم:' : 'User:'} {inv.header.UserName}</span>
                        </div>
                      </div>
                      
                      {/* Items Table */}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] text-muted-foreground uppercase border-b border-border/30 bg-zinc-50/30 dark:bg-zinc-900/10">
                            <th className="px-4 py-1 text-left font-black">{isAr ? 'رمز الصنف' : 'ItemCode'}</th>
                            <th className="px-4 py-1 text-left font-black">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                            <th className="px-4 py-1 text-left font-black">{isAr ? 'الوحدة' : 'Unit'}</th>
                            <th className="px-4 py-1 text-right font-black">{isAr ? 'الكمية' : 'Qty.'}</th>
                            <th className="px-4 py-1 text-right font-black">{isAr ? 'السعر' : 'Price'}</th>
                            <th className="px-4 py-1 text-right font-black">{isAr ? 'الإجمالي' : 'Total Amt.'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.items.map((item, iIdx) => (
                            <tr key={iIdx} className="border-b border-border/20 last:border-0">
                              <td className="px-4 py-1.5 font-mono text-violet-500">{item.ITEM_CODE}</td>
                              <td className="px-4 py-1.5 text-foreground">{item.DESCRIPTION}</td>
                              <td className="px-4 py-1.5 text-muted-foreground">{isAr ? item.Unit_AName : item.Unit_Name}</td>
                              <td className="px-4 py-1.5 text-right font-semibold">{fmt(item.QTY)}</td>
                              <td className="px-4 py-1.5 text-right text-muted-foreground">{fmt(item.PRICE)}</td>
                              <td className="px-4 py-1.5 text-right font-bold text-emerald-600">{fmt(item.ITM_TOTAL)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-100/50 dark:bg-zinc-900/50 font-bold text-[10px] border-t border-border/50">
                            <td colSpan={6} className="px-4 py-2">
                              <div className="flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-6 divide-x divide-border dark:divide-zinc-800 rtl:divide-x-reverse">
                                  <div className="flex items-center gap-2 pr-4 first:pr-0">
                                    <span className="text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded text-[9px]">{inv.items.length} {isAr ? 'أصناف' : 'Items'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-4">
                                    <span className="text-muted-foreground">{isAr ? 'الإجمالي:' : 'Gross:'}</span>
                                    <span className="text-amber-600">{fmt(inv.header.G_TOTAL)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-4">
                                    <span className="text-muted-foreground">{isAr ? 'الخصم:' : 'Disc:'}</span>
                                    <span className="text-rose-500">{fmt(inv.header.DISC_AMT)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-4">
                                    <span className="text-muted-foreground">VAT ({inv.vatPercent}%):</span>
                                    <span className="text-violet-500">{fmt(inv.header.INV_VAT_AMOUNT)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-4">
                                    <span className="text-muted-foreground">{isAr ? 'نقدي:' : 'Cash:'}</span>
                                    <span className="text-sky-600">{fmt(inv.header.CASH_PAID)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 px-4">
                                    <span className="text-muted-foreground">{isAr ? 'بنك:' : 'Bank:'}</span>
                                    <span className="text-orange-600">{fmt(inv.header.OTHER_PAID)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pl-4">
                                  <span className="text-muted-foreground uppercase tracking-widest text-[9px]">{isAr ? 'الصافي:' : 'NET:'}</span>
                                  <span className="text-lg font-black text-indigo-600">{fmt(inv.header.NET_AMOUNT)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Overall Grand Total for Detail View */}
            <div className="bg-zinc-100 dark:bg-zinc-800 border border-border rounded-2xl p-6 flex justify-between items-center shadow-lg">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isAr ? 'إجمالي السطور' : 'TOTAL LINES'}</p>
                  <p className="text-2xl font-black text-foreground">{filtered.length}</p>
               </div>
               <div className="flex gap-12">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">VAT</p>
                    <p className="text-2xl font-black text-violet-500">{fmt(filtered.reduce((s,r)=>s+Number(r.VAT_AMOUNT||0),0))}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{isAr ? 'الصافي النهائي' : 'GRAND NET'}</p>
                    <p className="text-3xl font-black text-emerald-500">{fmt(summary.reduce((s,r)=>s+Number(r.NET_AMOUNT||0),0))}</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
