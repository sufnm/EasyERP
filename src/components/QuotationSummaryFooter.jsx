import React, { useState } from 'react';
import { Save } from 'lucide-react';

export default function QuotationSummaryFooter({ 
  rows = [], 
  taxIncluded = true, 
  onTotalsChange, 
  onSave, 
  currencyCode = 'SAR',
  isSaving = false
}) {
  const [discountAmount, setDiscountAmount] = useState(0);
  
  const vatAmount = rows.reduce((acc, row) => {
    const qty = Number(row.qty) || 0;
    const price = Number(row.price) || 0;
    const vatRate = (Number(row.vatPercent) || 0) / 100;
    const lineVat = taxIncluded 
      ? (qty * (price - (price / (1 + vatRate))))
      : (qty * price * vatRate);
    return acc + lineVat;
  }, 0);

  const totalPayable = rows.reduce((acc, row) => {
    const qty = Number(row.qty) || 0;
    const price = Number(row.price) || 0;
    const vatRate = (Number(row.vatPercent) || 0) / 100;
    const lineTotal = taxIncluded 
      ? (qty * price)
      : (qty * price * (1 + vatRate));
    return acc + lineTotal;
  }, 0);

  const grossAmount = totalPayable - vatAmount;
  const netAmount = totalPayable - discountAmount;

  // Sync totals to parent for saving
  React.useEffect(() => {
    if (onTotalsChange) {
      onTotalsChange({
        gross: grossAmount,
        discount: discountAmount,
        net: netAmount,
        vat: vatAmount
      });
    }
  }, [grossAmount, discountAmount, netAmount, vatAmount, onTotalsChange]);

  const handleNextClick = () => {
    if (rows.filter(r => r.itemCode.trim() !== '').length === 0) {
      alert("Please add at least one item before proceeding.");
      return;
    }
    onSave();
  };

  return (
    <div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 dark:border-zinc-700 p-4 transition-all duration-300">
      <div className="flex flex-col lg:flex-row items-center gap-6">
        
        {/* Financials Group */}
        <div className="flex-1 flex flex-wrap items-center justify-start gap-x-8 gap-y-4">
          
          {/* Primary Net Amount */}
          <div className="bg-zinc-950/50 dark:bg-zinc-900/50 border border-zinc-800 dark:border-zinc-700/50 px-6 py-2 rounded-2xl flex flex-col items-start shadow-inner min-w-[180px]">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Quotation Total</span>
             <div className="flex items-baseline gap-1">
               <span className="text-[10px] font-bold text-zinc-500">{currencyCode}</span>
               <span className="text-3xl font-black text-white tracking-widest bg-gradient-to-r from-indigo-400 to-violet-300 bg-clip-text text-transparent drop-shadow-sm">
                 {netAmount.toFixed(2)}
               </span>
             </div>
          </div>

          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Gross</span>
            <span className="text-sm font-black text-zinc-300">{currencyCode} {grossAmount.toFixed(2)}</span>
          </div>

          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">VAT Total</span>
            <span className="text-sm font-black text-indigo-400">{currencyCode} {vatAmount.toFixed(2)}</span>
          </div>

          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 px-1">Discount</span>
            <input 
              type="number" 
              value={discountAmount || ''} 
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              placeholder="0.00"
              className="bg-zinc-950 dark:bg-zinc-900 text-left text-sm font-black text-white w-24 px-2 py-1 rounded-lg border border-zinc-800 outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>

        </div>

        {/* Action Buttons Group */}
        <div className="flex items-center gap-3 shrink-0 self-center">
          <button 
            onClick={handleNextClick}
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-10 py-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-indigo-900/20 flex items-center gap-2 group shrink-0"
          >
            {isSaving ? 'Saving...' : 'Save'}
            <Save size={16} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
