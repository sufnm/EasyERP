import React from 'react';
import { FileCheck } from 'lucide-react';

export default function SummaryFooter({ 
  rows = [], 
  taxIncluded = true, 
  onTotalsChange, 
  onSave, 
  paymentMethod = 'Cash', 
  setPaymentMethod,
  accounts = [],
  selectedAccount,
  setSelectedAccount
}) {
  const [discountAmount, setDiscountAmount] = React.useState(0);
  
  const vatAmount = rows.reduce((acc, row) => {
    const qty = Number(row.qty) || 0;
    const unit = Number(row.unit) || 0;
    const vatRate = (Number(row.vatPercent) || 0) / 100;
    const lineVat = taxIncluded 
      ? (qty * (unit - (unit / (1 + vatRate))))
      : (qty * unit * vatRate);
    return acc + lineVat;
  }, 0);

  const totalPayable = rows.reduce((acc, row) => {
    const qty = Number(row.qty) || 0;
    const unit = Number(row.unit) || 0;
    const vatRate = (Number(row.vatPercent) || 0) / 100;
    const lineTotal = taxIncluded 
      ? (qty * unit)
      : (qty * unit * (1 + vatRate));
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

  return (
    <div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 dark:border-zinc-700 p-4 transition-all duration-300">
      <div className="flex flex-col lg:flex-row items-center gap-6">
        
        {/* Financials Group (Now on the Left) */}
        <div className="flex-1 flex flex-wrap items-center justify-start gap-x-8 gap-y-4">
          
          {/* Primary Net Amount */}
          <div className="bg-zinc-950/50 dark:bg-zinc-900/50 border border-zinc-800 dark:border-zinc-700/50 px-6 py-2 rounded-2xl flex flex-col items-start shadow-inner min-w-[180px]">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Net Payable</span>
             <div className="flex items-baseline gap-1">
               <span className="text-[10px] font-bold text-zinc-500">SAR</span>
               <span className="text-3xl font-black text-white tracking-widest bg-gradient-to-r from-indigo-400 to-violet-300 bg-clip-text text-transparent drop-shadow-sm">
                 {netAmount.toFixed(2)}
               </span>
             </div>
          </div>

          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Gross</span>
            <span className="text-sm font-black text-zinc-300">SAR {grossAmount.toFixed(2)}</span>
          </div>

          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">VAT Total</span>
            <span className="text-sm font-black text-indigo-400">SAR {vatAmount.toFixed(2)}</span>
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

        {/* Separator */}
        <div className="hidden lg:block w-px h-12 bg-zinc-800"></div>

        {/* Date Group */}
        <div className="flex flex-col">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 px-1">Invoice Date</label>
          <input 
            type="date" 
            value={new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')} 
            readOnly
            className="bg-zinc-950 dark:bg-zinc-900 text-xs font-bold text-zinc-300 px-3 py-2 rounded-xl border border-zinc-800 outline-none cursor-default min-w-[140px]" 
          />
        </div>

        {/* Separator */}
        <div className="hidden lg:block w-px h-12 bg-zinc-800"></div>

        {/* Payment Method Group */}
        <div className="flex flex-col items-start gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Payment</label>
          <div className="flex p-0.5 bg-zinc-950 dark:bg-zinc-900 rounded-lg border border-zinc-800">
            {['Cash', 'Others'].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${
                  paymentMethod === method 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {method.toUpperCase()}
              </button>
            ))}
          </div>
          {paymentMethod === 'Others' && (
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full bg-zinc-950 dark:bg-zinc-900 text-[10px] font-black text-indigo-400 border border-zinc-800 rounded-lg px-2 py-1.5 outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500/50 transition-all"
            >
              {accounts.map(acc => (
                <option key={acc.acc_no} value={acc.acc_no} className="bg-zinc-900 text-zinc-200">
                  {acc.Acc_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Separator */}
        <div className="hidden lg:block w-px h-12 bg-zinc-800"></div>

        {/* Save Button */}
        <button 
          onClick={onSave}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest px-8 py-3 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-emerald-900/20 flex items-center gap-2 group shrink-0 self-center"
        >
          <FileCheck size={18} className="group-hover:scale-110 transition-transform" />
          Save Invoice
        </button>

      </div>
    </div>
  );
}
