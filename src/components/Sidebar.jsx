import React, { useState } from 'react';
import { Home, ShoppingCart, ShoppingBag, Settings, Users, BarChart3, Book, Clock, LogOut, ChevronDown, ChevronRight, Wallet } from 'lucide-react';

export default function Sidebar({ activePage, setActivePage, onLogout, user }) {
  const [openMenus, setOpenMenus] = useState(['accounts']);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { 
      id: 'sales-n-return', 
      label: 'Sales N Return', 
      icon: ShoppingCart,
      subItems: [
        { id: 'sales', label: 'Sales' },
        { id: 'sales-return', label: 'Sales Return' },
        { id: 'sales-history', label: 'Sales History' }
      ]
    },
    { 
      id: 'purchase-n-return', 
      label: 'Purchase N Return', 
      icon: ShoppingBag,
      subItems: [
        { id: 'purchase', label: 'Purchase' },
        { id: 'purchase-return', label: 'Purchase Return' }
      ]
    },
    { 
      id: 'accounts', 
      label: 'Accounts', 
      icon: Book,
      subItems: [
        { id: 'chart-of-accounts', label: 'Chart Of accounts' },
        { id: 'customers-account', label: 'Customer Account' },
        { id: 'supplier-accounts', label: 'Supplier Account' },
        { id: 'purchase-accounts', label: 'Purchase Account' },
        { id: 'accounts', label: 'Bank N cash Accounts' },
        { id: 'expense-accounts', label: 'Expense Accounts' }
      ]
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: Wallet,
      subItems: [
        { id: 'customer-receivable', label: 'Customer Receivable' },
        { id: 'supplier-payable', label: 'Supplier Payable' },
        { id: 'general-voucher', label: 'General Voucher Entry' },
        { id: 'expense-entry', label: 'Expense Entry' },
        { id: 'employee-salary', label: 'Employees Salary Entry' }
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
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen text-sidebar-text transition-colors duration-300">
      {/* Logo Section */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border transition-colors duration-300">
         <div className="flex items-center gap-3 w-full">
           <div className="bg-sidebar-active w-8 h-8 rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-lg transition-colors duration-300">
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
          const isActive = activePage === item.id || 
                           item.subItems?.some(sub => sub.id === activePage) ||
                           (item.id === 'sales-history' && activePage === 'edit-sale');
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
                    ? 'bg-sidebar-active text-white shadow-md' 
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-hover'
                }`}
              >
                <Icon size={18} className={isActive && !hasSubItems ? 'text-white' : 'text-sidebar-text'} />
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
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          isSubActive
                            ? 'text-sidebar-active font-bold' 
                            : 'text-sidebar-text hover:text-sidebar-text-hover hover:bg-sidebar-hover/50'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-sidebar-active' : 'bg-sidebar-border'}`} />
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
      <div className="p-4 border-t border-sidebar-border space-y-4 transition-colors duration-300">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white border border-white/10 shadow-sm">
            {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sidebar-text-hover font-semibold text-sm truncate">{user?.username || 'Admin User'}</p>
            <p className="text-sidebar-text text-[10px] uppercase tracking-wider font-medium">{user?.mobile || 'Administrator'}</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-text hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
