import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { ShieldCheck, Plus, Save, Edit, X, Check, Square } from 'lucide-react';

export default function UserPrivilegesPage() {
  const [privs, setPrivs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingPriv, setEditingPriv] = useState(null);
  const [screens, setScreens] = useState([]);
  
  const defaultFormData = {
    GROUP_NAME: '', form_id: '', ins: 0, upd: 0, qry: 0, del: 0, dsp: 0, Menu_Name: ''
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchPrivs = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.USER_PRIVILEGES);
      if (res.ok) {
        setPrivs(await res.json());
      }
    } catch (err) {
      console.error("Fetch User Privileges Error:", err);
    }
    setLoading(false);
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
    fetchPrivs();
    fetchScreens();
  }, []);

  const handleEdit = (priv) => {
    setFormData(priv);
    setEditingPriv(priv);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setFormData(defaultFormData);
    setEditingPriv(null);
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
    if (!formData.GROUP_NAME || !formData.Menu_Name) {
      alert("Group and Menu Name are required!");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.USER_PRIVILEGES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchPrivs();
      } else {
        alert("Failed to save user privilege");
      }
    } catch (err) {
      alert("Network error while saving");
    }
  };

  const PermissionBadge = ({ enabled, label }) => (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
      {enabled ? <Check size={10} strokeWidth={4} /> : <Square size={10} />}
      {label}
    </div>
  );

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">User Privileges</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage access rights for different user groups and forms.</p>
          </div>
          {!isFormOpen && (
            <button 
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
            >
              <Plus size={18} strokeWidth={3} />
              NEW PRIVILEGE
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* Main List Table */}
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <ShieldCheck size={16} /> Admin Setup <span className="opacity-50">/</span> User Privileges
              </div>
            </div>

            <div className="overflow-x-auto flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading privileges...</div>
              ) : privs.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 font-medium">No privileges configured.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest border-b border-border">
                      <th className="p-4">Group Name</th>
                      <th className="p-4">Menu / Form</th>
                      <th className="p-4">Permissions</th>
                      <th className="p-4 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {privs.map((priv, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                        <td className="p-4 font-bold text-zinc-900 dark:text-zinc-200">
                           <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs">{priv.GROUP_NAME}</span>
                        </td>
                        <td className="p-4">
                           <div className="flex flex-col">
                             <span className="font-bold text-indigo-600 dark:text-indigo-400">{priv.Menu_Name}</span>
                             <span className="text-[10px] text-zinc-500 font-mono">ID: {priv.form_id}</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2 flex-wrap">
                             <PermissionBadge enabled={priv.ins} label="Insert" />
                             <PermissionBadge enabled={priv.upd} label="Update" />
                             <PermissionBadge enabled={priv.del} label="Delete" />
                             <PermissionBadge enabled={priv.qry} label="Query" />
                             <PermissionBadge enabled={priv.dsp} label="Display" />
                           </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(priv)}
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
                    {editingPriv ? 'Edit Privilege' : 'New Privilege'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Configure group access rights</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Group Name *</label>
                  <input name="GROUP_NAME" value={formData.GROUP_NAME} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-bold" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Menu Name *</label>
                    <select 
                      name="Menu_Name" 
                      value={formData.Menu_Name} 
                      onChange={handleChange} 
                      className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    >
                      <option value="">Select Screen</option>
                      {screens.map((scr, idx) => (
                        <option key={idx} value={scr.Menu_Name}>{scr.Menu_Name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500">Form ID</label>
                    <input name="form_id" value={formData.form_id} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border space-y-4">
                  <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block border-b border-border pb-2 mb-4">Permissions</label>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'ins', label: 'Insert (Allow adding new records)' },
                      { id: 'upd', label: 'Update (Allow editing existing records)' },
                      { id: 'del', label: 'Delete (Allow removing records)' },
                      { id: 'qry', label: 'Query (Allow searching/viewing data)' },
                      { id: 'dsp', label: 'Display (Allow access to the form)' }
                    ].map(perm => (
                      <div key={perm.id} className="flex items-center justify-between p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors group cursor-pointer" onClick={() => handleChange({ target: { name: perm.id, type: 'checkbox', checked: !formData[perm.id] }})}>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">{perm.id}</span>
                          <span className="text-[10px] text-zinc-500">{perm.label}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          name={perm.id} 
                          checked={formData[perm.id] === 1} 
                          onChange={handleChange}
                          className="w-5 h-5 rounded-md border-zinc-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none" 
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-border">
                  <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm">
                    <Save size={16} strokeWidth={3} />
                    {editingPriv ? 'UPDATE PRIVILEGES' : 'SAVE PRIVILEGES'}
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
