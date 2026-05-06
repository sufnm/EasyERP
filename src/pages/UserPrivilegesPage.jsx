import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config';
import { ShieldCheck, Save, X, Check, Square, ChevronDown, Plus } from 'lucide-react';

export default function UserPrivilegesPage() {
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [menuHeads, setMenuHeads] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedMenuHead, setSelectedMenuHead] = useState('All');
  const [hasChanges, setHasChanges] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Fetch user groups and menu heads on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [grpRes, mhRes] = await Promise.all([
          fetch(API_ENDPOINTS.USER_PRIVILEGES_GROUPS),
          fetch(API_ENDPOINTS.USER_PRIVILEGES_MENU_HEADS)
        ]);
        if (grpRes.ok) {
          const grps = await grpRes.json();
          setGroups(grps);
          if (grps.length > 0) setSelectedGroup(grps[0].Group_Name);
        }
        if (mhRes.ok) {
          setMenuHeads(await mhRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch filters:", err);
      }
    };
    fetchFilters();
  }, []);

  // Fetch grid data when group or menu head changes
  const fetchGrid = useCallback(async () => {
    if (!selectedGroup) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ group: selectedGroup });
      if (selectedMenuHead && selectedMenuHead !== 'All') {
        params.set('menuHead', selectedMenuHead);
      }
      const res = await fetch(`${API_ENDPOINTS.USER_PRIVILEGES_GRID}?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGridData(data);
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Failed to fetch privilege grid:", err);
    }
    setLoading(false);
  }, [selectedGroup, selectedMenuHead]);

  useEffect(() => {
    fetchGrid();
  }, [fetchGrid]);

  // Toggle a permission for a specific row
  const togglePermission = (idx, field) => {
    setGridData(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: updated[idx][field] ? 0 : 1 };
      return updated;
    });
    setHasChanges(true);
  };

  // Toggle all permissions in a column
  const toggleAll = (field) => {
    const allChecked = gridData.every(row => row[field]);
    setGridData(prev => prev.map(row => ({ ...row, [field]: allChecked ? 0 : 1 })));
    setHasChanges(true);
  };

  // Toggle entire row (all permissions for one menu item)
  const toggleRow = (idx) => {
    const row = gridData[idx];
    const allChecked = row.ins && row.upd && row.del && row.dsp;
    const newVal = allChecked ? 0 : 1;
    setGridData(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ins: newVal, upd: newVal, del: newVal, dsp: newVal };
      return updated;
    });
    setHasChanges(true);
  };

  // Save all changes
  const handleSave = async () => {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.USER_PRIVILEGES_BULK_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group: selectedGroup,
          privileges: gridData.map(row => ({
            Menu_Name: row.Menu_Name,
            form_id: row.form_id,
            ins: row.ins,
            upd: row.upd,
            qry: row.qry,
            del: row.del,
            dsp: row.dsp
          }))
        })
      });
      if (res.ok) {
        setHasChanges(false);
        // Brief success flash
      } else {
        alert("Failed to save privileges");
      }
    } catch (err) {
      alert("Network error while saving");
    }
    setSaving(false);
  };

  const permCols = [
    { key: 'ins', label: 'ADDITION' },
    { key: 'upd', label: 'CHANGES' },
    { key: 'del', label: 'DELETE' },
    { key: 'dsp', label: 'VIEW' }
  ];

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">User Privileges</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage access rights for user groups across menu screens.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm ${
                hasChanges 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Save size={16} strokeWidth={3} />
              {saving ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>

        {/* Main Card */}
        <div className="flex-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          
          {/* Toolbar with filters */}
          <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase tracking-widest text-xs">
              <ShieldCheck size={16} /> Admin Setup <span className="opacity-50">/</span> User Privileges
            </div>
            
            <div className="flex flex-wrap items-center gap-6">
              {/* User Group */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider whitespace-nowrap">User Group</label>
                {showNewGroup ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newGroupName.trim()) {
                          const name = newGroupName.trim();
                          if (!groups.find(g => g.Group_Name.toLowerCase() === name.toLowerCase())) {
                            setGroups(prev => [...prev, { Group_Name: name }].sort((a, b) => a.Group_Name.localeCompare(b.Group_Name)));
                          }
                          setSelectedGroup(name);
                          setNewGroupName('');
                          setShowNewGroup(false);
                        } else if (e.key === 'Escape') {
                          setNewGroupName('');
                          setShowNewGroup(false);
                        }
                      }}
                      placeholder="New group name..."
                      autoFocus
                      className="bg-white dark:bg-zinc-800 border-2 border-indigo-400 dark:border-indigo-500 rounded-lg px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]"
                    />
                    <button
                      onClick={() => {
                        if (newGroupName.trim()) {
                          const name = newGroupName.trim();
                          if (!groups.find(g => g.Group_Name.toLowerCase() === name.toLowerCase())) {
                            setGroups(prev => [...prev, { Group_Name: name }].sort((a, b) => a.Group_Name.localeCompare(b.Group_Name)));
                          }
                          setSelectedGroup(name);
                          setNewGroupName('');
                          setShowNewGroup(false);
                        }
                      }}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                      title="Add group"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => { setNewGroupName(''); setShowNewGroup(false); }}
                      className="p-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-600 dark:text-zinc-300 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="appearance-none bg-white dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[200px] transition-colors"
                      >
                        <option value="">Select Group</option>
                        {groups.map(g => (
                          <option key={g.Group_Name} value={g.Group_Name}>{g.Group_Name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => setShowNewGroup(true)}
                      className="p-2 bg-indigo-100 dark:bg-indigo-500/20 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                      title="Add new group"
                    >
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>

              {/* Menu List */}
              <div className="flex items-center gap-3">
                <label className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider whitespace-nowrap">Menu List</label>
                <div className="relative">
                  <select
                    value={selectedMenuHead}
                    onChange={(e) => setSelectedMenuHead(e.target.value)}
                    className="appearance-none bg-white dark:bg-zinc-800 border-2 border-indigo-200 dark:border-indigo-500/30 rounded-lg pl-3 pr-8 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[200px] transition-colors"
                  >
                    <option value="All">All</option>
                    {menuHeads.map(mh => (
                      <option key={mh.Head} value={mh.Head}>{mh.Head}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Change indicator */}
              {hasChanges && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-lg animate-pulse">
                  ● Unsaved changes
                </span>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-zinc-500">Loading privileges...</div>
            ) : !selectedGroup ? (
              <div className="p-12 text-center text-zinc-400 font-medium">Select a User Group to view privileges.</div>
            ) : gridData.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-medium">No menu items found.</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-sm text-[10px] uppercase font-black text-zinc-500 dark:text-zinc-400 tracking-widest border-b-2 border-border">
                    <th className="p-3 pl-4 w-[160px]">MenuHead</th>
                    <th className="p-3 min-w-[220px]">MenuName</th>
                    {permCols.map(col => (
                      <th key={col.key} className="p-3 w-[110px] text-center">
                        <button
                          onClick={() => toggleAll(col.key)}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
                          title={`Toggle all ${col.label}`}
                        >
                          {col.label}
                        </button>
                      </th>
                    ))}
                  </tr>

                  {/* "All" row — toggles everything */}
                  <tr className="bg-indigo-50/80 dark:bg-indigo-500/5 border-b border-indigo-100 dark:border-indigo-500/10">
                    <td className="p-2.5 pl-4">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">▸</span>
                    </td>
                    <td className="p-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">All</td>
                    {permCols.map(col => {
                      const allChecked = gridData.length > 0 && gridData.every(row => row[col.key]);
                      return (
                        <td key={col.key} className="p-2.5 text-center">
                          <button 
                            onClick={() => toggleAll(col.key)} 
                            className="inline-flex items-center justify-center"
                          >
                            <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                              allChecked 
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'
                            }`}>
                              {allChecked && <Check size={12} strokeWidth={3} />}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {gridData.map((row, idx) => (
                    <tr 
                      key={`${row.MENUHEAD}-${row.Menu_Name}-${idx}`} 
                      className="border-b border-border/60 hover:bg-indigo-500/5 transition-colors group"
                    >
                      <td className="p-2.5 pl-4">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{row.MENUHEAD}</span>
                      </td>
                      <td className="p-2.5">
                        <button 
                          onClick={() => toggleRow(idx)}
                          className="font-bold text-zinc-800 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left"
                        >
                          {row.Menu_Name}
                        </button>
                      </td>
                      {permCols.map(col => (
                        <td key={col.key} className="p-2.5 text-center">
                          <button 
                            onClick={() => togglePermission(idx, col.key)} 
                            className="inline-flex items-center justify-center"
                          >
                            <div className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                              row[col.key]
                                ? 'bg-indigo-600 border-indigo-600 text-white' 
                                : 'border-zinc-300 dark:border-zinc-600 hover:border-indigo-400'
                            }`}>
                              {row[col.key] ? <Check size={12} strokeWidth={3} /> : null}
                            </div>
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          {gridData.length > 0 && (
            <div className="p-3 border-t border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>{gridData.length} menu items</span>
              <span>Group: <strong className="text-zinc-600 dark:text-zinc-300">{selectedGroup}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
