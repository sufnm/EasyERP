import React from 'react';
import { Home, ShoppingCart, Settings, Users, BarChart3, Book } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'accounts', label: 'Accounts', icon: Book },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
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

      {/* User Profile Summary */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 border border-zinc-600 shadow-sm">
            AD
          </div>
          <div className="text-xs">
            <p className="text-zinc-200 font-semibold">Admin User</p>
            <p className="text-zinc-500">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
