import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { BarChart3, Filter, Download, Search, X, ChevronDown, Printer } from 'lucide-react';
import API_BASE_URL from '../config';

export default function StockReportPage() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  // Filter state
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'custom'
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('0');
  const [groupSearch, setGroupSearch] = useState(''); // client-side group filter
  const [searchTerm, setSearchTerm] = useState('');

  // Data state
  const [categories, setCategories] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/reports/item-categories`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        categoryCode: selectedCategory,
        dateFilter,
        ...(dateFilter === 'custom' ? { fromDate, toDate } : {})
      });
      const res = await fetch(`${API_BASE_URL}/api/reports/stock?${params}`);
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch (err) {
      console.error(err);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, dateFilter, fromDate, toDate]);

  // Filter by search term and group on client side
  const filteredData = reportData.filter(row => {
    const term = searchTerm.toLowerCase();
    const grp = groupSearch.toLowerCase();
    const matchSearch = !term || (
      String(row.ITEM_CODE || '').toLowerCase().includes(term) ||
      String(row.ITEM_NAME || '').toLowerCase().includes(term) ||
      String(row.ITEM_ANAME || '').toLowerCase().includes(term) ||
      String(row.GROUP_NAME || '').toLowerCase().includes(term)
    );
    const matchGroup = !grp || (
      String(isAr ? row.GROUP_ANAME : row.GROUP_NAME || '').toLowerCase().includes(grp)
    );
    return matchSearch && matchGroup;
  });

  // Totals
  const totalCost = filteredData.reduce((s, r) => s + (Number(r.TOTAL_COST) || 0), 0);
  const totalAmount = filteredData.reduce((s, r) => s + (Number(r.TOTAL_AMOUNT) || 0), 0);
  const totalStock = filteredData.reduce((s, r) => s + (Number(r.STOCK) || 0), 0);

  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // PDF Export via print
  const exportPDF = () => {
    const catLabel = selectedCategory === '0'
      ? (isAr ? 'الكل' : 'All Groups')
      : (categories.find(c => String(c.ITM_CAT_CODE) === String(selectedCategory))
          ? (isAr
              ? categories.find(c => String(c.ITM_CAT_CODE) === String(selectedCategory))?.ITM_CAT_ANAME
              : categories.find(c => String(c.ITM_CAT_CODE) === String(selectedCategory))?.ITM_CAT_NAME)
          : selectedCategory);

    const rows = filteredData.map((r, i) => `
      <tr style="background:${i%2===0?'#fff':'#f8f8f8'}">
        <td>${r.ITEM_CODE}</td>
        <td>${isAr && r.ITEM_ANAME ? r.ITEM_ANAME : r.ITEM_NAME}</td>
        <td>${isAr ? r.GROUP_ANAME : r.GROUP_NAME}</td>
        <td>${isAr ? r.Unit_AName : r.Unit_Name}</td>
        <td style="text-align:right;color:${Number(r.STOCK)<=0?'#e53e3e':'#276749'}">${fmt(r.STOCK)}</td>
        <td style="text-align:right">${fmt(r.COST)}</td>
        <td style="text-align:right">${fmt(r.SALE_PRICE)}</td>
        <td style="text-align:right">${fmt(r.TOTAL_COST)}</td>
        <td style="text-align:right">${fmt(r.TOTAL_AMOUNT)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}">
