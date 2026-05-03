import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Wallet, Search, CheckCircle2, FileText, Calendar, Building, CreditCard, Save, Globe, ShieldAlert, ShieldCheck, ShieldOff, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function CustomerReceivablePage({ setActivePage, user }) {
  const { t, language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [accountsInfo, setAccountsInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedTransactions, setSavedTransactions] = useState([]);
  const [returnInvoice, setReturnInvoice] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  // Privileges
  const [privileges, setPrivileges] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    selectedInvoiceNo: '',
    paymentAmount: '',
    currency: '1',
    currencyRate: '1.00',
    payFromAcc: '',
    paidToAcc: '',
    description: '',
    costCenter: '',
    entryNumber: ''
  });

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Fetch invoices when returnInvoice flag changes
  // Fetch recent history
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/receivable/history');
      const data = await res.json();
      setSavedTransactions(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchInvoices = async (isReturn) => {
    setInvoicesLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/receivable/invoices?returnInvoice=${isReturn}`);
      const data = await res.json();
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = user?.username || '';
        const [invoicesRes, cashAccountsRes, costCentersRes, currenciesRes, privRes, accountsInfoRes, historyRes] = await Promise.all([
          fetch(`http://localhost:3000/api/receivable/invoices?returnInvoice=false`).then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/cash-accounts').then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/cost-centers').then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/currencies').then(res => res.json()),
          fetch(`http://localhost:3000/api/privileges/100?username=${encodeURIComponent(username)}`).then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/accounts-info').then(res => res.json()),
          fetch('http://localhost:3000/api/receivable/history').then(res => res.json())
        ]);
        
        setInvoices(invoicesRes || []);
        setCashAccounts(cashAccountsRes || []);
        setCostCenters(costCentersRes || []);
        setCurrencies(currenciesRes || []);
        setPrivileges(privRes);
        setAccountsInfo(accountsInfoRes || []);
        setSavedTransactions(historyRes || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        // On connection error — don't deny access (backend may still be starting up)
        setPrivileges({ canInsert: true, canUpdate: true, canDelete: true, canView: true, isSuperUser: false });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReturnInvoiceToggle = (e) => {
    const checked = e.target.checked;
    setReturnInvoice(checked);
    // Reset selected invoice when switching modes
    setSelectedInvoice(null);
    setFormData(prev => ({ ...prev, selectedInvoiceNo: '', paymentAmount: '' }));
    fetchInvoices(checked);
  };

  const handleInvoiceSelect = (e) => {
    const invNo = e.target.value;
    const invoice = invoices.find(inv => inv.INVOICE_NO === invNo);
    
    const currNo = invoice?.CURRENCY?.toString() || '1';
    const currObj = currencies.find(c => c.Currency_No.toString() === currNo);

    setFormData(prev => ({
      ...prev,
      selectedInvoiceNo: invNo,
      paymentAmount: invoice ? invoice.BALANCE_AMT || '' : '',
      currency: currNo,
      currencyRate: currObj ? currObj.Currency_Rate?.toString() : '1.00',
      payFromAcc: invoice ? String(invoice.ACCODE) : prev.payFromAcc  // auto-fill from invoice ACCODE
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
        DOC_NO: selectedInvoice?.INVOICE_NO || '',
        DOC_TRN_TYPE: selectedInvoice?.TRN_TYPE || 6,
        TRN_TYPE: 100,
        PAY_FROM_ACC: formData.payFromAcc,
        PAY_TO_ACC: formData.paidToAcc,
        DESCRIPTION: formData.description,
        PAY_AMOUNT: formData.paymentAmount,
        USER_ID: user?.userid || 1,
        CURRENCY_NO: formData.currency,
        CURRENCY_RATE: formData.currencyRate,
        IS_RETURN: returnInvoice
      };

      const res = await fetch('http://localhost:3000/api/receivable/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save receivable');

      const data = await res.json();
      
      // Refresh history and invoices
      await Promise.all([
        fetchHistory(),
        fetchInvoices(returnInvoice)
      ]);

      // Reset Form slightly but keep the generated entry number visible
      setFormData(prev => ({
        ...prev,
        selectedInvoiceNo: '',
        paymentAmount: '',
        description: '',
        costCenter: '',
        entryNumber: data.transactionId
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

  // Access Denied screen
  if (privileges && !privileges.canView) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="p-5 bg-rose-100 dark:bg-rose-900/20 rounded-full">
          <ShieldOff size={40} className="text-rose-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 mb-1">Access Denied</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            You do not have permission to view <span className="font-bold text-zinc-700 dark:text-zinc-300">Customer Receivable</span>.
          </p>
          <p className="text-xs text-zinc-400 mt-1">Contact your administrator to request access.</p>
        </div>
        <button
          onClick={() => setActivePage('home')}
          className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-lg transition-colors"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header - compact */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 mb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 rounded-xl shadow-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 ${language === 'ar' ? 'order-2' : ''}`}>
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-800 dark:text-zinc-100 tracking-tight">{t('customerReceivable')}</h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">{t('dashboard')} / {t('customerReceivable')}</p>
          </div>
        </div>
        
        {/* Privilege Badges */}
        {privileges && (
          <div className="flex items-center gap-1.5">
            {privileges.isSuperUser ? (
              <span
                title="Super User — all privileges bypassed"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 shadow-sm"
              >
                <ShieldCheck size={10} />
                Super User
              </span>
            ) : (
              [
                { label: 'View',   allowed: privileges.canView,   color: 'indigo' },
                { label: 'Insert', allowed: privileges.canInsert, color: 'emerald' },
                { label: 'Update', allowed: privileges.canUpdate, color: 'amber' },
                { label: 'Delete', allowed: privileges.canDelete, color: 'rose' },
              ].map(({ label, allowed, color }) => (
                <span
                  key={label}
                  title={`${label}: ${allowed ? 'Allowed' : 'Denied'}`}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                    allowed
                      ? color === 'indigo'  ? 'bg-indigo-50  dark:bg-indigo-900/20 text-indigo-600  border-indigo-200  dark:border-indigo-700'
                      : color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-700'
                      : color === 'amber'   ? 'bg-amber-50   dark:bg-amber-900/20  text-amber-600   border-amber-200   dark:border-amber-700'
                      :                      'bg-rose-50    dark:bg-rose-900/20   text-rose-600    border-rose-200    dark:border-rose-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700 line-through opacity-60'
                  }`}
                >
                  {allowed ? <ShieldCheck size={9} /> : <Lock size={9} />}
                  {label}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Left Column - Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-card p-3 rounded-xl border border-border shadow-sm">
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Entry Number (Read Only) */}
              <div className="col-span-2 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('entryNumber')}</label>
                <div className="relative">
                  <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
                  <input
                    type="text"
                    value={formData.entryNumber || t('autoGeneratedOnSave')}
                    readOnly
                    className="w-full pl-7 pr-2 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none text-xs font-bold text-zinc-600 dark:text-zinc-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Entry Date */}
              <div className="col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('entryDate')}</label>
                <div className="relative">
                  <Calendar className={`absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-zinc-400`} size={13} />
                  <input
                    type="date"
                    name="entryDate"
                    value={formData.entryDate}
                    onChange={handleInputChange}
                    className={`w-full ${language === 'ar' ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2 text-left'} py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium`}
                    required
                  />
                </div>
              </div>

              {/* Select Invoice + Return Invoice Checkbox */}
              <div className="col-span-2 md:col-span-2">
                <div className={`flex items-center justify-between mb-0.5 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{returnInvoice ? t('returnInvoice') : t('invoiceNo')}</label>
                  {/* Return Invoice Checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        id="returnInvoiceCheck"
                        checked={returnInvoice}
                        onChange={handleReturnInvoiceToggle}
                        className="sr-only"
                      />
                      <div className={`w-8 h-4 rounded-full transition-all duration-300 ${
                        returnInvoice ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-600'
                      }`}></div>
                      <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-300 ${
                        returnInvoice ? 'translate-x-4' : 'translate-x-0'
                      }`}></div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      returnInvoice ? 'text-rose-500' : 'text-zinc-400'
                    }`}>{t('returnInvoice')}</span>
                  </label>
                </div>
                <div className="relative">
                  <FileText className={`absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-zinc-400`} size={13} />
                  {invoicesLoading ? (
                    <div className={`w-full ${language === 'ar' ? 'pr-7 pl-2 flex-row-reverse' : 'pl-7 pr-2'} py-1.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center gap-2`}>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-500"></div>
                      <span className="text-xs text-zinc-400">{t('loading')}</span>
                    </div>
                  ) : (
                    <select
                      name="selectedInvoiceNo"
                      value={formData.selectedInvoiceNo}
                      onChange={handleInvoiceSelect}
                      className={`w-full ${language === 'ar' ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2 text-left'} py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border rounded-lg focus:ring-1 focus:outline-none transition-all text-xs font-medium appearance-none ${
                        returnInvoice
                          ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-400 focus:border-rose-400'
                          : 'border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    >
                      <option value="">{returnInvoice ? t('selectReturnInvoice') : t('selectInvoice')}</option>
                      {invoices.map(inv => (
                        <option key={inv.INVOICE_NO} value={inv.INVOICE_NO}>
                          {inv.INVOICE_NO} - {inv.ENAME} (Bal: {inv.BALANCE_AMT})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('currency')}</label>
                <div className="relative">
                  <span className={`absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-zinc-400`} size={13}><Globe size={13} /></span>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className={`w-full ${language === 'ar' ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2 text-left'} py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none`}
                    required
                  >
                    <option value="">-- {t('search')} --</option>
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('rate')}</label>
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

              <div className="col-span-2 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payFrom')}</label>
                <div className="relative">
                  <Building className={`absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-zinc-400`} size={13} />
                  <select
                    name="payFromAcc"
                    value={formData.payFromAcc}
                    onChange={handleInputChange}
                    className={`w-full ${language === 'ar' ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2 text-left'} py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none`}
                    required
                  >
                    <option value="">-- {t('selectAccount')} --</option>
                    {accountsInfo.map(acc => (
                      <option key={acc.ACC_NO} value={acc.ACC_NO}>
                        {acc.ACC_NO} - {acc.ACC_NAME}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('paidAmount')}</label>
                <div className="relative">
                  <span className={`absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold`}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    name="paymentAmount"
                    value={formData.paymentAmount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className={`w-full ${language === 'ar' ? 'pr-6 pl-2 text-right' : 'pl-6 pr-2 text-left'} py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-bold text-indigo-600 dark:text-indigo-400`}
                    required
                  />
                </div>
              </div>

              {/* Paid To AC */}
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payTo')}</label>
                <div className="relative">
                  <CreditCard className={`absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-zinc-400`} size={13} />
                  <select
                    name="paidToAcc"
                    value={formData.paidToAcc}
                    onChange={handleInputChange}
                    className={`w-full ${language === 'ar' ? 'pr-7 pl-2 text-right' : 'pl-7 pr-2 text-left'} py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium appearance-none`}
                    required
                  >
                    <option value="">-- {t('search')} --</option>
                    {cashAccounts.map(acc => (
                      <option key={acc.ACC_NO} value={acc.ACC_NO.toString()}>
                        {acc.ACC_NO} - {acc.ACC_NAME}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="col-span-2 md:col-span-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('description')}</label>
                <input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Payment remarks or reference..."
                  className={`w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium ${language === 'ar' ? 'text-right' : 'text-left'}`}
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

            <div className={`pt-2 mt-2 border-t border-border flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              {/* No-insert warning */}
              {privileges && !privileges.canInsert && (
                <span className={`flex items-center gap-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                  <Lock size={10} />
                  {language === 'ar' ? 'ليس لديك صلاحية الإضافة' : "You don't have insert permission"}
                </span>
              )}
              <div className={language === 'ar' ? 'mr-auto ml-0' : 'ml-auto'}>
                <button
                  type="submit"
                  disabled={!formData.payFromAcc || !formData.paidToAcc || !formData.paymentAmount || isSubmitting || (privileges && !privileges.canInsert)}
                  title={privileges && !privileges.canInsert ? 'Insert permission denied' : 'Save receivable entry'}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-xs"
                >
                  {privileges && !privileges.canInsert ? <Lock size={14} /> : <Save size={14} className={language === 'ar' ? 'order-2' : ''} />}
                  {isSubmitting ? t('saving') : t('saveReceivable')}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column - Selected Invoice Information */}
        <div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className={`px-3 py-2 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
               <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                 <FileText size={13} className="text-indigo-500" />
                 {t('invoiceInfo')}
               </h3>
            </div>
            
            <div className="p-3">
              {!selectedInvoice ? (
                <div className="flex flex-col items-center justify-center text-center py-6">
                   <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                     <Search className="text-zinc-400" size={18} />
                   </div>
                   <p className="text-xs font-bold text-zinc-500">{t('noInvoiceSelected')}</p>
                   <p className="text-[10px] text-zinc-400 mt-0.5">{t('selectInvoiceToView')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">{t('customer')}</p>
                    <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{selectedInvoice.ENAME}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{t('entryNo')}: {selectedInvoice.ACCODE}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{t('paidDate')}</p>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {new Date(selectedInvoice.CURDATE).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{t('netAmt')}</p>
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {Number(selectedInvoice.NET_AMOUNT).toFixed(2)}
                      </p>
                    </div>
                    <div className={`p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{t('cashPaid')}</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(selectedInvoice.CASH_PAID).toFixed(2)}
                      </p>
                    </div>
                    <div className={`p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{t('otherPaid')}</p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(selectedInvoice.OTHER_PAID).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className={`pt-2 border-t border-border flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">{t('balanceDue')}</p>
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
        <div className={`px-3 py-2 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500" />
            {t('recentTransactions')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/30 border-b border-border">
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('entryNo')}</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('invoiceNo')}</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payFrom')}</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payTo')}</th>
                <th className={`px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider ${language === 'ar' ? 'text-left' : 'text-right'}`}>{t('paidAmount')}</th>
                <th className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('paidDate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {savedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-5 text-center text-zinc-500 text-xs font-medium">
                    {t('noTransactions')}
                  </td>
                </tr>
              ) : (
                savedTransactions.map((trx, index) => (
                  <tr key={index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-3 py-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">{trx.transactionNo}</td>
                    <td className="px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">{trx.invoiceNo}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{trx.payFrom}</td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">{trx.payTo}</td>
                    <td className={`px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
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

