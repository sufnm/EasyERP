import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

const ACCOUNTS = [
  'CASH_AC_TYPE', 'EMP_AC_TYPE', 'EXP_AC_TYPE', 'CUS_AC_TYPE', 'SUP_AC_TYPE', 
  'BRN_AC_TYPE', 'AST_AC_TYPE', 'ISSUE_AC_TYPE', 'ADDSTOCK_AC_TYPE', 'PAYABLE_AC_TYPE', 'VAT_AC_TYPE',
  'EXP_ACC', 'OP_BAL_AC', 'OPENING_STOCK_AC', 'DISCOUNT_AC', 'CASH_SALE_AC', 'CASH_PUR_AC', 
  'COST_ITEM_AC', 'DEF_CASH_AC', 'stock_ac', 'PROD_AC_NO', 'DAMAGE_AC_NO', 'EXP_ITEM_AC', 
  'SALARY_AC', 'ASSET_OB', 'VAT_AC_NO', 'SALARY_PAID_AC', 'RECEIVABLE_ACC', 'PAYABLE_ACC', 
  'EMPLOYEES_ACC', 'def_credit_ac', 'EXPENSE_ACC'
];

const SETTINGS = [
  'MAX_LEN_ITEMCODE', 'BANK_NOS', 'RAW_ITM_CAT', 'ACC_DEF_LEVEL', 'LAST_ITM_NO', 
  'ZATCA_ENV_ID', 'ZATCA_ENV_TYPE', 'VAT_PERCENT', 'EXP_PAIDTO_TYPE', 'SHOW_COST', 
  'SHOW_DEPT', 'MULTI_BRANCH', 'SHOW_REMOTE'
];

const TOGGLES = [
  'auto_search', 'CUS_BYMOBILE', 'auto_focus_save', 'SHOW_CASH_ONCR', 'PRICE_INCLUDE_VAT', 
  'ITM_AUTO_NUMBER', 'OSTOCK_AC_ENTRY', 'EDIT_RESTRICTED', 'auto_number', 'COST_WITH_VAT'
];

export default function ApplicationSetupPage() {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSetup = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.APPLICATION_SETUP);
      const data = await res.json();
      if (data.success && data.data) {
        setFormData(data.data);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetup();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(API_ENDPOINTS.APPLICATION_SETUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Application setup saved successfully!');
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save setup');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (field) => {
    const isToggle = TOGGLES.includes(field);
    const value = formData[field] ?? (isToggle ? false : '');
    
    if (isToggle) {
      return (
        <label key={field} className="flex items-center justify-between p-1.5 bg-zinc-50 dark:bg-zinc-800/40 rounded border border-zinc-200 dark:border-zinc-700/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 truncate mr-2" title={field}>{field}</span>
          <input 
            type="checkbox" 
            checked={value === true || value === 1} 
            onChange={(e) => handleChange(field, e.target.checked ? 1 : 0)}
            className="w-3.5 h-3.5 rounded text-indigo-600 bg-zinc-100 border-zinc-300 focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600 cursor-pointer"
          />
        </label>
      );
    }

    return (
      <div key={field} className="flex flex-col gap-0.5">
        <label className="text-[9px] font-black uppercase text-zinc-500 tracking-wider truncate" title={field}>{field.replace(/_/g, ' ')}</label>
        <input 
          type="text"
          value={value}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full h-7 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-800 dark:text-zinc-200 font-medium"
        />
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter">Application Setup</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Global configuration (AC_OPTIONS)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchSetup} className="p-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save size={12} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading && Object.keys(formData).length === 0 ? (
          <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-zinc-400" /></div>
        ) : (
          <div className="space-y-4 max-w-7xl mx-auto pb-10">
            {/* Accounts Section */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-zinc-100/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Account & Type Configurations</h3>
              </div>
              <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {ACCOUNTS.map(renderInput)}
              </div>
            </div>

            {/* Settings & ZATCA */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-zinc-100/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Settings & ZATCA</h3>
              </div>
              <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {SETTINGS.map(renderInput)}
              </div>
            </div>

            {/* Toggles */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-zinc-100/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">System Toggles</h3>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {TOGGLES.map(renderInput)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
