import React, { useState } from 'react';
import { FileCheck, ChevronRight, Calendar, CreditCard, ArrowLeft, X, CloudUpload, Printer } from 'lucide-react';

export default function SummaryFooter({ 
  rows = [], 
  taxIncluded = true, 
  onTotalsChange, 
  onSave, 
  paymentMethod = 'Cash', 
  setPaymentMethod,
  cashPaid = 0,
  setCashPaid,
  otherPaid = 0,
  setOtherPaid,
  accounts = [],
  selectedAccount,
  setSelectedAccount,
  customerId,
  currencyCode = 'SAR',
  isReturn = false,
  isPurchase = false,
  isSaving = false,
  selectedCurrencyRate = 1
}) {
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const prevRateRef = React.useRef(selectedCurrencyRate);

  // Convert discount when rate changes
  React.useEffect(() => {
    if (prevRateRef.current !== selectedCurrencyRate) {
      const oldRate = prevRateRef.current;
      const newRate = selectedCurrencyRate;
      setDiscountAmount(prev => (prev * oldRate) / newRate);
      prevRateRef.current = newRate;
    }
  }, [selectedCurrencyRate]);
  
  const cashInputRef = React.useRef(null);
  const otherInputRef = React.useRef(null);
  
  const vatAmount = rows.reduce((acc, row) => {
    const qty = Number(row.qty) || 0;
    const price = Number(row.price || row.purchasePrice) || 0;
    const vatRate = (Number(row.vatPercent) || 0) / 100;
    const lineVat = taxIncluded 
      ? (qty * (price - (price / (1 + vatRate))))
      : (qty * price * vatRate);
    return acc + lineVat;
  }, 0);

  const totalPayable = rows.reduce((acc, row) => {
    const qty = Number(row.qty) || 0;
    const price = Number(row.price || row.purchasePrice) || 0;
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

  // Auto-fill Amount Paid when modal opens or payment method changes
  React.useEffect(() => {
    if (isCheckoutOpen) {
      if (paymentMethod === 'Cash') {
        setCashPaid(netAmount);
        setOtherPaid(0);
      } else if (paymentMethod === 'Others') {
        setOtherPaid(netAmount);
        setCashPaid(0);
      } else if (paymentMethod === 'Both') {
        // Default to split or just keep current? 
        // Let's default to full cash and 0 other for the user to adjust
        if (cashPaid === 0 && otherPaid === 0) {
          setCashPaid(netAmount);
          setOtherPaid(0);
        }
      }
    }
  }, [isCheckoutOpen, paymentMethod, netAmount, setCashPaid, setOtherPaid]);

  // Handle Auto-focus when payment method is selected
  React.useEffect(() => {
    if (paymentMethod) {
      const timer = setTimeout(() => {
        if (paymentMethod === 'Cash' || paymentMethod === 'Both') {
          cashInputRef.current?.focus();
          cashInputRef.current?.select(); // Optional: select text for quick overwrite
        } else if (paymentMethod === 'Others') {
          otherInputRef.current?.focus();
          otherInputRef.current?.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [paymentMethod]);

  const handleNext = () => {
    if (rows.filter(r => r.itemCode.trim() !== '').length === 0) {
      alert("Please add at least one item before proceeding.");
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleFinalSave = () => {
    // Validation for Walkthrough Customer (6000)
    if (String(customerId) === '6000') {
      const totalPaid = (Number(cashPaid) || 0) + (Number(otherPaid) || 0);
      if (Math.abs(totalPaid - netAmount) >= 0.01) {
        alert(`Full payment is mandatory for walkthrough customers.\nTotal Paid: ${currencyCode} ${totalPaid.toFixed(2)}\nNet Amount: ${currencyCode} ${netAmount.toFixed(2)}`);
        return;
      }
    }
    
    setIsCheckoutOpen(false);
    onSave();
  };

  const handleQuickSave = () => {
    if (rows.filter(r => r.itemCode.trim() !== '').length === 0) {
      alert("Please add at least one item before proceeding.");
      return;
    }
    onSave(true);
  };

  return (
    <>
      <div className="bg-zinc-900 dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 dark:border-zinc-700 p-4 transition-all duration-300">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          
          {/* Financials Group */}
          <div className="flex-1 flex flex-wrap items-center justify-start gap-x-8 gap-y-4">
            
            {/* Primary Net Amount */}
            <div className="bg-zinc-950/50 dark:bg-zinc-900/50 border border-zinc-800 dark:border-zinc-700/50 px-6 py-2 rounded-2xl flex flex-col items-start shadow-inner min-w-[180px]">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Net Payable</span>
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
                value={discountAmount} 
                onChange={(e) => setDiscountAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0.00"
                className="bg-zinc-950 dark:bg-zinc-900 text-left text-sm font-black text-white w-24 px-2 py-1 rounded-lg border border-zinc-800 outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>

          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-3 shrink-0 self-center">




            <button 
              type="button"
              onClick={handleQuickSave}
              disabled={netAmount <= 0 || isSaving}
              title={netAmount <= 0 ? "Add items to enable saving" : (isPurchase ? "Complete Purchase" : (isReturn ? "Complete Return" : "Complete Sale"))}
              className={`text-xs font-black uppercase tracking-widest px-6 py-4 rounded-xl transition-all transform active:scale-95 shadow-lg flex items-center gap-2 group shrink-0 ${
                netAmount <= 0 
                ? 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 cursor-not-allowed shadow-none opacity-65' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 shadow-emerald-900/20'
              }`}
            >
              {isPurchase ? 'Complete Purchase' : (isReturn ? 'Complete Return' : 'Complete Sale')}
              <FileCheck size={18} className={netAmount > 0 ? "group-hover:scale-110 transition-transform" : "opacity-65"} />
            </button>

            <button 
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-indigo-900/20 flex items-center gap-2 group shrink-0"
            >
              Payment
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* Checkout Popup Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsCheckoutOpen(false)}
          ></div>
          
          {/* Modal Container */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <CreditCard className="text-indigo-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    {isReturn ? 'Complete Return' : (isPurchase ? 'Complete Purchase' : 'Complete Sale')}
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {isReturn ? 'Finalize return details' : (isPurchase ? 'Finalize purchase details' : 'Finalize payment details')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Financial Summary Snippet */}
              <div className="bg-zinc-950 rounded-2xl p-4 border border-zinc-800/50 flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Net Amount</span>
                <span className="text-xl font-black text-white">{currencyCode} {netAmount.toFixed(2)}</span>
              </div>

              {/* Invoice Date */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                  <Calendar size={14} className="text-indigo-400" />
                  Invoice Date
                </label>
                <input 
                  type="date" 
                  value={new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')} 
                  readOnly
                  className="w-full bg-zinc-950 text-sm font-bold text-zinc-300 px-4 py-3 rounded-xl border border-zinc-800 outline-none cursor-default" 
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                  <CreditCard size={14} className="text-indigo-400" />
                  Payment Methods
                </label>
                
                {/* Multi-select Buttons */}
                <div className="flex gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => {
                      if (paymentMethod === 'Both') setPaymentMethod('Others');
                      else if (paymentMethod === 'Others') setPaymentMethod('Both');
                      else if (paymentMethod === 'Cash') setPaymentMethod('');
                      else setPaymentMethod('Cash');
                    }}
                    className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${
                      (paymentMethod === 'Cash' || paymentMethod === 'Both')
                        ? 'bg-emerald-600 text-white shadow-lg' 
                        : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/50'
                    }`}
                  >
                    CASH
                  </button>
                  <button
                    onClick={() => {
                      if (paymentMethod === 'Both') setPaymentMethod('Cash');
                      else if (paymentMethod === 'Cash') setPaymentMethod('Both');
                      else if (paymentMethod === 'Others') setPaymentMethod('');
                      else setPaymentMethod('Others');
                    }}
                    className={`flex-1 py-3 rounded-lg text-xs font-black transition-all ${
                      (paymentMethod === 'Others' || paymentMethod === 'Both')
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/50'
                    }`}
                  >
                    OTHERS
                  </button>
                </div>

                {/* Amount Paid Fields */}
                <div className="space-y-4 animate-in fade-in duration-300 min-h-[100px] flex flex-col justify-center">
                  {!paymentMethod ? (
                    <div className="py-8 px-4 border border-zinc-800 border-dashed rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Select a payment method to continue</p>
                    </div>
                  ) : (
                    <>
                      {(paymentMethod === 'Cash' || paymentMethod === 'Both') && (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                            {isReturn ? 'Cash Amount Returned' : 'Cash Amount Paid'}
                          </label>
                          <input 
                            ref={cashInputRef}
                            type="number"
                            value={cashPaid}
                            onChange={(e) => setCashPaid(e.target.value === '' ? 0 : Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full bg-zinc-950 text-lg font-black text-emerald-400 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                          />
                        </div>
                      )}

                      {(paymentMethod === 'Others' || paymentMethod === 'Both') && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
                               {isReturn ? 'Other Amount Returned' : 'Other Amount Paid'}
                            </label>
                            <input 
                              ref={otherInputRef}
                              type="number"
                              value={otherPaid}
                              onChange={(e) => setOtherPaid(e.target.value === '' ? 0 : Number(e.target.value))}
                              placeholder="0.00"
                              className="w-full bg-zinc-950 text-lg font-black text-indigo-400 border border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Select Account</label>
                            <select
                              value={selectedAccount}
                              onChange={(e) => setSelectedAccount(e.target.value)}
                              className="w-full bg-zinc-950 text-sm font-black text-indigo-400 border border-zinc-800 rounded-xl px-4 py-3 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            >
                              {accounts.map(acc => (
                                <option key={acc.acc_no || acc.ACC_NO} value={acc.acc_no || acc.ACC_NO} className="bg-zinc-900 text-zinc-200">
                                  {acc.Acc_name || acc.ACC_NAME}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {paymentMethod && (
                        <div className={`mt-2 p-3 rounded-xl border text-center ${Math.abs((cashPaid + otherPaid) - netAmount) < 0.01 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                          <p className="text-[10px] font-bold uppercase tracking-widest">
                            Total Paid: {currencyCode} {(cashPaid + otherPaid).toFixed(2)} 
                            {Math.abs((cashPaid + otherPaid) - netAmount) >= 0.01 && ` (Remaining: ${currencyCode} ${(netAmount - (cashPaid + otherPaid)).toFixed(2)})`}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="flex-1 px-4 py-4 rounded-xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <button 
                onClick={handleFinalSave}
                disabled={!paymentMethod || isSaving}
                className={`flex-[2] text-xs font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group ${paymentMethod && !isSaving ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'}`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <FileCheck size={18} className="group-hover:scale-110 transition-transform" />
                    Confirm & Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
