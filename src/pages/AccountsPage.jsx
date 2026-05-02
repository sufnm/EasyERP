import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, Filter, MoreVertical, Plus, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import { useCache } from '../context/CacheContext';

export default function AccountsPage({ setActivePage, params = {} }) {
  const { cachedAccounts, isReady } = useCache();
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [subClasses, setSubClasses] = useState([]);
  const [headerAccounts, setHeaderAccounts] = useState([]);
  const [headerTypes, setHeaderTypes] = useState([]);
  
  // Bank & Cash requirement: Class 1 (Assets), Level 4 (Ledger), Header = CASH_AC_TYPE
  const [accountClass, setAccountClass] = useState('1'); 
  const [subClass, setSubClass] = useState('All');
  const [headerAcc, setHeaderAcc] = useState('All');
  const [detailType, setDetailType] = useState('3'); // Ledger accounts ID 3
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = React.useRef(null);

  // Fetch initial policy and metadata
  useEffect(() => {
    setLoading(true);
    fetch(API_ENDPOINTS.CASH_POLICY)
      .then(res => res.json())
      .then(data => {
        if (data.headerAcc) setHeaderAcc(String(data.headerAcc));
        if (data.subClass) setSubClass(String(data.subClass));
      })
      .catch(err => console.error('❌ Policy fetch error:', err));
    fetch(API_ENDPOINTS.ACCOUNT_CLASSES)
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error('❌ Classes fetch error:', err));

    fetch(API_ENDPOINTS.ACCOUNT_HEADER_TYPES)
      .then(res => res.json())
      .then(data => setHeaderTypes(data))
      .catch(err => console.error('❌ Header types fetch error:', err));
  }, []);

  // Fetch sub-classes names for display
  useEffect(() => {
    fetch(API_ENDPOINTS.ACCOUNT_SUBCLASSES('1'))
      .then(res => res.json())
      .then(data => setSubClasses(data))
      .catch(err => console.error('❌ Sub-classes fetch error:', err));
  }, []);

  // Fetch Header Accounts when subClass changes
  useEffect(() => {
    if (subClass === 'All') {
      setHeaderAccounts([]);
    } else {
      fetch(API_ENDPOINTS.ACCOUNT_HEADER_ACCOUNTS(subClass))
        .then(res => res.json())
        .then(data => setHeaderAccounts(data))
        .catch(err => console.error('❌ Header accounts fetch error:', err));
    }
  }, [subClass]);

  // Fetch accounts locked to the Header ID
  useEffect(() => {
    if (headerAcc === 'All' && !loading) return;
    
    setLoading(true);
    // Fetch directly by parent since it's locked
    fetch(API_ENDPOINTS.ACCOUNT_LIST_BY_PARENT('3', headerAcc))
      .then(res => res.json())
      .then(data => {
        // Strict Level 4 Filter
        const ledgerOnly = data
          .filter(acc => String(acc.ACC_LEVEL || acc.acc_level || '4') === '4')
          .map(acc => ({
            id: String(acc.acc_no || acc.ACC_NO),
            name: acc.acc_name || acc.ACC_NAME,
            class: '1',
            level2: subClass,
            level3: headerAcc,
            level: acc.ACC_LEVEL || acc.acc_level || 4,
            status: 'Active'
          }));
        setAccounts(ledgerOnly);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Table fetch error:', err);
        setLoading(false);
      });
  }, [headerAcc, subClass]);

  const toggleStatus = (id) => {
    setAccounts(prev => prev.map(acc =>
      acc.id === id ? { ...acc, status: acc.status === 'Active' ? 'Inactive' : 'Active' } : acc
    ));
    setOpenDropdownId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.id.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase tracking-[0.05em]">
              Cash & Bank Accounts
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-1">Unified view of your liquidity and banking ledger.</p>
          </div>
          <button
            onClick={() => {
              setActivePage('create-account', { 
                accClass: '1', 
                level2: subClass,
                level3: headerAcc,
                accLevel: 4,
                detailType: '3'
              });
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm"
          >
            <Plus size={18} strokeWidth={3} />
            CREATE ACCOUNT
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
          <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between w-full">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Search cash accounts..."
                  className="w-full bg-white dark:bg-zinc-800 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-zinc-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
                <div className="flex flex-col gap-1.5 opacity-50">
                  <label className="text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 px-1">Account Class</label>
                  <select disabled className="bg-zinc-100 dark:bg-zinc-900 border border-border rounded-xl px-3 py-2 text-xs cursor-not-allowed">
                    <option>1 - Assets</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 px-1">Sub Class</label>
                  <select 
                    value={subClass}
                    onChange={(e) => setSubClass(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-zinc-100 min-w-[140px]"
                  >
                    <option value="All">All Sub Classes</option>
                    {subClasses.map(sub => (
                      <option key={sub.acc_no} value={sub.acc_no}>{sub.acc_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 px-1">Header Acc</label>
                  <select 
                    value={headerAcc}
                    onChange={(e) => setHeaderAcc(e.target.value)}
                    disabled={subClass === 'All'}
                    className={`bg-white dark:bg-zinc-800 border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-zinc-100 min-w-[140px] ${subClass === 'All' ? 'opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900' : ''}`}
                  >
                    <option value="All">All Headers</option>
                    {headerAccounts.map(h => (
                      <option key={h.acc_no} value={h.acc_no}>{h.acc_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 opacity-50">
                  <label className="text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 px-1">Account Level</label>
                  <select disabled className="bg-zinc-100 dark:bg-zinc-900 border border-border rounded-xl px-3 py-2 text-xs cursor-not-allowed">
                    <option>{headerTypes.find(h => String(h.header_code) === '3')?.header_name || 'Ledger Accounts'}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 tracking-widest border-b border-border">
                  <th className="p-4 w-24">Acc #</th>
                  <th className="p-4">Account Name</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr><td colSpan="4" className="p-12 text-center text-zinc-500 text-xs italic tracking-[0.2em] animate-pulse">Syncing bank connectivity...</td></tr>
                ) : filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-border hover:bg-emerald-500/5 transition-colors group">
                      <td className="p-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{account.id}</td>
                      <td className="p-4">
                        <div className="font-bold text-zinc-900 dark:text-zinc-200">{account.name}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${account.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${account.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {account.status}
                        </div>
                      </td>
                      <td className="p-4 text-center relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === account.id ? null : account.id); }} className="text-zinc-400 hover:text-indigo-500 transition-colors p-1"><MoreVertical size={16} /></button>
                        {openDropdownId === account.id && (
                          <div ref={dropdownRef} className="absolute right-8 top-1/2 -translate-y-1/2 bg-card border border-border shadow-2xl rounded-xl py-1 z-10 w-40 animate-in fade-in slide-in-from-right-2 duration-200">
                            <button onClick={() => toggleStatus(account.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${account.status === 'Active' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              {account.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 border-t border-border mt-1">
                              <ArrowUpRight size={14} />
                              Transfer Funds
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="p-8 text-center text-zinc-500 text-xs italic">No cash or bank accounts mapped.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
