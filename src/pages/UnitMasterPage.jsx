import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Ruler, Plus, Save, Edit, X } from 'lucide-react';

export default function UnitMasterPage() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  
  const defaultFormData = { Unit_id: '', Unit_Name: '', Unit_AName: '', Unit_Type: '', QTY: 0 };
  const [formData, setFormData] = useState(defaultFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.UNIT_MASTER);
      if (res.ok) {
        setUnits(await res.json());
      }
    } catch (err) {
      console.error("Fetch Units Error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleEdit = (unit) => {
    setFormData(unit);
    setEditingUnit(unit);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    const nextId = units.length > 0 ? Math.max(...units.map(u => u.Unit_id)) + 1 : 1;
    setFormData({ ...defaultFormData, Unit_id: nextId });
    setEditingUnit(null);
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
    if (!formData.Unit_id || !formData.Unit_Name) {
      alert("ID and Name are required!");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.UNIT_MASTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchUnits();
      } else {
        alert("Failed to save unit");
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
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Unit Master</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage your units of measurement.</p>
          </div>
          {!isFormOpen && (
            <button 
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
            >
              <Plus size={18} strokeWidth={3} />
              NEW UNIT
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-6">
          {/* Main List Table */}
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <Ruler size={16} /> LookUp Master <span className="opacity-50">/</span> Unit Master
              </div>
            </div>

            <div className="overflow-x-auto h-full">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading data from API...</div>
              ) : units.length === 0 ? (
                <div className="p-12 text-center">
                   <p className="text-zinc-400 font-medium">No units found in the database.</p>
                   <p className="text-zinc-500 text-xs mt-2">Checked endpoint: {API_ENDPOINTS.UNIT_MASTER}</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest border-b border-border">
                      <th className="p-4 w-24">ID ({units.length})</th>
                      <th className="p-4">Unit Name (En)</th>
                      <th className="p-4">Unit Name (Ar)</th>
                      <th className="p-4">Unit Type</th>
                      <th className="p-4 text-right">QTY</th>
                      <th className="p-4 w-24 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {units.map((unit) => (
                      <tr key={unit.Unit_id || unit.unit_id} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 w-24">{unit.Unit_id || unit.unit_id}</td>
                        <td className="p-4 font-bold text-zinc-900 dark:text-zinc-200">{unit.Unit_Name || unit.unit_name}</td>
                        <td className="p-4 font-arabic text-zinc-700 dark:text-zinc-400" dir="rtl">{unit.Unit_AName || unit.unit_aname}</td>
                        <td className="p-4 text-zinc-600 dark:text-zinc-400">{unit.Unit_Type || unit.unit_type}</td>
                        <td className="p-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg w-20">{unit.QTY || unit.qty || 0}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(unit)}
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
                    {editingUnit ? 'Edit Unit' : 'New Unit'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Configure unit of measurement details</p>
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
                  <label className="text-[10px] uppercase font-black text-zinc-500">Unit ID *</label>
                  <input 
                    name="Unit_id" 
                    type="number" 
                    value={formData.Unit_id} 
                    onChange={handleChange} 
                    className="input-class bg-zinc-100 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold text-indigo-600" 
                    required 
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Unit Name (En) *</label>
                  <input 
                    name="Unit_Name" 
                    value={formData.Unit_Name} 
                    onChange={handleChange} 
                    className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" 
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Unit Name (Ar)</label>
                  <input 
                    name="Unit_AName" 
                    value={formData.Unit_AName} 
                    onChange={handleChange} 
                    dir="rtl" 
                    className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-arabic" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Unit Type</label>
                  <input 
                    name="Unit_Type" 
                    value={formData.Unit_Type} 
                    onChange={handleChange} 
                    className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-500">QTY *</label>
                  <input 
                    name="QTY" 
                    type="number" 
                    step="0.01"
                    value={formData.QTY} 
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
                    {editingUnit ? 'UPDATE UNIT' : 'SAVE UNIT'}
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
