import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { RefreshCw, Filter, Download, Search, X, ChevronDown, Printer } from 'lucide-react';
import API_BASE_URL from '../config';

export default function StockMovementReportPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = d => d ? String(d).split('T')[0] : '';

  // Filter state
  const [dateFilter, setDateFilter] = useState('custom'); // 'all' | 'custom'
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('0');
  const [selectedWarehouse, setSelectedWarehouse] = useState('0');
  const [reportSearch, setReportSearch] = useState('');

  // Data state
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Fetch lookup data
    Promise.all([
      fetch(`${API_BASE_URL}/api/reports/items-list`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/reports/accounts-list`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/reports/warehouses-list`).then(r => r.json())
    ]).then(([itemsData, accountsData, warehousesData]) => {
      setItems(Array.isArray(itemsData) ? itemsData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setWarehouses(Array.isArray(warehousesData) ? warehousesData : []);
    }).catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ 
        dateFilter,
        fromDate, 
        toDate, 
        itemCode: selectedItem,
        accNo: selectedAccount,
        wrCode: selectedWarehouse
      });
      const res = await fetch(`${API_BASE_URL}/api/reports/stock-movement?${params}`);
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch (err) {
      console.error(err);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem, fromDate, toDate, dateFilter, selectedAccount, selectedWarehouse]);

  // Running Sum Calculation
  let runningSum = 0;
  const processedData = reportData.map(row => {
    runningSum += Number(row.Qty || 0);
    return { ...row, RunningBalance: runningSum };
  });

  // Client-side search filter
  const filteredData = processedData.filter(row => {
    const term = reportSearch.toLowerCase();
    return !term || 
      String(row.INVOICE_NO || '').toLowerCase().includes(term) ||
      String(row.Account || '').toLowerCase().includes(term) ||
      String(row.TRN_NAME || '').toLowerCase().includes(term) ||
      String(row.TRN_ANAME || '').toLowerCase().includes(term);
  });

  const exportPDF = () => {
    const itemLabel = items.find(i => i.ITEM_CODE === selectedItem);
    const itemText = itemLabel ? `${itemLabel.ITEM_CODE} - ${isAr ? itemLabel.Item_AName : itemLabel.Item_Name}` : selectedItem;

    const rows = filteredData.map((r, i) => `
      <tr style="background:${i%2===0?'#fff':'#f8f8f8'}">
        <td>${fmtDate(r.CURDATE)}</td>
        <td>${isAr ? r.TRN_ANAME : r.TRN_NAME}</td>
        <td>${r.INVOICE_NO}</td>
        <td>${r.Account || ''}</td>
        <td style="text-align:right;color:${Number(r.Qty)<0?'#e53e3e':'#276749'}">${fmt(r.Qty)}</td>
        <td style="text-align:right;font-weight:bold">${fmt(r.RunningBalance)}</td>
        <td style="text-align:right">${fmt(r.PRICE)}</td>
        <td style="text-align:right">${fmt(r.ITM_TOTAL)}</td>
        <td>${r.WR_NAME}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}">
<head><meta charset="UTF-8"><title>Stock Movement</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#111}
  h2{margin:0 0 4px;font-size:16px} p{margin:0 0 12px;color:#666;font-size:10px}
  table{width:100%;border-collapse:collapse}th{background:#475569;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
</style></head><body>
<h2>${isAr ? 'حركة المخزون' : 'Stock Movement Report'}</h2>
<p>${itemText} &nbsp;|&nbsp; ${dateFilter === 'all' ? 'All Dates' : fromDate + ' to ' + toDate}</p>
<table>
<thead><tr>
  <th>${isAr?'التاريخ':'Date'}</th><th>${isAr?'العملية':'Transaction'}</th><th>${isAr?'الرقم':'No.'}</th>
  <th>${isAr?'الحساب':'Account'}</th><th style="text-align:right">${isAr?'الكمية':'Qty'}</th>
  <th style="text-align:right">${isAr?'الرصيد':'Balance'}</th><th style="text-align:right">${isAr?'السعر':'Price'}</th>
  <th style="text-align:right">${isAr?'الإجمالي':'Total'}</th><th>${isAr?'المستودع':'WH'}</th>
</tr></thead>
<tbody>${rows}</tbody>
</table></body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Transaction', 'Invoice No', 'Account', 'Qty', 'Balance', 'Price', 'Total', 'Warehouse'];
    const rows = filteredData.map(r => [
      fmtDate(r.CURDATE),
      isAr ? r.TRN_ANAME : r.TRN_NAME,
      r.INVOICE_NO,
      r.Account,
      r.Qty,
      r.RunningBalance,
      r.PRICE,
      r.ITM_TOTAL,
      r.WR_NAME
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `stock_movement_${selectedItem}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${isAr ? 'rtl' : ''}`}>
      <div className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <RefreshCw size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">{isAr ? 'حركة المخزون' : 'Stock Movement'}</h1>
              <p className="text-xs text-muted-foreground font-medium">{isAr ? 'تتبع حركة صنف معين بالتفصيل' : 'Detailed tracking for a specific item'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!hasLoaded || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20">
              <Download size={13} /> CSV
            </button>
            <button onClick={exportPDF} disabled={!hasLoaded || filteredData.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20">
              <Printer size={13} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-border bg-card/30 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Range Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'الفترة' : 'Period'}</label>
            <div className="flex rounded-xl overflow-hidden border border-border h-9">
              {['custom', 'all'].map(opt => (
                <button key={opt} onClick={() => setDateFilter(opt)} className={`px-4 text-[10px] font-black uppercase transition-all ${dateFilter === opt ? 'bg-indigo-600 text-white' : 'bg-card text-muted-foreground hover:bg-accent'}`}>
                  {opt === 'all' ? (isAr ? 'الكل' : 'All') : (isAr ? 'مخصص' : 'Custom')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'من تاريخ' : 'From'}</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={dateFilter === 'all'} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium disabled:opacity-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'إلى تاريخ' : 'To'}</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} disabled={dateFilter === 'all'} className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium disabled:opacity-40" />
          </div>

          {/* Item Selector */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'الصنف' : 'Item'}</label>
            <div className="relative">
              <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="h-9 pl-3 pr-8 w-full rounded-xl border border-border bg-card text-xs font-medium appearance-none">
                <option value="">{isAr ? 'اختر صنفاً...' : 'Select item...'}</option>
                {items.map(i => <option key={i.ITEM_CODE} value={i.ITEM_CODE}>{i.ITEM_CODE} - {isAr ? i.Item_AName : i.Item_Name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Account Selector */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'الحساب' : 'Account'}</label>
            <div className="relative">
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="h-9 pl-3 pr-8 w-full rounded-xl border border-border bg-card text-xs font-medium appearance-none">
                <option value="0">{isAr ? 'الكل' : 'All Accounts'}</option>
                {accounts.map(a => <option key={a.ACC_NO} value={a.ACC_NO}>{isAr ? a.ACC_ANAME : a.ACC_NAME}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Warehouse Selector */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'المستودع' : 'Warehouse'}</label>
            <div className="relative">
              <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="h-9 pl-3 pr-8 w-full rounded-xl border border-border bg-card text-xs font-medium appearance-none">
                <option value="0">{isAr ? 'الكل' : 'All Warehouses'}</option>
                {warehouses.map(w => <option key={w.WR_CODE} value={w.WR_CODE}>{isAr ? w.WR_ANAME : w.WR_NAME}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <button onClick={fetchReport} disabled={isLoading || !selectedItem} className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Filter size={13} />}
            {isAr ? 'عرض' : 'Generate'}
          </button>
        </div>

        {/* Client Side Search */}
        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{isAr ? 'بحث في النتائج' : 'Search in results'}</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={reportSearch} onChange={e => setReportSearch(e.target.value)} placeholder={isAr ? 'بحث عن رقم فاتورة أو حساب...' : 'Search invoice or account...'} className="h-9 pl-9 pr-3 w-full rounded-xl border border-border bg-card text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 pt-4">
        {!hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4"><RefreshCw size={28} className="text-blue-500" /></div>
            <p className="text-base font-black text-foreground mb-1">{isAr ? 'حدد صنفاً لعرض حركته' : 'Select an item to view movement'}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-base font-black text-foreground mb-1">{isAr ? 'لا توجد بيانات' : 'No data found'}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground">{isAr?'التاريخ':'Date'}</th>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground">{isAr?'العملية':'Transaction'}</th>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground">{isAr?'الرقم':'Invoice'}</th>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground">{isAr?'الحساب':'Account'}</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground">{isAr?'الكمية':'Qty'}</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground">{isAr?'الرصيد':'Balance'}</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground">{isAr?'السعر':'Price'}</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground">{isAr?'المجموع':'Total'}</th>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground">{isAr?'المستودع':'Warehouse'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className={`border-b border-border/50 hover:bg-accent/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-zinc-50/30 dark:bg-zinc-800/20'}`}>
                      <td className="px-4 py-2.5 font-medium text-muted-foreground">{fmtDate(row.CURDATE)}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-[9px] uppercase tracking-tighter">
                          {isAr ? row.TRN_ANAME : row.TRN_NAME}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{row.INVOICE_NO}</td>
                      <td className="px-4 py-2.5 font-semibold text-foreground max-w-[150px] truncate">{row.Account}</td>
                      <td className={`px-4 py-2.5 text-right font-black ${Number(row.Qty) < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {fmt(row.Qty)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-foreground bg-zinc-50/50 dark:bg-zinc-900/20">
                        {fmt(row.RunningBalance)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(row.PRICE)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-amber-600">{fmt(row.ITM_TOTAL)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.WR_NAME}</td>
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
