import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Wallet, Search, CheckCircle2, FileText, Calendar, Building, CreditCard, Save, Globe, ShieldAlert, ShieldCheck, ShieldOff, Lock, Pencil, MapPin, Printer, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SupplierPayablePage({ setActivePage, user }) {
  const { t, language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [accountsInfo, setAccountsInfo] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedTransactions, setSavedTransactions] = useState([]);
  const [returnInvoice, setReturnInvoice] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEditId, setActiveEditId] = useState(null);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [privileges, setPrivileges] = useState({ canInsert: true, canUpdate: true, canDelete: true, canView: true });

  const [formData, setFormData] = useState({
    ID: null,
    ENTRY_DATE: new Date().toISOString().split('T')[0],
    DOC_NO: '',
    DOC_TRN_TYPE: 6,
    PAY_FROM_ACC: '',
    PAY_TO_ACC: '',
    DESCRIPTION: '',
    PAY_AMOUNT: '',
    CURRENCY: '1',
    CURRENCY_RATE: '1',
    RETURN_INVOICE: false,
    REF_NO: '',
    COST_CENTER: '',
    BRN_CODE: '1',
    ACC_NAME1: '',
    ACC_NAME2: '',
    paymentAmount: ''
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = user?.username || 'admin';
        const headers = { 'Accept-Language': language };
        
        const [invoicesRes, cashAccountsRes, costCentersRes, currenciesRes, privRes, accountsInfoRes, historyRes, branchesRes] = await Promise.all([
          fetch(API_ENDPOINTS.PAYABLE_INVOICES(returnInvoice), { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_CASH_ACCOUNTS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_COST_CENTERS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_CURRENCIES, { headers }).then(res => res.json()),
          fetch(`${API_ENDPOINTS.BASE_URL}/api/privileges/200?username=${encodeURIComponent(username)}`, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_ACCOUNTS_INFO, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.PAYABLE_HISTORY, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.BRANCHES, { headers }).then(res => res.json())
        ]);

        setInvoices(invoicesRes || []);
        setCashAccounts(cashAccountsRes || []);
        setCostCenters(costCentersRes || []);
        setCurrencies(currenciesRes || []);
        setPrivileges(privRes);
        setAccountsInfo(accountsInfoRes || []);
        setSavedTransactions(historyRes || []);
        setBranches(branchesRes || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [user, returnInvoice, language]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      
      // Auto-fill account names for labels if IDs change
      if (name === 'PAY_FROM_ACC') {
        const acc = accountsInfo.find(a => a.ACC_NO.toString() === value);
        newData.ACC_NAME1 = acc ? acc.ACC_NAME : '';
      }
      if (name === 'PAY_TO_ACC') {
        const acc = cashAccounts.find(a => a.ACC_NO.toString() === value);
        newData.ACC_NAME2 = acc ? acc.ACC_NAME : '';
      }
      if (name === 'CURRENCY') {
        const curr = currencies.find(c => c.Currency_No.toString() === value);
        newData.CURRENCY_RATE = curr ? curr.Currency_Rate.toString() : '1';
      }

      // Special handling for invoice dropdown
      if (name === 'DOC_NO') {
        const inv = invoices.find(i => i.INVOICE_NO === value);
        if (inv) {
          setSelectedInvoice(inv);
          newData.DOC_TRN_TYPE = inv.TRN_TYPE;
          newData.paymentAmount = inv.BALANCE_AMT.toString();
          newData.PAY_FROM_ACC = inv.ACCODE.toString();
          const acc = accountsInfo.find(a => a.ACC_NO.toString() === inv.ACCODE.toString());
          newData.ACC_NAME1 = acc ? acc.ACC_NAME : inv.ENAME;
        } else {
          setSelectedInvoice(null);
          newData.paymentAmount = '';
          newData.PAY_FROM_ACC = '';
          newData.ACC_NAME1 = '';
        }
      }
      
      return newData;
    });
  };

  const resetForm = () => {
    setFormData({
      ID: null,
      ENTRY_DATE: new Date().toISOString().split('T')[0],
      DOC_NO: '',
      DOC_TRN_TYPE: 6,
      PAY_FROM_ACC: '',
      PAY_TO_ACC: '',
      DESCRIPTION: '',
      PAY_AMOUNT: '',
      CURRENCY: '1',
      CURRENCY_RATE: '1',
      RETURN_INVOICE: false,
      REF_NO: '',
      COST_CENTER: '',
      BRN_CODE: '1',
      ACC_NAME1: '',
      ACC_NAME2: '',
      paymentAmount: ''
    });
    setSelectedInvoice(null);
    setActiveEditId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!privileges.canInsert && !activeEditId) return alert('No permission to save');
    if (!privileges.canUpdate && activeEditId) return alert('No permission to update');

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        PAY_AMOUNT: parseFloat(formData.paymentAmount),
        USER_ID: user?.userid || 1,
        RETURN_INVOICE: returnInvoice
      };

      const response = await fetch(API_ENDPOINTS.PAYABLE_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.success) {
        setLastSavedId(resData.transactionId);
        // Refresh history
        const historyRes = await fetch(API_ENDPOINTS.PAYABLE_HISTORY).then(r => r.json());
        setSavedTransactions(historyRes || []);
        alert(activeEditId ? 'Transaction updated successfully!' : 'Transaction saved successfully!');
        if (!activeEditId) resetForm();
      } else {
        alert('Error: ' + resData.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tx) => {
    setActiveEditId(tx.ID);
    setFormData({
      ID: tx.ID,
      ENTRY_DATE: tx.ENTRY_DATE.split('T')[0],
      DOC_NO: tx.DOC_NO,
      DOC_TRN_TYPE: 6,
      PAY_FROM_ACC: tx.PAY_FROM_ACC.toString(),
      PAY_TO_ACC: tx.PAY_TO_ACC.toString(),
      DESCRIPTION: tx.DESCRIPTION || '',
      PAY_AMOUNT: tx.PAY_AMOUNT,
      paymentAmount: tx.PAY_AMOUNT.toString(),
      CURRENCY: tx.CURRENCY?.toString() || '1',
      CURRENCY_RATE: tx.CURRENCY_RATE?.toString() || '1',
      RETURN_INVOICE: tx.RETURN_INVOICE,
      REF_NO: tx.REF_NO || '',
      COST_CENTER: tx.COST_CENTER || '',
      BRN_CODE: tx.BRN_CODE?.toString() || '1',
      ACC_NAME1: tx['TO ACC'] || '',
      ACC_NAME2: tx.FROM_ACC || ''
    });
    setReturnInvoice(tx.RETURN_INVOICE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    const idToPrint = activeEditId || lastSavedId;
    if (!idToPrint) return;
    const tx = savedTransactions.find(t => t.ID === idToPrint);
    if (!tx) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Voucher - ${tx.DOC_NO}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #f43f5e; margin-bottom: 30px; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #f43f5e; text-transform: uppercase; letter-spacing: 2px; }
            .header p { margin: 5px 0; font-weight: bold; color: #666; }
            .voucher-info { display: flex; justify-content: space-between; margin-bottom: 30px; background: #fff1f2; padding: 15px; border-radius: 8px; }
            .details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .details th, .details td { border: 1px solid #fecdd3; padding: 12px 15px; text-align: left; }
            .details th { background-color: #fff1f2; font-weight: bold; width: 30%; color: #9f1239; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px; font-weight: bold; font-size: 0.9em; }
            .amount-box { background: #f43f5e; color: white; padding: 10px 20px; border-radius: 6px; display: inline-block; font-size: 1.2em; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EazyERP Solutions</h1>
            <p>SUPPLIER PAYMENT VOUCHER</p>
          </div>
          <div class="voucher-info">
            <div>
              <p><strong>Voucher ID:</strong> ${tx.ID}</p>
              <p><strong>Date:</strong> ${new Date(tx.ENTRY_DATE).toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>Document No:</strong> ${tx.DOC_NO}</p>
              <p><strong>Branch:</strong> ${tx.BRN_CODE}</p>
            </div>
          </div>
          <table class="details">
            <tr><th>Paid To (Account)</th><td>${tx['TO ACC']} (${tx.PAY_FROM_ACC})</td></tr>
            <tr><th>Paid From (Account)</th><td>${tx.FROM_ACC} (${tx.PAY_TO_ACC})</td></tr>
            <tr><th>Description / Narration</th><td>${tx.DESCRIPTION || 'N/A'}</td></tr>
            <tr><th>Reference No</th><td>${tx.REF_NO || 'N/A'}</td></tr>
            <tr><th>Cost Center</th><td>${tx.COST_CENTER || 'Main'}</td></tr>
            <tr><th>Currency</th><td>${tx.CURRENCY === 1 ? 'SAR' : 'USD'} (Rate: ${tx.CURRENCY_RATE})</td></tr>
          </table>
          <div style="text-align: right; margin-top: 20px;">
            <p style="margin-bottom: 5px; font-weight: bold; color: #666;">Total Amount Paid:</p>
            <div class="amount-box">SAR ${Number(tx.PAY_AMOUNT).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div class="footer">
            <div class="signature">Authorized Signature</div>
            <div class="signature">Receiver's Signature</div>
          </div>
          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 30px; background: #f43f5e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Click to Print</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
          <p className="text-sm font-black text-rose-600 animate-pulse uppercase tracking-widest">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (privileges && !privileges.canView) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-50/30">
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-xl border border-rose-100 max-w-md text-center">
          <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-2">
            <Lock size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tighter">Access Denied</h2>
          <p className="text-zinc-500 font-medium text-sm">You do not have permission to view Supplier Payable.</p>
          <button 
            onClick={() => setActivePage('dashboard')}
            className="mt-4 px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full p-4 bg-zinc-50/30 ${language === 'ar' ? 'rtl font-arabic' : ''}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase flex items-center gap-2">
            <div className="p-1.5 bg-rose-600 rounded-lg text-white">
              <CreditCard size={20} strokeWidth={2.5} />
            </div>
            {t('supplierPayable')}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            {activeEditId ? `Editing Transaction #${activeEditId}` : 'Financial Outflow Management'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg border border-border p-0.5 shadow-sm">
            <button 
              onClick={() => { setReturnInvoice(false); resetForm(); }}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${!returnInvoice ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Normal
            </button>
            <button 
              onClick={() => { setReturnInvoice(true); resetForm(); }}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${returnInvoice ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
            >
              Return
            </button>
          </div>
          <button 
            onClick={resetForm}
            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="New Transaction"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Entry Form */}
        <div className="lg:col-span-3 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
              <Pencil size={13} className="text-rose-500" />
              {t('transactionEntry')}
            </h3>
            {activeEditId && (
              <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase">Edit Mode</span>
            )}
          </div>

          <form onSubmit={handleSave} className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('paidDate')}</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <input
                    type="date"
                    name="ENTRY_DATE"
                    value={formData.ENTRY_DATE}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('invoiceNo')} (Combo List)</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <select
                    name="DOC_NO"
                    value={formData.DOC_NO}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black text-rose-600 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="">-- {t('selectInvoice')} --</option>
                    {invoices.map(inv => (
                      <option key={inv.INVOICE_NO} value={inv.INVOICE_NO}>
                        {inv.INVOICE_NO} - {inv.ENAME} (SAR {Number(inv.BALANCE_AMT).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payTo')}</label>
                  <select
                    name="PAY_FROM_ACC"
                    value={formData.PAY_FROM_ACC}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none appearance-none"
                    required
                  >
                    <option value="">-- {t('selectAccount')} --</option>
                    {accountsInfo.map(acc => (
                      <option key={acc.ACC_NO} value={acc.ACC_NO.toString()}>{acc.ACC_NO} - {acc.ACC_NAME}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payFrom')}</label>
                  <select
                    name="PAY_TO_ACC"
                    value={formData.PAY_TO_ACC}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none appearance-none"
                    required
                  >
                    <option value="">-- {t('selectAccount')} --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc.ACC_NO} value={acc.ACC_NO.toString()}>{acc.ACC_NO} - {acc.ACC_NAME}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('paidAmount')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">SAR</span>
                  <input
                    type="number"
                    step="0.01"
                    name="paymentAmount"
                    value={formData.paymentAmount}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black text-zinc-900 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ref No / Check No</label>
                <input
                  type="text"
                  name="REF_NO"
                  value={formData.REF_NO}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none"
                  placeholder="Internal reference..."
                />
              </div>

              <div className="col-span-2 grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('costCenter')}</label>
                  <select
                    name="COST_CENTER"
                    value={formData.COST_CENTER}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none"
                  >
                    <option value="">{t('main')}</option>
                    {costCenters.map(cc => (
                      <option key={cc.CC_CODE} value={cc.CC_CODE}>{cc.CC_NAME}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('currency')}</label>
                  <select
                    name="CURRENCY"
                    value={formData.CURRENCY}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none"
                  >
                    {currencies.map(curr => (
                      <option key={curr.Currency_No} value={curr.Currency_No.toString()}>{curr.Currency_code}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('exchangeRate')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="CURRENCY_RATE"
                    value={formData.CURRENCY_RATE}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('description')}</label>
                <textarea
                  name="DESCRIPTION"
                  value={formData.DESCRIPTION}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                  placeholder="Notes about this payment..."
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <Save size={14} />
                  )}
                  {activeEditId ? t('update') : t('save')}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!activeEditId && !lastSavedId}
                  className={`flex items-center gap-2 px-6 py-1.5 rounded-lg font-bold text-xs shadow-lg transition-all active:scale-95 ${
                    (!activeEditId && !lastSavedId)
                      ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                      : 'bg-zinc-900 hover:bg-black text-white shadow-zinc-900/20'
                  }`}
                >
                  <Printer size={14} />
                  {t('print')}
                </button>
            </div>
          </form>
        </div>

        {/* Selected Invoice Details Sidebar */}
        <div className="lg:col-span-1 bg-card rounded-xl border border-border shadow-sm p-4 h-fit">
           <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5 mb-3">
             <FileText size={13} className="text-rose-500" />
             {t('invoiceInfo')}
           </h3>
           {!selectedInvoice ? (
             <div className="text-center py-6 text-zinc-400 text-xs italic">{t('noInvoiceSelected')}</div>
           ) : (
             <div className="space-y-3">
               <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100">
                  <p className="text-[10px] font-bold text-rose-600 uppercase">Supplier</p>
                  <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{selectedInvoice.ENAME}</p>
               </div>
               <div className="grid grid-cols-1 gap-2">
                  <div className="flex justify-between border-b border-dashed border-zinc-200 pb-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{t('invoiceNo')}</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{selectedInvoice.INVOICE_NO}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-200 pb-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Net Amount</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{Number(selectedInvoice.NET_AMOUNT || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-200 pb-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Paid Amount</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{Number((selectedInvoice.CASH_PAID || 0) + (selectedInvoice.OTHER_PAID || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-zinc-200 pb-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">{t('balanceDue')}</span>
                    <span className="text-xs font-black text-rose-600">{Number(selectedInvoice.BALANCE_AMT || 0).toFixed(2)}</span>
                  </div>
               </div>

               {/* SPECIFIC INVOICE HISTORY */}
               {savedTransactions.filter(tx => tx.DOC_NO === selectedInvoice.INVOICE_NO).length > 0 && (
                 <div className="mt-4 pt-3 border-t border-zinc-100">
                    <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <CheckCircle2 size={10} className="text-rose-500" />
                      Invoice Payment History
                    </h4>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                      {savedTransactions
                        .filter(tx => tx.DOC_NO === selectedInvoice.INVOICE_NO)
                        .map((tx, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[9px] p-1.5 bg-rose-50 rounded border border-rose-100/50">
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-700">{new Date(tx.ENTRY_DATE).toLocaleDateString()}</span>
                              <span className="text-[8px] text-zinc-400 truncate w-24">{tx['TO ACC']}</span>
                            </div>
                            <span className="font-black text-rose-600">SAR {Number(tx.PAY_AMOUNT).toFixed(2)}</span>
                          </div>
                        ))}
                    </div>
                 </div>
               )}

               {/* Overpayment Warning */}
               {formData.paymentAmount && Number(formData.paymentAmount) > Number(selectedInvoice.BALANCE_AMT) && (
                 <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2 animate-pulse">
                   <ShieldAlert size={14} className="text-rose-500 mt-0.5" />
                   <p className="text-[10px] font-bold text-rose-600 leading-tight">
                     WARNING: Entered amount (${formData.paymentAmount}) is greater than the remaining balance (${Number(selectedInvoice.BALANCE_AMT).toFixed(2)}).
                   </p>
                 </div>
               )}
             </div>
           )}
        </div>
      </div>

      {/* Grid Table */}
      <div className="mt-4 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-rose-500" />
            {t('recentTransactions')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/30 border-b border-border">
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('paidDate')}</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Doc No</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">To Acc</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">From Acc</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">{t('paidAmount')}</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Return</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {savedTransactions.map(tx => (
                <tr key={tx.ID} className="border-b border-border hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-2 font-bold text-rose-600">{tx.ID}</td>
                  <td className="px-4 py-2 text-zinc-600">{new Date(tx.ENTRY_DATE).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-black text-zinc-800">{tx.DOC_NO}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    <div className="font-bold">{tx['TO ACC']}</div>
                    <div className="text-[9px] text-zinc-400">{tx.PAY_FROM_ACC}</div>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">
                    <div className="font-bold">{tx.FROM_ACC}</div>
                    <div className="text-[9px] text-zinc-400">{tx.PAY_TO_ACC}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-black text-rose-600">{Number(tx.PAY_AMOUNT).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-2 text-zinc-500 truncate max-w-[150px]">{tx.DESCRIPTION}</td>
                  <td className="px-4 py-2">
                    {tx.RETURN_INVOICE ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-black uppercase tracking-tighter">Return</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase tracking-tighter">Normal</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button 
                      onClick={() => handleEdit(tx)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {savedTransactions.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-zinc-400 italic">No transactions found for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