<head><meta charset="UTF-8"><title>Stock Report</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#111}
  h2{margin:0 0 4px;font-size:16px} p{margin:0 0 12px;color:#666;font-size:10px}
  table{width:100%;border-collapse:collapse;font-size:10px}
  th{background:#1e40af;color:#fff;padding:6px 8px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
  tfoot td{background:#1e3a8a;color:#fff;font-weight:700;padding:6px 8px}
  .summary{display:flex;gap:16px;margin-bottom:12px}
  .card{border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;min-width:120px}
  .card-label{font-size:9px;text-transform:uppercase;color:#888;font-weight:700}
  .card-val{font-size:18px;font-weight:900;color:#1e40af}
</style></head><body>
<h2>${isAr ? 'تقرير المخزون' : 'Stock Report'}</h2>
<p>${isAr ? 'المجموعة' : 'Group'}: ${catLabel} &nbsp;|&nbsp; ${isAr ? 'التاريخ' : 'Generated'}: ${new Date().toLocaleDateString()}</p>
<div class="summary">
  <div class="card"><div class="card-label">${isAr?'الأصناف':'Items'}</div><div class="card-val">${filteredData.length}</div></div>
  <div class="card"><div class="card-label">${isAr?'الكمية':'Total Qty'}</div><div class="card-val">${fmt(totalStock)}</div></div>
  <div class="card"><div class="card-label">${isAr?'التكلفة':'Total Cost'}</div><div class="card-val">${fmt(totalCost)}</div></div>
  <div class="card"><div class="card-label">${isAr?'المبيعات':'Total Sales'}</div><div class="card-val">${fmt(totalAmount)}</div></div>
</div>
<table>
<thead><tr>
  <th>${isAr?'الرمز':'Code'}</th><th>${isAr?'الصنف':'Item'}</th><th>${isAr?'المجموعة':'Group'}</th>
  <th>${isAr?'الوحدة':'Unit'}</th><th style="text-align:right">${isAr?'الكمية':'Qty'}</th>
  <th style="text-align:right">${isAr?'التكلفة':'Cost'}</th><th style="text-align:right">${isAr?'السعر':'Price'}</th>
  <th style="text-align:right">${isAr?'إج.التكلفة':'Tot.Cost'}</th><th style="text-align:right">${isAr?'إج.المبيعات':'Tot.Amt'}</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr>
  <td colspan="4">${isAr?'المجموع':'Total'} (${filteredData.length})</td>
  <td style="text-align:right">${fmt(totalStock)}</td><td colspan="2"></td>
  <td style="text-align:right">${fmt(totalCost)}</td><td style="text-align:right">${fmt(totalAmount)}</td>
</tr></tfoot></table>
</body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['Item Code', 'Item Name', 'Arabic Name', 'Group', 'Unit', 'Stock', 'Cost', 'Sale Price', 'Total Cost', 'Total Amount'];
    const rows = filteredData.map(r => [
      r.ITEM_CODE, r.ITEM_NAME, r.ITEM_ANAME, isAr ? r.GROUP_ANAME : r.GROUP_NAME,
      isAr ? r.Unit_AName : r.Unit_Name,
      r.STOCK, r.COST, r.SALE_PRICE, r.TOTAL_COST, r.TOTAL_AMOUNT
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen bg-background text-foreground ${isAr ? 'rtl' : ''}`}>
      {/* Page Header */}
      <div className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-foreground">
                {isAr ? 'تقرير المخزون' : 'Stock Report'}
              </h1>
              <p className="text-xs text-muted-foreground font-medium">
                {isAr ? 'عرض وتحليل بيانات المخزون' : 'View and analyze stock data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              disabled={!hasLoaded || filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
            >
              <Download size={13} />
              {isAr ? 'CSV' : 'CSV'}
            </button>
            <button
              onClick={exportPDF}
              disabled={!hasLoaded || filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20"
            >
              <Printer size={13} />
              {isAr ? 'PDF' : 'PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-4 border-b border-border bg-card/30">
        <div className="flex flex-wrap gap-4 items-end">

          {/* Date Mode Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? 'الفترة' : 'Date Range'}
            </label>
            <div className="flex rounded-xl overflow-hidden border border-border">
              {[
                { val: 'all', label: isAr ? 'الكل' : 'All' },
                { val: 'custom', label: isAr ? 'مخصص' : 'Custom' }
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => setDateFilter(opt.val)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                    dateFilter === opt.val
                      ? 'bg-indigo-600 text-white'
                      : 'bg-card text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* From Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? 'من تاريخ' : 'From Date'}
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              disabled={dateFilter === 'all'}
              className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* To Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? 'إلى تاريخ' : 'To Date'}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              disabled={dateFilter === 'all'}
              className="h-9 px-3 rounded-xl border border-border bg-card text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Item Group */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? 'مجموعة الأصناف' : 'Item Group'}
            </label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[180px]"
              >
                <option value="0">{isAr ? 'الكل' : 'All Groups'}</option>
                {categories.map(cat => (
                  <option key={cat.ITM_CAT_CODE} value={cat.ITM_CAT_CODE}>
                    {isAr ? cat.ITM_CAT_ANAME : cat.ITM_CAT_NAME}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Group Search Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? 'بحث في المجموعة' : 'Filter by Group'}
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                placeholder={isAr ? 'اسم المجموعة...' : 'Group name...'}
                className="h-9 pl-9 pr-3 rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[160px]"
              />
              {groupSearch && (
                <button onClick={() => setGroupSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isAr ? 'بحث' : 'Search'}
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث عن صنف...' : 'Search items...'}
                className="h-9 pl-9 pr-3 w-full rounded-xl border border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className="h-9 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Filter size={13} />
            )}
            {isAr ? 'عرض التقرير' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {hasLoaded && (
        <div className="px-6 py-4 grid grid-cols-3 gap-4">
          {[
            { label: isAr ? 'إجمالي الأصناف' : 'Total Items', value: filteredData.length.toLocaleString(), color: 'indigo' },
            { label: isAr ? 'إجمالي الكمية' : 'Total Qty', value: fmt(totalStock), color: 'amber' },
            { label: isAr ? 'إجمالي التكلفة' : 'Total Cost', value: fmt(totalCost), color: 'rose' },
          ].map(card => (
            <div key={card.label} className={`bg-card rounded-2xl border border-border p-4 shadow-sm`}>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{card.label}</p>
              <p className={`text-2xl font-black text-${card.color}-500`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Report Table */}
      <div className="px-6 pb-8">
        {!hasLoaded ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <BarChart3 size={28} className="text-emerald-500" />
            </div>
            <p className="text-base font-black text-foreground mb-1">
              {isAr ? 'انقر على "عرض التقرير"' : 'Click "Generate" to load report'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAr ? 'اختر الفلاتر ثم اضغط على الزر' : 'Select filters then press the button'}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <p className="text-base font-black text-foreground mb-1">{isAr ? 'لا توجد بيانات' : 'No data found'}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'حاول تغيير الفلاتر' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-border">
                    {[
                      { label: isAr ? 'رمز الصنف' : 'Item Code', key: 'ITEM_CODE', align: 'text-left' },
                      { label: isAr ? 'اسم الصنف' : 'Item Name', key: 'ITEM_NAME', align: 'text-left' },
                      { label: isAr ? 'المجموعة' : 'Group', key: 'GROUP_NAME', align: 'text-left' },
                      { label: isAr ? 'الوحدة' : 'Unit', key: 'Unit_Name', align: 'text-left' },
                      { label: isAr ? 'الكمية' : 'Stock Qty', key: 'STOCK', align: 'text-right' },
                      { label: isAr ? 'سعر التكلفة' : 'Cost Price', key: 'COST', align: 'text-right' },
                      { label: isAr ? 'سعر البيع' : 'Sale Price', key: 'SALE_PRICE', align: 'text-right' },
                      { label: isAr ? 'إجمالي التكلفة' : 'Total Cost', key: 'TOTAL_COST', align: 'text-right' },
                      { label: isAr ? 'إجمالي المبيعات' : 'Total Amount', key: 'TOTAL_AMOUNT', align: 'text-right' },
                    ].map(col => (
                      <th key={col.key} className={`px-4 py-3 ${col.align} font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={row.ITEM_CODE + idx}
                      className={`border-b border-border/50 hover:bg-accent/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-zinc-50/30 dark:bg-zinc-800/20'}`}
                    >
                      <td className="px-4 py-2.5 font-mono font-bold text-indigo-500">{row.ITEM_CODE}</td>
                      <td className="px-4 py-2.5 font-semibold text-foreground">
                        <div>{isAr && row.ITEM_ANAME ? row.ITEM_ANAME : row.ITEM_NAME}</div>
                        {isAr && row.ITEM_NAME && <div className="text-[10px] text-muted-foreground">{row.ITEM_NAME}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {isAr ? row.GROUP_ANAME : row.GROUP_NAME}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {isAr ? row.Unit_AName : row.Unit_Name}
                      </td>
                      <td className={`px-4 py-2.5 font-black text-right ${Number(row.STOCK) <= 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {fmt(row.STOCK)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(row.COST)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(row.SALE_PRICE)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-amber-600">{fmt(row.TOTAL_COST)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-indigo-600">{fmt(row.TOTAL_AMOUNT)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 border-t-2 border-border font-black">
                    <td colSpan={4} className="px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">
                      {isAr ? `المجموع (${filteredData.length} صنف)` : `Total (${filteredData.length} items)`}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{fmt(totalStock)}</td>
                    <td colSpan={2} className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-amber-600">{fmt(totalCost)}</td>
                    <td className="px-4 py-3 text-right text-indigo-600">{fmt(totalAmount)}</td>
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
