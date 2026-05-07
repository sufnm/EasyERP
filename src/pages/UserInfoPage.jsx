import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Users, Plus, Save, Edit, X, Shield, Warehouse, Building2, Smartphone, Key, Layout } from 'lucide-react';

export default function UserInfoPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [groups, setGroups] = useState([]);
  
  const defaultFormData = {
    UserId: '', UserName: '', MOBILE_NO: '', Password: '', Superuser: 0,
    Group_Name: '', WR_CODE: '', BRN_CODE: '', MENU_DOCK: 0, SH_TOPMENU: 1,
    SH_SIDEMENU: 1, POWER_USER: 0, DEF_LANG: 'EN', DEF_INVOICE: '',
    DEF_FORM: '', DEF_SCREEN: '', Employee_ACNO: '', SALE_CASH_AC: '',
    SALE_BANK_AC: '', Payments: ''
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.USER_INFO);
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error("Fetch User Info Error:", err);
    }
    setLoading(false);
  };

  const fetchDependencies = async () => {
    try {
      const [brRes, wrRes, grpRes] = await Promise.all([
        fetch(API_ENDPOINTS.BRANCHES),
        fetch(API_ENDPOINTS.WAREHOUSE_LIST),
        fetch(API_ENDPOINTS.USER_PRIVILEGES_GROUPS)
      ]);
      if (brRes.ok) setBranches(await brRes.json());
      if (wrRes.ok) setWarehouses(await wrRes.json());
      if (grpRes.ok) setGroups(await grpRes.json());
    } catch (err) {
      console.error("Fetch Dependencies Error:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDependencies();
  }, []);

  const handleEdit = (user) => {
    setFormData(user);
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setFormData(defaultFormData);
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.UserName) {
      alert("User Name is required!");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.USER_INFO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsFormOpen(false);
        fetchUsers();
      } else {
        alert("Failed to save user info");
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
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">User Management</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage system users, credentials, and default configurations.</p>
          </div>
          {!isFormOpen && (
            <button 
              onClick={handleNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm"
            >
              <Plus size={18} strokeWidth={3} />
              NEW USER
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* Main List Table */}
          <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">
                <Users size={16} /> Admin Setup <span className="opacity-50">/</span> User Info
              </div>
            </div>

            <div className="overflow-x-auto flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-zinc-500">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 font-medium">No users found.</div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-sm text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest border-b border-border">
                      <th className="p-4 w-24">User ID</th>
                      <th className="p-4">User Name</th>
                      <th className="p-4">Group</th>
                      <th className="p-4">Mobile</th>
                      <th className="p-4">Role</th>
                      <th className="p-4 w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {users.map((user) => (
                      <tr key={user.UserId} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{user.UserId}</td>
                        <td className="p-4 font-bold text-zinc-900 dark:text-zinc-200">{user.UserName}</td>
                        <td className="p-4">
                           <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-600">
                             {user.Group_Name || user.GROUP_NAME || user.group_name || 'N/A'}
                           </span>
                        </td>
                        <td className="p-4 font-mono text-zinc-600">{user.MOBILE_NO}</td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                             {user.Superuser === 1 && <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Super</span>}
                             {user.POWER_USER === 1 && <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">Power</span>}
                           </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEdit(user)}
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
            <div className="w-[500px] flex-shrink-0 bg-card rounded-2xl border border-border shadow-2xl p-6 overflow-y-auto animate-in fade-in slide-in-from-right-8 duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                    {editingUser ? 'Edit User Info' : 'New User Account'}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">Configure profile and permissions</p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                {/* Identity Section */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black text-zinc-500">User ID</label>
                      <input 
                        name="UserId" 
                        value={editingUser ? formData.UserId : 'AUTO'} 
                        disabled 
                        className="input-class bg-zinc-100 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm font-bold opacity-75 cursor-not-allowed" 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black text-zinc-500">Group Name</label>
                      <select 
                        name="Group_Name" 
                        value={formData.Group_Name} 
                        onChange={handleChange} 
                        className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Select Group</option>
                        {groups.map(grp => (
                          <option key={grp.Group_Name} value={grp.Group_Name}>
                            {grp.Group_Name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-black text-zinc-500 flex items-center gap-1"><Smartphone size={10} /> Mobile No</label>
                    <input name="MOBILE_NO" value={formData.MOBILE_NO} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-mono" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black text-zinc-500">User Name *</label>
                      <input name="UserName" value={formData.UserName} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" required />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-black text-zinc-500 flex items-center gap-1"><Key size={10} /> Password</label>
                      <input name="Password" type="password" value={formData.Password} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Regional & Default Section */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-border space-y-4">
                   <label className="text-[10px] uppercase font-black text-zinc-400 tracking-widest block border-b border-border pb-2">Regional & Defaults</label>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-zinc-500 flex items-center gap-1"><Building2 size={10} /> Branch</label>
                        <select name="BRN_CODE" value={formData.BRN_CODE} onChange={handleChange} className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm">
                          <option value="">Select Branch</option>
                          {branches.map(br => <option key={br.Branch_Code} value={br.Branch_Code}>{br.Branch_Code} - {br.Branch_Name}</option>)}
                        </select>
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-zinc-500 flex items-center gap-1"><Warehouse size={10} /> Warehouse</label>
                        <select name="WR_CODE" value={formData.WR_CODE} onChange={handleChange} className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm">
                          <option value="">Select Warehouse</option>
                          {warehouses.map(wr => <option key={wr.WR_CODE} value={wr.WR_CODE}>{wr.WR_CODE} - {wr.WR_NAME}</option>)}
                        </select>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-zinc-500 uppercase tracking-tighter">Default Language</label>
                        <select name="DEF_LANG" value={formData.DEF_LANG} onChange={handleChange} className="bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm">
                          <option value="EN">English</option>
                          <option value="AR">Arabic</option>
                        </select>
                     </div>
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-black text-zinc-500 uppercase tracking-tighter">Default Invoice</label>
                        <input name="DEF_INVOICE" value={formData.DEF_INVOICE} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                     </div>
                   </div>
                </div>

                {/* Flags Section */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-2">
                   {[
                     { id: 'Superuser', label: 'Super User', icon: Shield, color: 'text-rose-500' },
                     { id: 'POWER_USER', label: 'Power User', icon: Shield, color: 'text-amber-500' },
                     { id: 'MENU_DOCK', label: 'Menu Dock', icon: Layout, color: 'text-indigo-500' },
                     { id: 'SH_TOPMENU', label: 'Show Top Menu', icon: Layout, color: 'text-emerald-500' },
                     { id: 'SH_SIDEMENU', label: 'Show Side Menu', icon: Layout, color: 'text-sky-500' }
                   ].map(flag => (
                     <div key={flag.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <flag.icon size={14} className={flag.color} />
                          <label htmlFor={flag.id} className="text-xs font-bold text-zinc-600 dark:text-zinc-400 cursor-pointer">{flag.label}</label>
                        </div>
                        <input 
                          type="checkbox" 
                          id={flag.id} 
                          name={flag.id} 
                          checked={formData[flag.id] === 1} 
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                     </div>
                   ))}
                </div>

                <div className="pt-4 mt-6 border-t border-border">
                  <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm">
                    <Save size={16} strokeWidth={3} />
                    {editingUser ? 'UPDATE USER' : 'CREATE USER'}
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
