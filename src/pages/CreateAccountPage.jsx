import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { ArrowLeft, Save, Briefcase, Hash, Type, Layers, CheckCircle2, XCircle } from 'lucide-react';

export default function CreateAccountPage({ setActivePage, initialData = {}, prevPage }) {
  const [formData, setFormData] = useState({
    accNo: '',
    accName: '',
    accAName: '',
    accClass: initialData.accClass || '1',
    accLevel: initialData.accLevel || 4,
    groupAc: '',
    prefexNo: '',
    level1: initialData.accClass || '1',
    level2: initialData.level2 || '',
    level3: initialData.level3 || '',
    isPermanent: 0,
    accCode: ''
  });

  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [groupAcOptions, setGroupAcOptions] = useState([]);

  // Fetch group options when level3 changes
  useEffect(() => {
    if (formData.level3 && formData.level3 !== 'All') {
      fetch(API_ENDPOINTS.ACCOUNT_LIST_BY_PARENT('3', formData.level3))
        .then(res => res.json())
        .then(data => setGroupAcOptions(data))
        .catch(err => console.error('❌ Group options fetch error:', err));
    } else if (formData.level2 && formData.level2 !== 'All') {
      fetch(API_ENDPOINTS.ACCOUNT_LIST_BY_PARENT('2', formData.level2))
        .then(res => res.json())
        .then(data => setGroupAcOptions(data))
        .catch(err => console.error('❌ Group options (L2) fetch error:', err));
    }
  }, [formData.level3, formData.level2]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value 
    }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    // Sanitize data before sending
    const sanitize = (val) => {
      if (val === 'All' || val === '' || val === undefined || val === null) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const payload = {
      ...formData,
      accClass: Number(formData.accClass),
      groupAc: Number(formData.groupAc),
      prefexNo: formData.prefexNo ? Number(formData.prefexNo) : null,
      level1: sanitize(formData.level1) ? String(formData.level1) : null,
      level2: sanitize(formData.level2) ? String(formData.level2) : null,
      level3: sanitize(formData.level3) ? String(formData.level3) : null,
      isPermanent: formData.isPermanent ? 1 : 0
    };

    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create account');
      }

      setStatus({ type: 'success', message: `Successfully created account: ${formData.accName}` });
      // Reset form but keep contextual parents
      setFormData(prev => ({
        ...prev,
        accNo: '',
        accName: '',
        accAName: '',
        accCode: '',
        prefexNo: ''
      }));
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1 h-full relative font-sans">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActivePage(prevPage || 'chart-of-accounts', initialData)}
              className="p-2.5 rounded-xl bg-card border border-border text-zinc-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all active:scale-95"
            >
              <ArrowLeft size={20} className="stroke-[3]" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">New Account</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium italic">Configuring entry for Level {formData.accLevel}</p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {status.message && (
          <div className={`mb-6 p-4 rounded-2xl flex items-start gap-4 border animate-in slide-in-from-top-4 duration-300 ${
            status.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            <div className={`p-1.5 rounded-full ${status.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {status.type === 'success' ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <XCircle size={20} strokeWidth={2.5} />}
            </div>
            <div className="flex-1 mt-0.5 font-bold text-sm">
              {status.message}
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden flex-1 relative flex flex-col mb-10">
          <div className="p-8 flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sticky top-0 bg-card z-10 pb-4 border-b border-border/50 mb-8 pt-0 mt-0">
                {/* Account Number */}
                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex justify-between">
                    Primary Account #
                    <span className="text-indigo-500 transform scale-75">AUTO</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-500 transition-colors" size={18} />
                    <input
                      type="text"
                      value="AUTO-GENERATE"
                      disabled
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-border rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold outline-none cursor-not-allowed text-zinc-500"
                    />
                  </div>
                </div>

                {/* Account Code */}
                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    Quick Access Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="text"
                      name="accCode"
                      value={formData.accCode}
                      onChange={handleChange}
                      placeholder="e.g. CASH-01"
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Names Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Account Name (English)</label>
                  <div className="relative">
                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="text"
                      name="accName"
                      value={formData.accName}
                      onChange={handleChange}
                      required
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-2xl pl-12 pr-4 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right block">اسم الحساب (Arabic)</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="accAName"
                      dir="rtl"
                      value={formData.accAName}
                      onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-2xl pr-4 pl-4 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Taxonomy Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Account Class</label>
                  <select
                    name="accClass"
                    value={formData.accClass}
                    onChange={handleChange}
                    disabled
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-border rounded-2xl px-4 py-3.5 text-sm font-bold outline-none cursor-not-allowed dark:text-zinc-400"
                  >
                    <option value="1">1 - Assets</option>
                    <option value="2">2 - Liabilities</option>
                    <option value="3">3 - Equity</option>
                    <option value="4">4 - Income</option>
                    <option value="5">5 - Expenses</option>
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Group Account</label>
                  <select
                    name="groupAc"
                    value={formData.groupAc}
                    onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white cursor-pointer"
                  >
                    <option value="">None (Optional)</option>
                    {groupAcOptions.map(opt => (
                      <option key={opt.acc_no} value={opt.acc_no}>{opt.acc_name} ({opt.acc_no})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 group">
                  <label className="text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">Prefix #</label>
                  <input
                    type="text"
                    name="prefexNo"
                    value={formData.prefexNo}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white"
                  />
                </div>
              </div>

              {/* Hierarchy Section (Context-driven) */}
              <div className="bg-zinc-50/50 dark:bg-white/5 rounded-3xl p-6 border border-border/50">
                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Layers size={14} /> Parent Hierarchy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Level 1 (Class)</label>
                    <input value={formData.accClass} disabled className="w-full bg-white/50 dark:bg-white/5 border border-border/20 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Level 2 (Parent Sub)</label>
                    <input value={formData.level2 || 'N/A'} disabled className="w-full bg-white/50 dark:bg-white/5 border border-border/20 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Level 3 (Parent Header)</label>
                    <input value={formData.level3 || 'N/A'} disabled className="w-full bg-white/50 dark:bg-white/5 border border-border/20 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-zinc-500 cursor-not-allowed" />
                  </div>
                </div>
              </div>

              {/* Flags Section */}
              <div className="flex items-center gap-6 py-2 px-1">
                <label className="inline-flex items-center cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      name="isPermanent"
                      checked={formData.isPermanent === 1}
                      onChange={handleChange}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </div>
                  <span className="ml-3 text-xs font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-tighter group-hover:text-indigo-500 transition-colors">Is Permanent Account</span>
                </label>
              </div>

            </form>
          </div>
          
          {/* Action Button */}
          <div className="p-6 border-t border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-center sticky bottom-0">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white w-full max-w-sm py-4 rounded-2xl font-black transition-all shadow-[0_10px_40px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_15px_50px_-10px_rgba(79,70,229,0.4)] active:scale-95 text-base tracking-tight"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={20} strokeWidth={3} />
              )}
              {loading ? 'PROCESSING...' : 'SAVE TO LEDGER'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
