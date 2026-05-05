import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, ShoppingCart, ShoppingBag, Settings, Users, BarChart3, 
  Book, Clock, LogOut, ChevronDown, ChevronRight, ChevronUp, Wallet, 
  ShieldCheck, Languages, PanelLeftClose, PanelLeftOpen, X 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({ activePage, setActivePage, onLogout, user, isMobileOpen, onMobileClose }) {
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
      label: t('salesNReturn'), 
      icon: ShoppingCart,
      subItems: [
        { id: 'sales', label: t('sales') },
        { id: 'sales-return', label: t('salesReturn') },
        { id: 'sales-history', label: t('salesHistory') }
      ]
    },
    { 
      id: 'purchase-n-return', 
      label: t('purchaseNReturn'), 
      icon: ShoppingBag,
      subItems: [
        { id: 'purchase', label: t('purchase') },
        { id: 'purchase-return', label: t('purchaseReturn') }
      ]
    },
    { 
      id: 'accounts', 
      label: t('accounts'), 
      icon: Book,
      subItems: [
        { id: 'chart-of-accounts', label: t('chartOfAccounts') },
        { id: 'customers-account', label: t('customerAccount') },
        { id: 'supplier-accounts', label: t('supplierAccount') },
        { id: 'purchase-accounts', label: t('purchaseAccount') },
        { id: 'accounts', label: t('bankNCashAccounts') },
        { id: 'expense-accounts', label: t('expenseAccounts') }
      ]
    },
    {
      id: 'transactions',
      label: t('transactions'),
      icon: Wallet,
      subItems: [
        { id: 'customer-receivable', label: t('customerReceivable') },
        { id: 'supplier-payable', label: t('supplierPayable') },
        { id: 'general-voucher', label: t('generalVoucherEntry') },
        { id: 'expense-entry', label: t('expenseEntry') },
        { id: 'employee-salary', label: t('employeesSalaryEntry') }
      ]
    },
    { 
      id: 'lookup-master', 
      label: t('lookupMaster'), 
      icon: Settings,
      subItems: [
        { id: 'item-group', label: t('itemGroup') },
        { id: 'unit-master', label: t('unitMaster') }
      ]
    },
    {
      id: 'admin-setup',
      label: t('adminSetup'),
      icon: ShieldCheck,
      subItems: [
        { id: 'transaction-types', label: t('transactionTypes') },
        { id: 'user-privileges', label: t('userPrivileges') },
        { id: 'user-info', label: t('userInfo') },
        { id: 'translation-manager', label: t('translationManager') }
      ]
    },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const toggleMenu = (id) => {
    setOpenMenus(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePageSelect = (id) => {
    setActivePage(id);
    if (onMobileClose) onMobileClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onMobileClose}
      />

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sidebar-active rounded-lg flex items-center justify-center">
                <BarChart3 className="text-white" size={18} />
              </div>
              <span className="font-black text-white uppercase tracking-tighter text-xl">EazyERP</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 bg-sidebar-active rounded-lg flex items-center justify-center mx-auto">
              <BarChart3 className="text-white" size={22} />
            </div>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <button 
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-sidebar-hover text-sidebar-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <div key={item.id} className="space-y-1">
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all group
                      ${openMenus.includes(item.id) ? 'bg-sidebar-hover text-white' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className={openMenus.includes(item.id) ? 'text-sidebar-active' : 'group-hover:text-sidebar-active transition-colors'} />
                      {!isCollapsed && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      openMenus.includes(item.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </button>
                  
                  {openMenus.includes(item.id) && !isCollapsed && (
                    <div className="ml-4 pl-4 border-l border-sidebar-border mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                      {item.subItems.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handlePageSelect(sub.id)}
                          className={`
                            w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                            ${activePage === sub.id ? 'bg-sidebar-active text-white shadow-lg shadow-indigo-500/20' : 'text-sidebar-text/70 hover:text-white hover:bg-sidebar-hover/50'}
                          `}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => handlePageSelect(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all group
                    ${activePage === item.id ? 'bg-sidebar-active text-white shadow-lg shadow-indigo-500/20' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <item.icon size={20} className={activePage === item.id ? 'text-white' : 'group-hover:text-sidebar-active transition-colors'} />
                  {!isCollapsed && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer / User Profile */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`
                w-full flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-hover transition-all
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-inner shrink-0">
                {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-xs font-black text-white uppercase tracking-wider truncate">{user?.username || 'Admin'}</p>
                  <p className="text-[10px] text-sidebar-text/50 font-bold truncate">Professional Account</p>
                </div>
              )}
            </button>

            {/* User Menu Popup */}
            {isUserMenuOpen && (
              <div className={`
                absolute bottom-full left-0 w-64 bg-sidebar border border-sidebar-border rounded-2xl shadow-2xl p-2 mb-2 z-[60]
                animate-in zoom-in-95 slide-in-from-bottom-2 duration-150
                ${isCollapsed ? 'ml-2' : ''}
              `}>
                <div className="px-3 py-2 border-b border-sidebar-border mb-1">
                  <p className="text-xs font-black text-white uppercase">User Control Center</p>
                </div>
                <button 
                  onClick={toggleLanguage}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all text-xs font-bold"
                >
                  <Languages size={16} />
                  {language === 'ar' ? 'English (US)' : 'العربية (Arabic)'}
                </button>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all text-xs font-bold"
                >
                  <LogOut size={16} />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
