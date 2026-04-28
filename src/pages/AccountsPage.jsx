import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Plus, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';

export default function AccountsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/accounts/list')
      .then(res => res.json())
      .then(data => {
        // Map DB fields to UI fields
        const mappedData = data.map(acc => ({
          id: String(acc.acc_no),
          name: acc.Acc_name,
          type: 'Cash', // Based on the query logic (CASH_ac_type)
          balance: 0, // Balance not in provided query
          status: 'Active'
        }));
        setAccounts(mappedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch accounts:", err);
        setLoading(false);
      });
  }, []);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = React.useRef(null);

  const toggleStatus = (id) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === id 
        ? { ...acc, status: acc.status === 'Active' ? 'Inactive' : 'Active' } 
        : acc
    ));
    setOpenDropdownId(null);
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    acc.id.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">Accounts</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage your financial accounts and connectivity.</p>
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm">
            <Plus size={18} strokeWidth={3} />
            CREATE ACCOUNT
          </button>
        </div>

        {/* Stats Grid - Simplified */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Accounts', value: accounts.length, icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'Active Accounts', value: accounts.filter(a => a.status === 'Active').length, icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
            { label: 'Inactive Accounts', value: accounts.filter(a => a.status === 'Inactive').length, icon: ArrowDownRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">{stat.label}</p>
              <p className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
          <div className="p-4 border-b border-border bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search accounts..." 
                className="w-full bg-white dark:bg-zinc-800 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-zinc-100"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Filter size={16} />
                Filters
              </button>
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
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b border-border hover:bg-indigo-500/5 transition-colors group">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{account.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-zinc-900 dark:text-zinc-200">{account.name}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black ${
                        account.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${account.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {account.status}
                      </div>
                    </td>
                    <td className="p-4 text-center relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === account.id ? null : account.id);
                        }}
                        className="text-zinc-400 hover:text-indigo-500 transition-colors p-1"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {openDropdownId === account.id && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-8 top-1/2 -translate-y-1/2 bg-card border border-border shadow-xl rounded-xl py-1 z-10 w-40 animate-in fade-in slide-in-from-right-2 duration-200"
                        >
                          <button 
                            onClick={() => toggleStatus(account.id)}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                          >
                            <div className={`w-2 h-2 rounded-full ${account.status === 'Active' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {account.status === 'Active' ? 'Make Inactive' : 'Make Active'}
                          </button>
                          <button className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                            Edit Account
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-border bg-zinc-50/30 dark:bg-zinc-900/30 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            <p>Showing {filteredAccounts.length} of {accounts.length} accounts</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-border rounded-lg hover:bg-background">Previous</button>
              <button className="px-3 py-1 border border-border rounded-lg hover:bg-background">Next</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
