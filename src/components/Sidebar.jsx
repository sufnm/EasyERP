import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, ShoppingCart, ShoppingBag, Settings, Users, BarChart3, 
  Book, Clock, LogOut, ChevronDown, ChevronRight, ChevronUp, Wallet, 
  ShieldCheck, Languages, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({ activePage, setActivePage, onLogout, user }) {
  const [openMenus, setOpenMenus] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const userMenuRef = useRef(null);

  // Auto-collapse user menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const navItems = [
    { id: 'home', label: t('home'), icon: Home },
    { 
      id: 'sales-n-return', 
      label: t('sales'), 
      icon: ShoppingCart,
      subItems: [
        { id: 'sales', label: t('sales') },
        { id: 'sales-return', label: 'Sales Return' },
        { id: 'sales-history', label: t('salesHistory') }
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
      label: t('accounts'), 
      icon: Book,
      subItems: [
        { id: 'chart-of-accounts', label: t('chartOfAccounts') },
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
        { id: 'customer-receivable', label: t('customerReceivable') },
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
        { id: 'item-group', label: 'Item Group' },
        { id: 'unit-master', label: 'Unit Master' }
      ]
    },
    {
      id: 'admin-setup',
      label: 'Admin Setup',
      icon: ShieldCheck,
      subItems: [
        { id: 'transaction-types', label: 'Transaction Types' },
        { id: 'user-privileges', label: 'User Privileges' },
        { id: 'user-info', label: 'User Info' },
        { id: 'translation-manager', label: t('translationManager') }
      ]
    },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const toggleMenu = (id) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenMenus([id]);
      return;
    }
    setOpenMenus(prev => 
      prev.includes(id) 
        ? prev.filter(m => m !== id) 
        : [...prev, id]
    );
  };

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-sidebar border-r border-sidebar-border flex flex-col h-screen text-sidebar-text transition-all duration-300 ease-in-out ${language === 'ar' ? 'border-l border-r-0' : ''}`}>
      {/* Logo Section */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-sidebar-border transition-all duration-300`}>
         {!isCollapsed ? (
           <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-3 flex-1 overflow-hidden">
                <div className="bg-sidebar-active w-8 h-8 rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-lg shrink-0 transition-colors duration-300">
                  E
                </div>
                <h1 className="text-lg font-bold tracking-tight text-white truncate transition-all duration-300 opacity-100">EasyERP</h1>
              </div>
              <button 
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text hover:text-sidebar-text-hover transition-colors"
              >
                <PanelLeftClose size={18} />
              </button>
           </div>
         ) : (
           <div className="bg-sidebar-active w-8 h-8 rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-lg shrink-0 transition-colors duration-300">
             E
           </div>
         )}
      </div>

      {/* Navigation */}
      <div className={`flex-1 py-6 ${isCollapsed ? 'px-2' : 'px-4'} space-y-1 overflow-y-auto`}>
        {isCollapsed && (
          <div className="flex justify-center mb-6">
             <button 
              onClick={() => setIsCollapsed(false)}
              className="p-2 rounded-lg bg-sidebar-hover text-sidebar-text hover:text-sidebar-text-hover transition-colors shadow-sm"
            >
              <PanelLeftOpen size={20} />
            </button>
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id || 
                           item.subItems?.some(sub => sub.id === activePage) ||
                           (item.id === 'sales-history' && activePage === 'edit-sale');
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.id) && !isCollapsed;

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
                title={isCollapsed ? item.label : ""}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-lg transition-all duration-200 text-sm font-medium ${
                  isActive && (!hasSubItems || isCollapsed)
                    ? 'bg-sidebar-active text-white shadow-md' 
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-hover'
                }`}
              >
                <Icon size={isCollapsed ? 22 : 18} className={(isActive && (!hasSubItems || isCollapsed)) ? 'text-white' : 'text-sidebar-text'} />
                {!isCollapsed && (
                  <>
                    <span className={`flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>{item.label}</span>
                    {hasSubItems && (
                      isOpen ? <ChevronDown size={14} /> : (language === 'ar' ? <ChevronRight size={14} className="rotate-180" /> : <ChevronRight size={14} />)
                    )}
                  </>
                )}
              </button>

              {hasSubItems && isOpen && !isCollapsed && (
                <div className={`${language === 'ar' ? 'pr-9 pl-0' : 'pl-9'} space-y-1`}>
                  {item.subItems.map((subItem) => {
                    const isSubActive = activePage === subItem.id;
                    return (
                      <button
                        key={subItem.id}
                        onClick={() => setActivePage(subItem.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${language === 'ar' ? 'text-right' : 'text-left'} ${
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

      {/* User Profile & Collapsible Actions */}
      <div ref={userMenuRef} className={`p-4 border-t border-sidebar-border transition-all duration-300 bg-sidebar/50 relative`}>
        {/* Collapsible Actions (Shown above when expanded) */}
        {!isCollapsed && isUserMenuOpen && (
          <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-hover transition-colors text-sm font-medium border border-sidebar-border/50"
            >
              <Languages size={18} />
              <span className="flex-1 text-left">{language === 'en' ? 'Arabic (العربية)' : 'English'}</span>
            </button>
            
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-text hover:bg-rose-500/10 hover:text-rose-500 transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              {t('logout')}
            </button>
          </div>
        )}

        {/* Collapsed view actions */}
        {isCollapsed && isUserMenuOpen && (
          <div className="mb-4 space-y-3 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-200">
             <button
              onClick={toggleLanguage}
              title={language === 'en' ? 'Arabic' : 'English'}
              className="p-2.5 rounded-lg text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-hover transition-colors border border-sidebar-border/50"
            >
              <Languages size={20} />
            </button>
            <button
              onClick={onLogout}
              title={t('logout')}
              className="p-2.5 rounded-lg text-sidebar-text hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}

        {/* Main Footer Section */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white border-2 border-sidebar-border shadow-sm shrink-0">
              {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sidebar-text-hover font-bold text-sm truncate uppercase tracking-tight">{user?.username || 'Admin User'}</p>
                <p className="text-sidebar-text text-[10px] uppercase tracking-wider font-medium opacity-70">{user?.mobile || 'Administrator'}</p>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`p-1 rounded-md hover:bg-sidebar-hover text-sidebar-text transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`}
            >
              <ChevronUp size={18} />
            </button>
          )}
          {isCollapsed && (
             <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`absolute -top-2 right-1/2 translate-x-1/2 p-0.5 rounded-full bg-sidebar-active text-white shadow-lg transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`}
             >
                <ChevronUp size={12} />
             </button>
          )}
        </div>
      </div>
    </div>
  );
}

