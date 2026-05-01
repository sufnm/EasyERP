import React from 'react';
import { Home, ShoppingCart, Settings, Users, BarChart3, Book, Clock, LogOut } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, onLogout, user }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'sales-history', label: 'Sales History', icon: Clock },
    { id: 'accounts', label: 'Accounts', icon: Book },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

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
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-zinc-500'} />
              {item.label}
            </button>
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
