import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Layers, Plus, Save, Edit, X } from 'lucide-react';

export default function ItemGroupPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const defaultFormData = { ITM_CAT_CODE: '', ITM_CAT_NAME: '', ITM_CAT_ANAME: '', VAT_PERCENT: 0 };
  const [formData, setFormData] = useState(defaultFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.ITEM_GROUPS);
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (err) {
      console.error("Fetch Item Groups Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleEdit = (group) => {
    setFormData(group);
    setEditingGroup(group);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    const nextCode = groups.length > 0 ? Math.max(...groups.map(g => g.ITM_CAT_CODE)) + 1 : 1;
    setFormData({ ...defaultFormData, ITM_CAT_CODE: nextCode });
    setEditingGroup(null);
    setIsFormOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.ITM_CAT_CODE || !formData.ITM_CAT_NAME) {
      alert("Code and Name are required!");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.ITEM_GROUPS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchGroups();
      } else {
        alert("Failed to save item group");
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
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Item Groups</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage your item categories and VAT percentages.</p>
          </div>
          {!isFormOpen && (
            <button 
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
            >
              <Plus size={18} strokeWidth={3} />
              NEW GROUP
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-6">
          {/* Main List Table */}
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <Layers size={16} /> LookUp Master <span className="opacity-50">/</span> Item Group
              </div>
            </div>

            <div className="overflow-x-auto h-full">
              {loading && groups.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">Loading...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest border-b border-border">
                      <th className="p-4 w-24">Code</th>
                      <th className="p-4">Group Name (En)</th>
                      <th className="p-4">Group Name (Ar)</th>
                      <th className="p-4 text-right">VAT %</th>
                      <th className="p-4 w-24 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {groups.map((group) => (
                      <tr key={group.ITM_CAT_CODE} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 w-24">{group.ITM_CAT_CODE}</td>
                        <td className="p-4 font-bold text-zinc-900 dark:text-zinc-200">{group.ITM_CAT_NAME}</td>
                        <td className="p-4 font-arabic text-zinc-700 dark:text-zinc-400" dir="rtl">{group.ITM_CAT_ANAME}</td>
                        <td className="p-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg w-20">{group.VAT_PERCENT}%</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(group)}
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
            <div className="w-96 flex-shrink-0 bg-card rounded-2xl border border-border shadow-2xl p-6 overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                    {editingGroup ? 'Edit Group' : 'New Group'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Configure item category details</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Code *</label>
                  <input 
                    name="ITM_CAT_CODE" 
                    type="number" 
                    value={formData.ITM_CAT_CODE} 
                    onChange={handleChange} 
                    className="input-class bg-zinc-100 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold text-indigo-600" 
                    required 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Group Name (En) *</label>
                  <input 
                    name="ITM_CAT_NAME" 
                    value={formData.ITM_CAT_NAME} 
                    onChange={handleChange} 
                    className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" 
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Group Name (Ar)</label>
                  <input 
                    name="ITM_CAT_ANAME" 
                    value={formData.ITM_CAT_ANAME} 
                    onChange={handleChange} 
                    dir="rtl" 
                    className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-arabic" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-500">VAT Percentage (%) *</label>
                  <input 
                    name="VAT_PERCENT" 
                    type="number" 
                    step="0.01"
                    value={formData.VAT_PERCENT} 
                    onChange={handleChange} 
                    className="input-class bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-lg px-3 py-2 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 focus:ring-emerald-500/20" 
                    required 
                  />
                </div>

                <div className="pt-4 mt-6 border-t border-border">
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
                  >
                    <Save size={16} strokeWidth={3} />
                    {editingGroup ? 'UPDATE GROUP' : 'SAVE GROUP'}
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
