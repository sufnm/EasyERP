import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Settings2, Plus, Save, Edit, X } from 'lucide-react';

export default function TransactionTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingType, setEditingType] = useState(null);
  
  const defaultFormData = {
    TRN_CODE: '', TRN_NAME: '', TRN_NO: '', BRN_CODE: 1, TRN_ANAME: '',
    ACC_NO: '', ABRV: '', DRCR: 'D', DRCR1: 'D', PAYBY: '',
    INV_PREFEX: '', AUTO_POST: 1, ABRV_CODE: '', VAT_ACC: '',
    EXP_ACC: '', PIH: 0, SCREEN_NAME: ''
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [screens, setScreens] = useState([]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.TRANSACTION_TYPES);
      if (res.ok) {
        setTypes(await res.json());
      }
    } catch (err) {
      console.error("Fetch Transaction Types Error:", err);
    }
    setLoading(false);
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.ACCOUNT_ALL);
      if (res.ok) {
        setAccounts(await res.json());
      }
    } catch (err) {
      console.error("Fetch Accounts Error:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.BRANCHES);
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (err) {
      console.error("Fetch Branches Error:", err);
    }
  };

  const fetchScreens = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.SCREENS);
      if (res.ok) {
        setScreens(await res.json());
      }
    } catch (err) {
      console.error("Fetch Screens Error:", err);
    }
  };

  useEffect(() => {
    fetchTypes();
    fetchAccounts();
    fetchBranches();
    fetchScreens();
  }, []);

  const handleEdit = (type) => {
    setFormData(type);
    setEditingType(type);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    const nextCode = types.length > 0 ? Math.max(...types.map(t => parseInt(t.TRN_CODE) || 0)) + 1 : 1;
    setFormData({ ...defaultFormData, TRN_CODE: nextCode });
    setEditingType(null);
    setIsFormOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.TRN_CODE || !formData.TRN_NAME) {
      alert("Code and Name are required!");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.TRANSACTION_TYPES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchTypes();
      } else {
        alert("Failed to save transaction type");
      }
    } catch (err) {
      alert("Network error while saving");
    }
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Transaction Types</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Configure different transaction behaviors and accounts.</p>
          </div>
          {!isFormOpen && (
            <button 
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
            >
              <Plus size={18} strokeWidth={3} />
              NEW TYPE
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* Main List Table */}
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <Settings2 size={16} /> LookUp Master <span className="opacity-50">/</span> Transaction Types
              </div>
            </div>

            <div className="overflow-x-auto flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading data...</div>
              ) : types.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 font-medium">No transaction types found.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest border-b border-border">
                      <th className="p-4 w-20">Code</th>
                      <th className="p-4">Name (En)</th>
                      <th className="p-4">Name (Ar)</th>
                      <th className="p-4">Prefix</th>
                      <th className="p-4">Abrv</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {types.map((type) => (
                      <tr key={type.TRN_CODE} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{type.TRN_CODE}</td>
                        <td className="p-4 font-bold text-zinc-900 dark:text-zinc-200">{type.TRN_NAME}</td>
                        <td className="p-4 font-arabic text-zinc-700 dark:text-zinc-400" dir="rtl">{type.TRN_ANAME}</td>
                        <td className="p-4 font-mono text-xs">{type.INV_PREFEX}</td>
                        <td className="p-4 font-mono text-xs text-indigo-500">{type.ABRV}</td>
                        <td className="p-4">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${type.DRCR === 'D' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10'}`}>
                             {type.DRCR === 'D' ? 'Debit' : 'Credit'}
                           </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(type)}
                            className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Form Side Panel */}
          {isFormOpen && (
            <div className="w-[450px] flex-shrink-0 bg-card rounded-2xl border border-border shadow-2xl p-6 overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                    {editingType ? 'Edit Transaction Type' : 'New Transaction Type'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Configure transaction logic</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Code *</label>
                    <input name="TRN_CODE" type="number" value={formData.TRN_CODE} onChange={handleChange} className="input-class bg-zinc-100 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold text-indigo-600" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">TRN No</label>
                    <input name="TRN_NO" type="number" value={formData.TRN_NO} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Branch Code</label>
                    <select 
                      name="BRN_CODE" 
                      value={formData.BRN_CODE || ''} 
                      onChange={handleChange} 
                      className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select Branch</option>
                      {branches.map(br => (
                        <option key={br.Branch_Code} value={br.Branch_Code}>
                          {br.Branch_Code} - {br.Branch_Name}
                        </option>
                      ))}
                    </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Name (En) *</label>
                  <input name="TRN_NAME" value={formData.TRN_NAME} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" required />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Name (Ar)</label>
                  <input name="TRN_ANAME" value={formData.TRN_ANAME} onChange={handleChange} dir="rtl" className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-arabic" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Prefix</label>
                    <input name="INV_PREFEX" value={formData.INV_PREFEX} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Abbreviation</label>
                    <input name="ABRV" value={formData.ABRV} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">DR/CR</label>
                    <select name="DRCR" value={formData.DRCR} onChange={handleChange} className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm">
                       <option value="D">Debit</option>
                       <option value="C">Credit</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Pay By</label>
                    <input name="PAYBY" value={formData.PAYBY} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Acc No</label>
                    <select 
                      name="ACC_NO" 
                      value={formData.ACC_NO || ''} 
                      onChange={handleChange} 
                      className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.ACC_NO} value={acc.ACC_NO}>
                          {acc.ACC_NO} - {acc.ACC_NAME}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Vat Acc</label>
                    <select 
                      name="VAT_ACC" 
                      value={formData.VAT_ACC || ''} 
                      onChange={handleChange} 
                      className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.ACC_NO} value={acc.ACC_NO}>
                          {acc.ACC_NO} - {acc.ACC_NAME}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Exp Acc</label>
                  <select 
                    name="EXP_ACC" 
                    value={formData.EXP_ACC || ''} 
                    onChange={handleChange} 
                    className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.ACC_NO} value={acc.ACC_NO}>
                        {acc.ACC_NO} - {acc.ACC_NAME}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Screen Name</label>
                  <select 
                    name="SCREEN_NAME" 
                    value={formData.SCREEN_NAME || ''} 
                    onChange={handleChange} 
                    className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select Screen</option>
                    {screens.map((scr, idx) => (
                      <option key={idx} value={scr.Menu_Name}>
                        {scr.Menu_Name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-6 py-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="AUTO_POST" name="AUTO_POST" checked={formData.AUTO_POST === 1} onChange={handleChange} className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="AUTO_POST" className="text-xs font-bold text-zinc-600 uppercase">Auto Post</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="PIH" name="PIH" checked={formData.PIH === 1} onChange={handleChange} className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="PIH" className="text-xs font-bold text-zinc-600 uppercase">PIH</label>
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-border">
                  <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm">
                    <Save size={16} strokeWidth={3} />
                    {editingType ? 'UPDATE TYPE' : 'SAVE TYPE'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
