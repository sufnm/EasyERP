import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Wallet, Search, CheckCircle2, FileText, Calendar, Building, CreditCard, Save, Globe } from 'lucide-react';

export default function CustomerReceivablePage({ setActivePage, user }) {
  const [invoices, setInvoices] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedTransactions, setSavedTransactions] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    selectedInvoiceNo: '',
    paymentAmount: '',
    currency: '1',
    currencyRate: '1.00',
    paidToAcc: '',
    description: '',
    costCenter: '',
    entryNumber: ''
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoicesRes, cashAccountsRes, costCentersRes, currenciesRes] = await Promise.all([
          fetch('http://localhost:3000/api/receivable/invoices').then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/cash-accounts').then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/cost-centers').then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/currencies').then(res => res.json())
        ]);
        
        setInvoices(invoicesRes || []);
        setCashAccounts(cashAccountsRes || []);
        setCostCenters(costCentersRes || []);
        setCurrencies(currenciesRes || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInvoiceSelect = (e) => {
    const invNo = e.target.value;
    const invoice = invoices.find(inv => inv.INVOICE_NO === invNo);
    
    const currNo = invoice?.CURRENCY?.toString() || '1';
    const currObj = currencies.find(c => c.Currency_No.toString() === currNo);

    setFormData(prev => ({
      ...prev,
      selectedInvoiceNo: invNo,
      paymentAmount: invoice ? invoice.BALANCE_AMT || '' : '', // Auto-fill balance
      currency: currNo,
      currencyRate: currObj ? currObj.Currency_Rate?.toString() : '1.00'
    }));
    setSelectedInvoice(invoice || null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'currency') {
      const currObj = currencies.find(c => c.Currency_No.toString() === value);
      setFormData(prev => ({ 
        ...prev, 
        currency: value,
        currencyRate: currObj ? currObj.Currency_Rate?.toString() : '1.00'
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        ENTRY_DATE: formData.entryDate,
        DOC_NO: selectedInvoice.INVOICE_NO,
        DOC_TRN_TYPE: selectedInvoice.TRN_TYPE, // From DATA_ENTRY table
        TRN_TYPE: 100, // Customer Receivable
        PAY_FROM_ACC: selectedInvoice.ACCODE,
        PAY_TO_ACC: formData.paidToAcc,
        DESCRIPTION: formData.description,
        PAY_AMOUNT: formData.paymentAmount,
        USER_ID: user?.id || 1,
        CURRENCY_NO: formData.currency,
        CURRENCY_RATE: formData.currencyRate
      };

      const res = await fetch('http://localhost:3000/api/receivable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save receivable');

      const data = await res.json();
      
      const newTransaction = {
        transactionNo: data.transactionId,
        invoiceNo: selectedInvoice.INVOICE_NO,
        payFrom: selectedInvoice.ACCODE,
        payTo: formData.paidToAcc,
        paidAmount: formData.paymentAmount,
        paidDate: formData.entryDate
      };

      setSavedTransactions(prev => [newTransaction, ...prev]);

      // Reset Form slightly but keep the generated entry number visible
      setFormData(prev => ({
        ...prev,
        selectedInvoiceNo: '',
        paymentAmount: '',
        description: '',
        costCenter: '',
        entryNumber: newTransaction.transactionNo
      }));
      setSelectedInvoice(null);
    } catch (error) {
      console.error(error);
      alert('Error saving receivable entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header - compact */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
          <Wallet size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-black text-zinc-800 dark:text-zinc-100 tracking-tight leading-none">Customer Receivable</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Receive payments against outstanding customer invoices.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-card p-3 rounded-xl border border-border shadow-sm">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Entry Number (Read Only) */}
              <div className="col-span-2 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entry Number</label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input
                    type="text"
                    value={formData.entryNumber || 'Auto-generated on Save'}
                    readOnly
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-xs font-bold text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Entry Date */}
              <div className="col-span-2 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entry Date</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input
                    type="date"
                    name="entryDate"
                    value={formData.entryDate}
                    onChange={handleInputChange}
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                    required
                  />
                </div>
              </div>

              {/* Select Invoice */}
              <div className="col-span-2 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Invoice</label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <select
                    name="selectedInvoiceNo"
                    value={formData.selectedInvoiceNo}
                    onChange={handleInvoiceSelect}
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none"
                    required
                  >
                    <option value="">-- Select Pending Invoice --</option>
                    {invoices.map(inv => (
                      <option key={inv.INVOICE_NO} value={inv.INVOICE_NO}>
                        {inv.INVOICE_NO} - {inv.ENAME} (Bal: {inv.BALANCE_AMT})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Currency</label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none"
                    required
                  >
                    <option value="">-- Select --</option>
                    {currencies.map(curr => (
                      <option key={curr.Currency_No} value={curr.Currency_No.toString()}>
                        {curr.Currency_code} - {curr.Currency_Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency Rate */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Rate</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">~</span>
                  <input
                    type="number"
                    step="0.0001"
                    name="currencyRate"
                    value={formData.currencyRate}
                    onChange={handleInputChange}
                    placeholder="1.00"
                    className="w-full pl-6 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-bold text-indigo-600 dark:text-indigo-400"
                    required
                  />
                </div>
              </div>

              {/* Payment Amount */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Paid Amount</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    name="paymentAmount"
                    value={formData.paymentAmount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-bold text-indigo-600 dark:text-indigo-400"
                    required
                  />
                </div>
              </div>

              {/* Paid To AC */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Paid To A/C</label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <select
                    name="paidToAcc"
                    value={formData.paidToAcc}
                    onChange={handleInputChange}
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none"
                    required
                  >
                    <option value="">-- Cash/Bank A/C --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc.ACC_NO} value={acc.ACC_NO}>
                        {acc.ACC_NO} - {acc.ACC_NAME}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2 md:col-span-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Payment remarks or reference..."
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium"
                />
              </div>

              {/* Cost Center */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cost Center</label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <select
                    name="costCenter"
                    value={formData.costCenter}
                    onChange={handleInputChange}
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none"
                  >
                    <option value="">-- Optional --</option>
                    {costCenters.map(cc => (
                      <option key={cc.COST_CODE} value={cc.COST_CODE}>
                        {cc.COST_CODE} - {cc.COST_NAME}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 mt-2 border-t border-border flex justify-end">
              <button 
                type="submit"
                disabled={!selectedInvoice || !formData.paidToAcc || !formData.paymentAmount || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-xs"
              >
                <Save size={14} />
                {isSubmitting ? 'Saving...' : 'Save Receivable'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Selected Invoice Information */}
        <div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50">
               <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                 <FileText size={13} className="text-indigo-500" />
                 Invoice Info
               </h3>
            </div>
            
            <div className="p-3">
              {!selectedInvoice ? (
                <div className="flex flex-col items-center justify-center text-center py-6">
                   <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                     <Search className="text-zinc-400" size={18} />
                   </div>
                   <p className="text-xs font-bold text-zinc-500">No Invoice Selected</p>
                   <p className="text-[10px] text-zinc-400 mt-0.5">Select a pending invoice to view details.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Customer</p>
                    <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{selectedInvoice.ENAME}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">A/C: {selectedInvoice.ACCODE}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Inv. Date</p>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {new Date(selectedInvoice.CURDATE).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Net Amt</p>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {Number(selectedInvoice.NET_AMOUNT).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Cash Paid</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(selectedInvoice.CASH_PAID).toFixed(2)}
                      </p>
                    </div>
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Other Paid</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(selectedInvoice.OTHER_PAID).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Balance Due</p>
                    <p className="text-base font-black text-rose-600 dark:text-rose-400">
                      {Number(selectedInvoice.BALANCE_AMT).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Table Grid for Saved Transactions */}
      <div className="mt-3 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500" />
            Recent Transactions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/30 border-b border-border">
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entry No</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Invoice No</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pay From</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pay To</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Paid Amount</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Paid Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {savedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-5 text-center text-zinc-500 text-xs font-medium">
                    No transactions recorded yet. Fill out the form and click save to see entries here.
                  </td>
                </tr>
              ) : (
                savedTransactions.map((trx, index) => (
                  <tr key={index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">{trx.transactionNo}</td>
                    <td className="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">{trx.invoiceNo}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{trx.payFrom}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{trx.payTo}</td>
                    <td className="px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {Number(trx.paidAmount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{new Date(trx.paidDate).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

