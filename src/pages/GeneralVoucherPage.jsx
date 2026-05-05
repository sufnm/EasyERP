import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Wallet, Search, CheckCircle2, FileText, Calendar, Building, CreditCard, Save, Globe, ShieldAlert, ShieldCheck, ShieldOff, Lock, Pencil, MapPin, Printer, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function GeneralVoucherPage({ setActivePage, user }) {
  const { t, language } = useLanguage();
  const [voucherTypes, setVoucherTypes] = useState([]);
  const [generalAccounts, setGeneralAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedTransactions, setSavedTransactions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeEditId, setActiveEditId] = useState(null);
  const [lastSavedId, setLastSavedId] = useState(null);
  const [privileges, setPrivileges] = useState({ canInsert: true, canUpdate: true, canDelete: true, canView: true });

  const [formData, setFormData] = useState({
    ID: null,
    ENTRY_DATE: new Date().toISOString().split('T')[0],
    DOC_NO: '',
    DOC_TRN_TYPE: '',
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = user?.username || 'admin';
        const headers = { 'Accept-Language': language };
        
        const [typesRes, accountsRes, costCentersRes, currenciesRes, privRes, historyRes, branchesRes] = await Promise.all([
          fetch(API_ENDPOINTS.GENERAL_VOUCHER_TYPES, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.GENERAL_VOUCHER_ACCOUNTS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_COST_CENTERS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_CURRENCIES, { headers }).then(res => res.json()),
          fetch(`${API_ENDPOINTS.BASE_URL}/api/privileges/101?username=${encodeURIComponent(username)}`, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.GENERAL_VOUCHER_HISTORY, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.BRANCHES, { headers }).then(res => res.json())
        ]);

        setVoucherTypes(typesRes || []);
        setGeneralAccounts(accountsRes || []);
        setCostCenters(costCentersRes || []);
        setCurrencies(currenciesRes || []);
        setPrivileges(privRes);
        setSavedTransactions(historyRes || []);
        setBranches(branchesRes || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, [user, language]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: val };
      
      // Auto-fill account names for labels if IDs change
      if (name === 'PAY_FROM_ACC') {
        const acc = generalAccounts.find(a => a.acc_no.toString() === value);
        newData.ACC_NAME1 = acc ? acc.acc_name : '';
      }
      if (name === 'PAY_TO_ACC') {
        const acc = generalAccounts.find(a => a.acc_no.toString() === value);
        newData.ACC_NAME2 = acc ? acc.acc_name : '';
      }
      if (name === 'CURRENCY') {
        const curr = currencies.find(c => c.Currency_No.toString() === value);
        newData.CURRENCY_RATE = curr ? curr.Currency_Rate.toString() : '1';
      }
      
      return newData;
    });
  };

  const resetForm = () => {
    setFormData({
      ID: null,
      ENTRY_DATE: new Date().toISOString().split('T')[0],
      DOC_NO: '',
      DOC_TRN_TYPE: '',
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
        USER_ID: user?.userid || 1
      };

      const response = await fetch(API_ENDPOINTS.GENERAL_VOUCHER_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.success) {
        setLastSavedId(resData.transactionId);
        // Refresh history
        const historyRes = await fetch(API_ENDPOINTS.GENERAL_VOUCHER_HISTORY).then(r => r.json());
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
      DOC_NO: tx.DOC_NO || '',
      DOC_TRN_TYPE: tx.DOC_TRN_TYPE || '',
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
          <title>General Voucher - ${tx.DOC_NO}</title>
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
            <p>GENERAL VOUCHER</p>
          </div>
          <div class="voucher-info">
            <div>
              <p><strong>Voucher ID:</strong> ${tx.ID}</p>
              <p><strong>Date:</strong> ${new Date(tx.ENTRY_DATE).toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>Document No:</strong> ${tx.DOC_NO || 'N/A'}</p>
              <p><strong>Branch:</strong> ${tx.BRN_CODE}</p>
            </div>
          </div>
          <table class="details">
            <tr><th>From Account</th><td>${tx['FROM ACC']} (${tx.PAY_FROM_ACC})</td></tr>
            <tr><th>To Account</th><td>${tx.TO_ACC} (${tx.PAY_TO_ACC})</td></tr>
            <tr><th>Description / Narration</th><td>${tx.DESCRIPTION || 'N/A'}</td></tr>
            <tr><th>Reference No</th><td>${tx.REF_NO || 'N/A'}</td></tr>
            <tr><th>Cost Center</th><td>${tx.COST_CENTER || 'Main'}</td></tr>
            <tr><th>Currency</th><td>${tx.CURRENCY === 1 ? 'SAR' : 'USD'} (Rate: ${tx.CURRENCY_RATE})</td></tr>
          </table>
          <div style="text-align: right; margin-top: 20px;">
            <p style="margin-bottom: 5px; font-weight: bold; color: #666;">Total Amount:</p>
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
      <div className="flex h-full items-center justify-center bg-zinc-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-black text-indigo-600 animate-pulse uppercase tracking-widest">{t('loading')}</p>
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
          <p className="text-zinc-500 font-medium text-sm">You do not have permission to view General Voucher.</p>
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
    <div className={`flex flex-col h-full p-4 bg-zinc-50/30 max-w-5xl mx-auto w-full ${language === 'ar' ? 'rtl font-arabic' : ''}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Wallet size={20} strokeWidth={2.5} />
            </div>
            {t('generalVoucherEntry') || 'General Voucher'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            {activeEditId ? `Editing Transaction #${activeEditId}` : 'Financial Transfer Management'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={resetForm}
            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-border"
            title="New Transaction"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Entry Form */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
              <Pencil size={13} className="text-indigo-500" />
              {t('transactionEntry')}
            </h3>
            {activeEditId && (
              <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">Edit Mode</span>
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
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Voucher Type</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <select
                    name="DOC_TRN_TYPE"
                    value={formData.DOC_TRN_TYPE}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  >
                    <option value="">-- Select Type --</option>
                    {voucherTypes.map(vt => (
                      <option key={vt.id} value={vt.id}>
                        {language === 'ar' ? (vt.type_aname || vt.type_name) : vt.type_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payFrom')}</label>
                  <select
                    name="PAY_FROM_ACC"
                    value={formData.PAY_FROM_ACC}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none appearance-none"
                    required
                  >
                    <option value="">-- {t('selectAccount')} --</option>
                    {generalAccounts.map(acc => (
                      <option key={acc.acc_no} value={acc.acc_no.toString()}>{acc.acc_no} - {language === 'ar' ? (acc.acc_aname || acc.acc_name) : acc.acc_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('payTo')}</label>
                  <select
                    name="PAY_TO_ACC"
                    value={formData.PAY_TO_ACC}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none appearance-none"
                    required
                  >
                    <option value="">-- {t('selectAccount')} --</option>
                    {generalAccounts.map(acc => (
                      <option key={acc.acc_no} value={acc.acc_no.toString()}>{acc.acc_no} - {language === 'ar' ? (acc.acc_aname || acc.acc_name) : acc.acc_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Document No</label>
                <div className="relative">
                  <input
                    type="text"
                    name="DOC_NO"
                    value={formData.DOC_NO}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Auto or Manual Doc No"
                  />
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
                    className="w-full pl-10 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Notes about this transaction..."
                ></textarea>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
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
      </div>

      {/* Grid Table */}
      <div className="mt-4 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-500" />
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
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">From Acc</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">To Acc</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">{t('paidAmount')}</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {savedTransactions.map(tx => (
                <tr key={tx.ID} className="border-b border-border hover:bg-zinc-50/50 transition-colors">
                  <td className="px-4 py-2 font-bold text-indigo-600">{tx.ID}</td>
                  <td className="px-4 py-2 text-zinc-600">{new Date(tx.ENTRY_DATE).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-black text-zinc-800">{tx.DOC_NO}</td>
                  <td className="px-4 py-2 text-zinc-600">
                    <div className="font-bold">{tx['FROM ACC']}</div>
                    <div className="text-[9px] text-zinc-400">{tx.PAY_FROM_ACC}</div>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">
                    <div className="font-bold">{tx.TO_ACC}</div>
                    <div className="text-[9px] text-zinc-400">{tx.PAY_TO_ACC}</div>
                  </td>
                  <td className="px-4 py-2 text-right font-black text-emerald-600">{Number(tx.PAY_AMOUNT).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-4 py-2 text-zinc-500 truncate max-w-[150px]">{tx.DESCRIPTION}</td>
                  <td className="px-4 py-2 text-center">
                    <button 
                      onClick={() => handleEdit(tx)}
                      className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {savedTransactions.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-zinc-400 italic">No transactions found for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
