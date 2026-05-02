import React, { useState } from 'react';
import { Home, ShoppingCart, Settings, Users, BarChart3, Book, Clock, LogOut, ChevronDown, ChevronRight } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, onLogout, user }) {
  const [openMenus, setOpenMenus] = useState(['accounts']);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'sales-history', label: 'Sales History', icon: Clock },
    { 
      id: 'accounts', 
      label: 'Accounts', 
      icon: Book,
      subItems: [
        { id: 'chart-of-accounts', label: 'Chart Of accounts' },
        { id: 'customers-account', label: 'Customer Account' },
        { id: 'supplier-accounts', label: 'Supplier Account' },
        { id: 'accounts', label: 'Bank and cash' },
        { id: 'expense-accounts', label: 'Expense' }
      ]
    },
    { 
      id: 'lookup-master', 
      label: 'LookUp master', 
      icon: Settings,
      subItems: [
        { id: 'item-group', label: 'Item Group' }
      ]
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const toggleMenu = (id) => {
    setOpenMenus(prev => 
      prev.includes(id) 
        ? prev.filter(m => m !== id) 
        : [...prev, id]
    );
  };

  return (
    <div className="w-64 bg-zinc-900 dark:bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen text-zinc-300">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-800">
         <div className="flex items-center gap-3 w-full">
           <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 w-8 h-8 rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-lg">
             E
           </div>
           <div className="flex-1 overflow-hidden">
             <h1 className="text-lg font-bold tracking-tight text-white truncate">EasyERP</h1>
           </div>
         </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || item.subItems?.some(sub => sub.id === activePage);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.id);

          return (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => {
                  if (hasSubItems) {
                    toggleMenu(item.id);
                  } else {
                    setActivePage(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive && !hasSubItems
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Icon size={18} className={isActive && !hasSubItems ? 'text-white' : 'text-zinc-500'} />
                <span className="flex-1 text-left">{item.label}</span>
                {hasSubItems && (
                  isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                )}
              </button>

              {hasSubItems && isOpen && (
                <div className="pl-9 space-y-1">
                  {item.subItems.map((subItem) => {
                    const isSubActive = activePage === subItem.id;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => setActivePage(subItem.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSubActive
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-zinc-800 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white border border-white/10 shadow-sm">
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-200 font-semibold text-sm truncate">{user?.username || 'Admin User'}</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-medium">{user?.mobile || 'Administrator'}</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
