import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Wallet, Search, CheckCircle2, FileText, Calendar, Building, CreditCard, Save, Globe, ShieldAlert, ShieldCheck, ShieldOff, Lock, Pencil, MapPin, Printer, Plus, TrendingUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SearchableDropdown from '../components/SearchableDropdown';

export default function CustomerReceivablePage({ setActivePage, user }) {
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
          fetch(API_ENDPOINTS.RECEIVABLE_INVOICES(returnInvoice), { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_CASH_ACCOUNTS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_COST_CENTERS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_CURRENCIES, { headers }).then(res => res.json()),
          fetch(`${API_ENDPOINTS.BASE_URL}/api/privileges/100?username=${encodeURIComponent(username)}`, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_ACCOUNTS_INFO, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_HISTORY, { headers }).then(res => res.json()),
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

      const response = await fetch(API_ENDPOINTS.RECEIVABLE_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.success) {
        setLastSavedId(resData.transactionId);
        // Refresh history
        const historyRes = await fetch(API_ENDPOINTS.RECEIVABLE_HISTORY).then(r => r.json());
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
      ACC_NAME1: tx['FROM ACC'] || '',
      ACC_NAME2: tx.TO_ACC || ''
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
            .header { text-align: center; border-bottom: 3px solid #4f46e5; margin-bottom: 30px; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #4f46e5; text-transform: uppercase; letter-spacing: 2px; }
            .header p { margin: 5px 0; font-weight: bold; color: #666; }
            .voucher-info { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f9fafb; padding: 15px; border-radius: 8px; }
            .details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .details th, .details td { border: 1px solid #e5e7eb; padding: 12px 15px; text-align: left; }
            .details th { background-color: #f3f4f6; font-weight: bold; width: 30%; color: #4b5563; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px; font-weight: bold; font-size: 0.9em; }
            .amount-box { background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; display: inline-block; font-size: 1.2em; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EazyERP Solutions</h1>
            <p>PAYMENT VOUCHER</p>
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
            <tr><th>Paid From (Account)</th><td>${tx['FROM ACC']} (${tx.PAY_FROM_ACC})</td></tr>
            <tr><th>Deposited To (Account)</th><td>${tx.TO_ACC} (${tx.PAY_TO_ACC})</td></tr>
            <tr><th>Description / Narration</th><td>${tx.DESCRIPTION || 'N/A'}</td></tr>
            <tr><th>Reference No</th><td>${tx.REF_NO || 'N/A'}</td></tr>
            <tr><th>Cost Center</th><td>${tx.COST_CENTER || 'Main'}</td></tr>
            <tr><th>Currency</th><td>${tx.CURRENCY === 1 ? 'SAR' : 'USD'} (Rate: ${tx.CURRENCY_RATE})</td></tr>
          </table>
          <div style="text-align: right; margin-top: 20px;">
            <p style="margin-bottom: 5px; font-weight: bold; color: #666;">Total Amount Received:</p>
            <div class="amount-box">SAR ${Number(tx.PAY_AMOUNT).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div class="footer">
            <div class="signature">Authorized Signature</div>
            <div class="signature">Receiver's Signature</div>
          </div>
          <div class="no-print" style="margin-top: 40px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 30px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Click to Print</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent shadow-sm"></div>
          <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 animate-pulse uppercase tracking-widest">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (privileges && !privileges.canView) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-md text-center transition-colors duration-300">
          <div className="h-16 w-16 bg-rose-100 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400 mb-2">
            <Lock size={32} strokeWidth={2.2} />
          </div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Access Denied</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs mt-1 leading-relaxed">You do not have permission to view Customer Receivable. Please contact your system administrator.</p>
          <button 
            onClick={() => setActivePage('dashboard')}
            className="mt-5 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-800 text-white dark:text-zinc-200 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-black dark:hover:bg-zinc-700 transition-all active:scale-95 shadow-md"
          >
            Go Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full p-6 animate-in fade-in duration-500 relative ${language === 'ar' ? 'rtl font-arabic' : ''}`}>
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500 dark:bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <Wallet size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase">
                {t('customerReceivable')}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">
                {activeEditId ? `Editing Transaction #${activeEditId}` : 'Financial Inflow Management'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shadow-inner gap-1">
              <button 
                onClick={() => { setReturnInvoice(false); resetForm(); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  !returnInvoice 
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Normal
              </button>
              <button 
                onClick={() => { setReturnInvoice(true); resetForm(); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  returnInvoice 
                    ? 'bg-rose-500 text-white shadow-sm' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Return
              </button>
            </div>
            
            <button 
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95"
              title="New Transaction"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Entry
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Entry Form */}
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                <Pencil size={14} className="text-indigo-500 dark:text-indigo-400" />
                {t('transactionEntry')}
              </h3>
              {activeEditId && (
                <span className="text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-200/50 dark:border-indigo-800/50 animate-pulse">Edit Mode</span>
              )}
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5">
                
                {/* Paid Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{t('paidDate')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                    <input
                      type="date"
                      name="ENTRY_DATE"
                      value={formData.ENTRY_DATE}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                      required
                    />
                  </div>
                </div>

                {/* Invoice No */}
                <SearchableDropdown
                  label={`${t('invoiceNo')} (Searchable)`}
                  name="DOC_NO"
                  value={formData.DOC_NO}
                  onChange={handleInputChange}
                  options={invoices.map(inv => ({
                    id: inv.INVOICE_NO,
                    label: inv.INVOICE_NO,
                    subLabel: `${inv.ENAME} (SAR ${Number(inv.BALANCE_AMT).toFixed(2)})`
                  }))}
                  placeholder={`-- ${t('selectInvoice')} --`}
                  icon={FileText}
                  themeColor="indigo"
                />

                {/* Pay From and Pay To Accounts */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5">
                  
                  {/* Pay From Acc */}
                  <SearchableDropdown
                    label={t('payFrom')}
                    name="PAY_FROM_ACC"
                    value={formData.PAY_FROM_ACC}
                    onChange={handleInputChange}
                    options={accountsInfo.map(acc => ({
                      id: acc.ACC_NO.toString(),
                      label: acc.ACC_NAME,
                      subLabel: acc.ACC_NO.toString()
                    }))}
                    placeholder={`-- ${t('selectAccount')} --`}
                    icon={Building}
                    themeColor="indigo"
                    required
                  />

                  {/* Pay To Acc */}
                  <SearchableDropdown
                    label={t('payTo')}
                    name="PAY_TO_ACC"
                    value={formData.PAY_TO_ACC}
                    onChange={handleInputChange}
                    options={cashAccounts.map(acc => ({
                      id: acc.ACC_NO.toString(),
                      label: acc.ACC_NAME,
                      subLabel: acc.ACC_NO.toString()
                    }))}
                    placeholder={`-- ${t('selectAccount')} --`}
                    icon={Wallet}
                    themeColor="indigo"
                    required
                  />

                </div>

                {/* Paid Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{t('paidAmount')}</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 dark:text-zinc-400 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">SAR</div>
                    <input
                      type="number"
                      step="0.01"
                      name="paymentAmount"
                      value={formData.paymentAmount}
                      onChange={handleInputChange}
                      className="w-full pl-16 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-black text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Ref No */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Ref No / Check No</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                    <input
                      type="text"
                      name="REF_NO"
                      value={formData.REF_NO}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                      placeholder="Internal reference..."
                    />
                  </div>
                </div>

                {/* Financial detail fields row */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-3.5">
                  
                  {/* Cost Center */}
                  <SearchableDropdown
                    label={t('costCenter')}
                    name="COST_CENTER"
                    value={formData.COST_CENTER}
                    onChange={handleInputChange}
                    options={costCenters.map(cc => ({
                      id: cc.CC_CODE,
                      label: cc.CC_NAME,
                      subLabel: cc.CC_CODE
                    }))}
                    placeholder={t('main')}
                    icon={MapPin}
                    themeColor="indigo"
                  />

                  {/* Currency */}
                  <SearchableDropdown
                    label={t('currency')}
                    name="CURRENCY"
                    value={formData.CURRENCY}
                    onChange={handleInputChange}
                    options={currencies.map(curr => ({
                      id: curr.Currency_No.toString(),
                      label: curr.Currency_code,
                      subLabel: `Rate: ${curr.Currency_Rate}`
                    }))}
                    placeholder={t('currency')}
                    icon={Globe}
                    themeColor="indigo"
                  />

                  {/* Exchange Rate */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{t('exchangeRate')}</label>
                    <div className="relative">
                      <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                      <input
                        type="number"
                        step="0.0001"
                        name="CURRENCY_RATE"
                        value={formData.CURRENCY_RATE}
                        onChange={handleInputChange}
                        className="w-full pl-11 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                </div>

                {/* Description */}
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{t('description')}</label>
                  <textarea
                    name="DESCRIPTION"
                    value={formData.DESCRIPTION}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner resize-none"
                    placeholder="Notes about this transaction..."
                  ></textarea>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/15 hover:shadow-indigo-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Save size={16} strokeWidth={2.2} />
                  )}
                  {activeEditId ? t('update') : t('save')}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!activeEditId && !lastSavedId}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all ${
                    (!activeEditId && !lastSavedId)
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                      : 'bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white shadow-zinc-900/10 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]'
                  }`}
                >
                  <Printer size={16} strokeWidth={2.2} />
                  {t('print')}
                </button>
              </div>
            </form>
          </div>

          {/* Selected Invoice Details Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-5 h-fit flex flex-col transition-colors duration-300">
             <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2 mb-4">
               <FileText size={14} className="text-indigo-500 dark:text-indigo-400" />
               {t('invoiceInfo')}
             </h3>
             
             {!selectedInvoice ? (
               <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                 <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-full text-zinc-400 dark:text-zinc-600 mb-3 border border-dashed border-zinc-200 dark:border-zinc-800">
                   <FileText size={24} className="opacity-50" />
                 </div>
                 <p className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('noInvoiceSelected')}</p>
                 <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 max-w-[180px] leading-relaxed font-medium">Choose an invoice from the dropdown to see financial details and transaction history.</p>
               </div>
             ) : (
               <div className="space-y-4">
                 
                 {/* Customer */}
                 <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-0.5">{t('customer')}</span>
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-100 block truncate">{selectedInvoice.ENAME}</span>
                 </div>

                 {/* Grid details */}
                 <div className="space-y-2.5">
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{t('invoiceNo')}</span>
                      <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">#{selectedInvoice.INVOICE_NO}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Net Amount</span>
                      <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">SAR {Number(selectedInvoice.NET_AMOUNT || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Paid Amount</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">SAR {Number((selectedInvoice.CASH_PAID || 0) + (selectedInvoice.OTHER_PAID || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">{t('balanceDue')}</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400">SAR {Number(selectedInvoice.BALANCE_AMT || 0).toFixed(2)}</span>
                    </div>
                 </div>

                 {/* SPECIFIC INVOICE HISTORY */}
                 {savedTransactions.filter(tx => tx.DOC_NO === selectedInvoice.INVOICE_NO).length > 0 && (
                   <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <h4 className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <CheckCircle2 size={11} className="text-emerald-500" />
                        Invoice Payments
                      </h4>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {savedTransactions
                          .filter(tx => tx.DOC_NO === selectedInvoice.INVOICE_NO)
                          .map((tx, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100/50 dark:border-zinc-800/50">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-extrabold text-zinc-700 dark:text-zinc-300">
                                  {new Date(tx.ENTRY_DATE).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="text-[8px] text-zinc-400 dark:text-zinc-500 truncate w-24 font-bold uppercase">{tx['FROM ACC']}</span>
                              </div>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">SAR {Number(tx.PAY_AMOUNT).toFixed(2)}</span>
                            </div>
                          ))}
                      </div>
                   </div>
                 )}

                 {/* Overpayment Warning */}
                 {formData.paymentAmount && Number(formData.paymentAmount) > Number(selectedInvoice.BALANCE_AMT) && (
                   <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start gap-2 animate-pulse">
                     <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                     <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 leading-tight">
                       WARNING: The entered amount (SAR {formData.paymentAmount}) exceeds the remaining balance (SAR {Number(selectedInvoice.BALANCE_AMT).toFixed(2)}).
                     </p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Grid Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {t('recentTransactions')}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('paidDate')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Doc No</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">From Acc</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">To Acc</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">{t('paidAmount')}</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Type</th>
                  <th className="px-6 py-3.5 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 text-xs">
                {savedTransactions.map(tx => (
                  <tr key={tx.ID} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-black text-indigo-600 dark:text-indigo-400">#{tx.ID}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-semibold">
                      {new Date(tx.ENTRY_DATE).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-black text-zinc-800 dark:text-zinc-100">#{tx.DOC_NO}</td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-zinc-700 dark:text-zinc-200">{tx['FROM ACC']}</div>
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">{tx.PAY_FROM_ACC}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-zinc-700 dark:text-zinc-200">{tx.TO_ACC}</div>
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">{tx.PAY_TO_ACC}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      SAR {Number(tx.PAY_AMOUNT).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 truncate max-w-[150px] font-medium" title={tx.DESCRIPTION}>
                      {tx.DESCRIPTION || <span className="text-zinc-300 dark:text-zinc-700 italic font-normal">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {tx.RETURN_INVOICE ? (
                        <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-wider border border-rose-100/50 dark:border-rose-900/30">
                          Return
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100/50 dark:border-emerald-900/30">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleEdit(tx)}
                        className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all active:scale-95"
                        title="Edit Transaction"
                      >
                        <Pencil size={14} strokeWidth={2.2} />
                      </button>
                    </td>
                  </tr>
                ))}
                {savedTransactions.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 italic font-semibold">
                      No transactions found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
