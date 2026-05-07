import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Wallet, Search, CheckCircle2, FileText, Calendar, Building, CreditCard, Save, Globe, ShieldAlert, ShieldCheck, ShieldOff, Lock, Pencil, MapPin, Printer, Plus, TrendingUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import SearchableDropdown from '../components/SearchableDropdown';

export default function EmployeeSalaryEntryPage({ setActivePage, user }) {
  const { t, language } = useLanguage();
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [payableAccounts, setPayableAccounts] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [vatAccounts, setVatAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
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
        
        const [typesRes, accountsRes, costCentersRes, currenciesRes, privRes, historyRes] = await Promise.all([
          fetch(API_ENDPOINTS.SALARY_ENTRY_TYPES, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.EXPENSE_ENTRY_ACCOUNTS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_COST_CENTERS, { headers }).then(res => res.json()),
          fetch(API_ENDPOINTS.RECEIVABLE_CURRENCIES, { headers }).then(res => res.json()),
          fetch(`${API_ENDPOINTS.BASE_URL}/api/privileges/101?username=${encodeURIComponent(username)}`, { headers }).then(res => res.json()), // Adjust privilege ID if needed
          fetch(API_ENDPOINTS.SALARY_ENTRY_HISTORY, { headers }).then(res => res.json())
        ]);

        setExpenseTypes(typesRes || []);
        if (accountsRes) {
          setExpenseAccounts(accountsRes.expenseAccounts || []);
          setPayableAccounts(accountsRes.payableAccounts || []);
          setCashAccounts(accountsRes.cashAccounts || []);
          setVatAccounts(accountsRes.vatAccounts || []);
        }
        setCostCenters(costCentersRes || []);
        setCurrencies(currenciesRes || []);
        setPrivileges(privRes);
        setSavedTransactions(Array.isArray(historyRes) ? historyRes : []);
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
        const acc = cashAccounts.find(a => a.acc_no.toString() === value);
        newData.ACC_NAME1 = acc ? acc.acc_name : '';
      }
      
      if (name === 'PAY_TO_ACC') {
        // We will resolve the final ACC_NAME2 right before saving
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

    let finalPayToAcc = formData.PAY_TO_ACC;
    let finalAccName2 = '';
    const payableAcc = payableAccounts.find(a => a.acc_no.toString() === finalPayToAcc);
    finalAccName2 = payableAcc ? payableAcc.acc_name : '';

    let finalPayFromAc = formData.PAY_FROM_ACC;
    let finalAccName1 = '';
    const cashAcc = cashAccounts.find(a => a.acc_no.toString() === finalPayFromAc);
    finalAccName1 = cashAcc ? cashAcc.acc_name : '';

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        PAY_TO_ACC: finalPayToAcc,
        ACC_NAME2: finalAccName2,
        ACC_NAME1: finalAccName1,
        PAY_AMOUNT: parseFloat(formData.paymentAmount) || 0,
        USER_ID: user?.userid || 1
      };

      const response = await fetch(API_ENDPOINTS.SALARY_ENTRY_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (resData.success) {
        setLastSavedId(resData.transactionId);
        const historyRes = await fetch(API_ENDPOINTS.SALARY_ENTRY_HISTORY).then(r => r.json());
        setSavedTransactions(historyRes || []);
        alert(activeEditId ? 'Expense updated successfully!' : 'Expense saved successfully!');
        if (!activeEditId) resetForm();
      } else {
        alert('Error: ' + resData.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tx) => {
    setActiveEditId(tx.ID);
    
    // Determine if PAY_TO_ACC was a Payable Account
    const isPayableAcc = payableAccounts.some(a => a.acc_no.toString() === tx.PAY_TO_ACC?.toString());
    
    setFormData({
      ID: tx.ID,
      ENTRY_DATE: tx.ENTRY_DATE.split('T')[0],
      DOC_NO: tx.DOC_NO || '',
      DOC_TRN_TYPE: tx.DOC_TRN_TYPE || '',
      PAY_FROM_ACC: tx.PAY_FROM_ACC?.toString() || '',
      PAY_TO_ACC: tx.PAY_TO_ACC?.toString() || '',
      DESCRIPTION: tx.DESCRIPTION || '',
      PAY_AMOUNT: tx.PAY_AMOUNT,
      paymentAmount: tx.PAY_AMOUNT?.toString() || '',
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
          <title>Expense Voucher - ${tx.DOC_NO}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #rose-600; margin-bottom: 30px; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #e11d48; text-transform: uppercase; letter-spacing: 2px; }
            .header p { margin: 5px 0; font-weight: bold; color: #666; }
            .voucher-info { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f9fafb; padding: 15px; border-radius: 8px; }
            .details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .details th, .details td { border: 1px solid #e5e7eb; padding: 12px 15px; text-align: left; }
            .details th { background-color: #f3f4f6; font-weight: bold; width: 30%; color: #4b5563; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; }
            .signature { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px; font-weight: bold; font-size: 0.9em; }
            .amount-box { background: #e11d48; color: white; padding: 10px 20px; border-radius: 6px; display: inline-block; font-size: 1.2em; font-weight: bold; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EazyERP Solutions</h1>
            <p>EXPENSE VOUCHER</p>
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
            <tr><th>Expense Account</th><td>${tx['FROM ACC']} (${tx.PAY_FROM_ACC})</td></tr>
            <tr><th>Pay To Account</th><td>${tx.TO_ACC} (${tx.PAY_TO_ACC})</td></tr>
            <tr><th>Description / Narration</th><td>${tx.DESCRIPTION || 'N/A'}</td></tr>
            <tr><th>Reference No</th><td>${tx.REF_NO || 'N/A'}</td></tr>
            <tr><th>VAT Account</th><td>${tx.VAT_ACCOUNT || 'N/A'}</td></tr>
            <tr><th>VAT Amount</th><td>SAR ${Number(tx.VAT_AMOUNT || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
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
            <button onclick="window.print()" style="padding: 10px 30px; background: #e11d48; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Click to Print</button>
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 dark:border-rose-400 border-t-transparent shadow-sm"></div>
          <p className="text-xs font-black text-rose-600 dark:text-rose-400 animate-pulse uppercase tracking-widest">{t('loading')}</p>
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
          <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs mt-1 leading-relaxed">You do not have permission to view Employee Salary Entry. Please contact your system administrator.</p>
          <button 
            onClick={() => setActivePage('dashboard')}
            className="mt-5 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white dark:text-rose-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
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
            <div className="p-3 bg-rose-500 dark:bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-500/20">
              <Wallet size={24} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase">
                Employee Salary Entry
              </h1>
              <p className="text-rose-500 dark:text-rose-400 text-xs font-bold uppercase tracking-widest mt-1">
                {activeEditId ? `Editing Salary #${activeEditId}` : 'Record Employee Salaries'}
              </p>
            </div>
<<<<<<< HEAD
=======
            Emp. Salary Pay
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">
            {activeEditId ? `Editing Salary #${activeEditId}` : 'Record Employee Salaries'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={resetForm}
            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-border"
            title="New Transaction"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {/* Entry Form */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
              <Pencil size={11} className="text-rose-500" />
              Salary Details
            </h3>
            {activeEditId && (
              <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full uppercase">Edit Mode</span>
            )}
>>>>>>> 927ced4 (6 may)
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={resetForm}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/10 hover:shadow-rose-600/20 active:scale-95"
              title="New Transaction"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Salary
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Entry Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between">
              <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                <Pencil size={14} className="text-rose-500 dark:text-rose-400" />
                Salary Details Form
              </h3>
              {activeEditId && (
                <span className="text-[9px] font-black bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full uppercase tracking-wider border border-rose-200/50 dark:border-rose-800/50 animate-pulse">Edit Mode</span>
              )}
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-5 gap-y-3.5">
                
                {/* Entry Date */}
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{t('paidDate')}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                    <input
                      type="date"
                      name="ENTRY_DATE"
                      value={formData.ENTRY_DATE}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner"
                      required
                    />
                  </div>
                </div>

                {/* Salary Type */}
                <SearchableDropdown
                  label="Salary Type"
                  name="DOC_TRN_TYPE"
                  value={formData.DOC_TRN_TYPE}
                  onChange={handleInputChange}
                  options={expenseTypes.map(vt => ({
                    id: vt.id,
                    label: language === 'ar' ? (vt.type_aname || vt.type_name) : vt.type_name,
                    subLabel: vt.id.toString()
                  }))}
                  placeholder="-- Select Type --"
                  icon={FileText}
                  themeColor="rose"
                  required
                />

                {/* Entry Number */}
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Entry Number</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
                    <input
                      type="text"
                      name="DOC_NO"
                      value={formData.DOC_NO}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner"
                      placeholder="Auto/Manual Entry No"
                    />
                  </div>
                </div>

                {/* Total Paid Amount */}
                <div className="space-y-1 col-span-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Total Amount</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-rose-50 dark:bg-rose-950/40 text-[10px] font-black text-rose-600 dark:text-rose-400 px-2 py-1 rounded-md border border-rose-200/50 dark:border-rose-800/50">SAR</div>
                    <input
                      type="number"
                      step="0.01"
                      name="paymentAmount"
                      value={formData.paymentAmount}
                      onChange={handleInputChange}
                      className="w-full pl-16 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-black text-rose-600 dark:text-rose-400 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Accounts Section */}
                <div className="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3.5 p-4 bg-zinc-50/50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 transition-colors">
                  
                  {/* Paying From (Cash/Bank) */}
                  <SearchableDropdown
                    label="Paying From (Cash/Bank)"
                    name="PAY_FROM_ACC"
                    value={formData.PAY_FROM_ACC}
                    onChange={handleInputChange}
                    options={cashAccounts.map(acc => ({
                      id: acc.acc_no.toString(),
                      label: language === 'ar' ? (acc.acc_aname || acc.acc_name) : acc.acc_name,
                      subLabel: acc.acc_no.toString()
                    }))}
                    placeholder="-- Select Cash/Bank Account --"
                    icon={CreditCard}
                    themeColor="rose"
                    required
                  />

                  {/* Employee Account (To) */}
                  <SearchableDropdown
                    label="Employee/Payable Acc (To)"
                    name="PAY_TO_ACC"
                    value={formData.PAY_TO_ACC}
                    onChange={handleInputChange}
                    options={payableAccounts.map(acc => ({
                      id: acc.acc_no.toString(),
                      label: language === 'ar' ? (acc.acc_aname || acc.acc_name) : acc.acc_name,
                      subLabel: acc.acc_no.toString()
                    }))}
                    placeholder="-- Select Employee Account --"
                    icon={Building}
                    themeColor="rose"
                    required
                  />

                </div>

                {/* Settings Fields */}
                <div className="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-3.5">
                  
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
                    themeColor="rose"
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
                    themeColor="rose"
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
                        className="w-full pl-11 pr-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                </div>

                {/* Description */}
                <div className="col-span-1 md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{t('description')}</label>
                  <textarea
                    name="DESCRIPTION"
                    value={formData.DESCRIPTION}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner resize-none"
                    placeholder="Notes..."
                  ></textarea>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/15 hover:shadow-rose-600/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
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
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200/50 dark:border-zinc-800/50'
                      : 'bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-200 shadow-zinc-900/10 hover:shadow-zinc-900/20 active:scale-[0.98]'
                  }`}
                >
                  <Printer size={16} strokeWidth={2.2} />
                  {t('print')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Grid Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-300">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-center justify-between">
            <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
              {t('recentTransactions')}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800/80">
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t('paidDate')}</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Doc No</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Paying From Acc</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Employee Acc</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">{t('paidAmount')}</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {savedTransactions.map(tx => (
                  <tr key={tx.ID} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/40 transition-colors duration-200">
                    <td className="px-6 py-3.5 font-bold text-rose-600 dark:text-rose-400">#{tx.ID}</td>
                    <td className="px-6 py-3.5 text-zinc-500 dark:text-zinc-400">{new Date(tx.ENTRY_DATE).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 font-black text-zinc-900 dark:text-zinc-100">{tx.DOC_NO || <span className="italic opacity-40">N/A</span>}</td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{tx['FROM ACC']}</div>
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Acc: {tx.PAY_FROM_ACC}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{tx.TO_ACC}</div>
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">Acc: {tx.PAY_TO_ACC}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-rose-600 dark:text-rose-400">SAR {Number(tx.PAY_AMOUNT).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-3.5 text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]" title={tx.DESCRIPTION}>{tx.DESCRIPTION || <span className="italic opacity-40">No description</span>}</td>
                    <td className="px-6 py-3.5 text-center">
                      <button 
                        onClick={() => handleEdit(tx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                        title="Edit Transaction"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {savedTransactions.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 italic font-semibold">No transactions found for this period</td>
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
