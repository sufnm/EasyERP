import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { Search, Filter, MoreVertical, Plus, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import { useCache } from '../context/CacheContext';

export default function ExpenseAccountsPage({ setActivePage, params = {} }) {
  const { cachedAccounts, isReady } = useCache();
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(!isReady);
  const [classes, setClasses] = useState([]);
  const [subClasses, setSubClasses] = useState([]);
  const [headerAccounts, setHeaderAccounts] = useState([]);
  const [headerTypes, setHeaderTypes] = useState([]);
  
  // Initialize from params if coming back, but ALWAYS default to Class 5 (Expenses)
  const [accountClass, setAccountClass] = useState('5'); 
  const [subClass, setSubClass] = useState(params.level2 || 'All');
  const [headerAcc, setHeaderAcc] = useState(params.level3 || 'All');
  const [detailType, setDetailType] = useState(params.detailType || '3'); 
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    setLoading(true);
    fetch(API_ENDPOINTS.ACCOUNT_CLASSES)
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error('❌ Classes fetch error:', err));

    fetch(API_ENDPOINTS.ACCOUNT_HEADER_TYPES)
      .then(res => res.json())
      .then(data => setHeaderTypes(data))
      .catch(err => console.error('❌ Header types fetch error:', err));
  }, []);

  // Fetch accounts for the MAIN TABLE based on Type and Class
  useEffect(() => {
    setLoading(true);
    // Explicitly lock to Level 4 Ledger Accounts as requested
    const targetLevel = 4;

    const url = API_ENDPOINTS.ACCOUNT_BY_LEVEL(accountClass, targetLevel);

    fetch(url)
      .then(res => res.json())
      .then(data => {
        console.log('🔗 EXPENSE DATA SAMPLES:', data.slice(0, 3));
        const ledgerAccounts = data.map(acc => ({
            id: String(acc.acc_no || acc.ACC_NO),
            name: acc.acc_name || acc.ACC_NAME,
            class: acc.acc_class || acc.ACC_CLASS,
            level2: acc.LEVEL2_NO || acc.level2_no,
            level3: acc.LEVEL3_NO || acc.level3_no,
            level: acc.acc_level || acc.ACC_LEVEL,
            status: 'Active'
          }));
        setAccounts(ledgerAccounts);
        setLoading(false);
      })
      .catch(err => {
        console.error('❌ Table fetch error:', err);
        setLoading(false);
      });
  }, [accountClass]);

  // Fetch sub-classes when accountClass changes (for the Filter dropdown)
  useEffect(() => {
    const url = API_ENDPOINTS.ACCOUNT_SUBCLASSES(accountClass);

    fetch(url)
      .then(res => res.json())
      .then(data => setSubClasses(data))
      .catch(err => console.error('❌ Sub-classes fetch error:', err));
  }, [accountClass]);

  // Fetch Header Accounts when subClass changes
  useEffect(() => {
    if (subClass === 'All') {
      setHeaderAccounts([]);
      setHeaderAcc('All');
    } else {
      fetch(API_ENDPOINTS.ACCOUNT_HEADER_ACCOUNTS(subClass))
        .then(res => res.json())
        .then(data => setHeaderAccounts(data))
        .catch(err => console.error('❌ Header accounts fetch error:', err));
    }
  }, [subClass]);

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

  // Handle detailType reset if its option is removed
  useEffect(() => {
    if (subClass !== 'All' && detailType === '1') {
      setDetailType('2');
    }
    if (headerAcc !== 'All' && (detailType === '1' || detailType === '2')) {
      setDetailType('3');
    }
  }, [subClass, headerAcc, detailType]);

  const filteredHeaderTypes = headerTypes.filter(h => {
    const code = String(h.header_code);
    if (code === '0') return false; // Hide Master List for specific class view
    if (subClass !== 'All' && code === '1') return false;
    if (headerAcc !== 'All' && (code === '1' || code === '2')) return false;
    return true;
  });

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.id.includes(searchTerm);
    const matchesSubClass = subClass === 'All' || String(acc.level2) === String(subClass);
    const matchesHeader = headerAcc === 'All' || String(acc.level3) === String(headerAcc);
    return matchesSearch && matchesSubClass && matchesHeader;
  });

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase tracking-[0.2em] relative inline-block">
              Expense Accounts
              <span className="absolute -bottom-1 left-0 w-12 h-1 bg-indigo-600 rounded-full"></span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mt-1">Manage and categorize your operational expense ledger.</p>
          </div>
          <button
            onClick={() => {
              const firstItem = filteredAccounts[0];
              setActivePage('create-account', { 
                accClass: '5', 
                level2: subClass !== 'All' ? subClass : (firstItem?.level2 || ''),
                level3: headerAcc !== 'All' ? headerAcc : (firstItem?.level3 || ''),
                accLevel: detailType === '1' ? 2 : detailType === '2' ? 3 : 4,
                detailType: detailType
              });
            }}
            disabled={(() => {
              if (detailType === '1') return false;
              if (detailType === '2') return subClass === 'All';
              if (detailType === '3') return subClass === 'All' || headerAcc === 'All';
              return true;
            })()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
              (() => {
                if (detailType === '1') return false;
                if (detailType === '2') return subClass === 'All';
                if (detailType === '3') return subClass === 'All' || headerAcc === 'All';
                return true;
              })()
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
            }`}
          >
            <Plus size={18} strokeWidth={3} />
            CREATE EXPENSE
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
          <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between w-full">
              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  className="w-full bg-white dark:bg-zinc-800 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-zinc-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
                <div className="flex flex-col gap-1.5 opacity-60">
                  <label className="text-[10px] uppercase font-black text-zinc-400 dark:text-zinc-500 px-1">Account Class</label>
                  <select
                    value={accountClass}
                    disabled
                    className="bg-zinc-100 dark:bg-zinc-900 border border-border rounded-xl px-3 py-2 text-xs outline-none cursor-not-allowed dark:text-zinc-400 min-w-[140px]"
                  >
                    <option value="5">5 - Expenses</option>
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
                    <option>{headerTypes.find(h => String(h.header_code) === '3')?.header_name || 'Ledger Accounts (Level 4)'}</option>
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
                  <tr><td colSpan="4" className="p-8 text-center text-zinc-500 text-xs italic tracking-widest animate-pulse">Loading expense hierarchy...</td></tr>
                ) : filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-tighter">{account.id}</td>
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
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === account.id ? null : account.id); }} className="text-zinc-400 hover:text-indigo-500 transition-colors p-1 group-hover:scale-110"><MoreVertical size={16} /></button>
                        {openDropdownId === account.id && (
                          <div ref={dropdownRef} className="absolute right-8 top-1/2 -translate-y-1/2 bg-card border border-border shadow-2xl rounded-xl py-1 z-10 w-40 animate-in fade-in slide-in-from-right-2 duration-200 backdrop-blur-md">
                            <button onClick={() => toggleStatus(account.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${account.status === 'Active' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              {account.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button className="w-full text-left px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 border-t border-border mt-1">
                              <CreditCard size={14} />
                              View Ledger
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="p-8 text-center text-zinc-500 text-xs italic">No expense records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
