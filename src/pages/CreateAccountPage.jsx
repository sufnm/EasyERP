import React, { useState } from 'react';
import { API_ENDPOINTS } from '../config';
import { ArrowLeft, Save, Briefcase, Hash, Type, Layers, CheckCircle2, XCircle } from 'lucide-react';

export default function CreateAccountPage({ setActivePage }) {
  const [formData, setFormData] = useState({
    accNo: '',
    accName: '',
    accTypeCode: '1',
    accClass: '4'
  });

  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(API_ENDPOINTS.ACCOUNT_CREATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create account');
      }

      setStatus({ type: 'success', message: `Successfully created account: ${formData.accName}` });
      setFormData({ accNo: '', accName: '', accTypeCode: '1', accClass: '4' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-4xl mx-auto w-full flex flex-col flex-1 h-full relative">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActivePage('accounts')}
              className="p-2.5 rounded-xl bg-card border border-border text-zinc-500 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all active:scale-95"
            >
              <ArrowLeft size={20} className="stroke-[3]" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Chart of Accounts</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Create a new ledger account here.</p>
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

        {/* Main Form Form */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex-1 relative flex flex-col">
          <div className="p-8 flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
              
              {/* Account Number */}
              <div className="space-y-2 group">
                <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex flex-col">
                  Account Number
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium normal-case tracking-normal">Numeric identifier required</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="number"
                    name="accNo"
                    value={formData.accNo}
                    onChange={handleChange}
                    required
                    placeholder="e.g. 1010"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl pl-12 pr-4 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white placeholder:font-medium placeholder:text-zinc-400"
                  />
                </div>
              </div>

              {/* Account Name */}
              <div className="space-y-2 group">
                <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  Account Name
                </label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input
                    type="text"
                    name="accName"
                    value={formData.accName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Cash in Hand"
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl pl-12 pr-4 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white placeholder:font-medium placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Account Type */}
                <div className="space-y-2 group">
                  <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                    Account Type
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <select
                      name="accTypeCode"
                      value={formData.accTypeCode}
                      onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl pl-12 pr-10 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="1">General Ledger</option>
                      <option value="2">Customer</option>
                      <option value="3">Supplier</option>
                      <option value="4">Bank</option>
                    </select>
                  </div>
                </div>

                {/* Account Class */}
                <div className="space-y-2 group">
                  <label className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                    Account Class
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <select
                      name="accClass"
                      value={formData.accClass}
                      onChange={handleChange}
                      className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl pl-12 pr-10 py-3.5 text-base font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="1">1 - Assets</option>
                      <option value="2">2 - Liabilities</option>
                      <option value="3">3 - Equity</option>
                      <option value="4">4 - Income</option>
                      <option value="5">5 - Expenses</option>
                    </select>
                  </div>
                </div>
              </div>

            </form>
          </div>
          
          {/* Footer / Submit */}
          <div className="p-6 border-t border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:active:scale-100 text-white px-8 py-3.5 rounded-xl font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 flex items-center justify-center">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : (
                <Save size={18} strokeWidth={2.5} />
              )}
              {loading ? 'SAVING...' : 'SAVE ACCOUNT'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
