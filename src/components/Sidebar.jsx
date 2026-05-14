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
      id: 'stock-master',
      label: t('Stock Master'),
      icon: ShoppingBag,
      subItems: [
        { id: 'item-creation', label: t('Item Creation/Edit') },
        { id: 'divider_sm_1' },
        { id: 'opening-stock', label: t('Opening stock/Price Update') },
        { id: 'item-search', label: t('Item Search') },
        { id: 'update-stock', label: t('Update Stock') },
        { id: 'divider_sm_2' },
        { id: 'project-master', label: t('Project Master') },
        { id: 'stock-transfer', label: t('Stock Transfer') },
        { id: 'stock-adjust', label: t('Stock Adjust') },
        { id: 'divider_sm_3' },
        { id: 'item-group', label: t('itemGroup') },
        { id: 'unit-master', label: t('unitMaster') }
      ]
    },
    { 
      id: 'sales-n-return', 
      label: t('salesNReturn'), 
      icon: ShoppingCart,
      subItems: [
        { id: 'sales', label: t('sales') },
        { id: 'sales-return', label: t('salesReturn') },
        { id: 'sales-history', label: t('salesHistory') },
        { id: 'quotation-entry', label: t('Quotation Entry') },
        { id: 'active-quotations', label: t('activeQuotations') },
        { id: 'delivery-note', label: t('Delivery Note') },
        { id: 'delivery-history', label: 'Delivery History' },
        { id: 'item-issue', label: t('Item Issue') },
        { id: 'divider_sales_1' },
        { id: 'zatca-submission-sales', label: t('Zatca Submission') },
        { id: 'divider_sales_2' },
        { id: 'day-close', label: t('Day Close') }
      ]
    },
    { 
      id: 'purchase-n-return', 
      label: t('purchaseNReturn'), 
      icon: ShoppingBag,
      subItems: [
        { id: 'purchase', label: t('purchase') },
        { id: 'purchase-return', label: t('purchaseReturn') },
        { id: 'purchase-history', label: 'Purchase History' },
        { id: 'item-receivable', label: t('Item Receivable') },
        { id: 'purchase-expense', label: t('Purchase Expense') }
      ]
    },
    {
      id: 'stock-invoice-report',
      label: t('Stock & Invoice Report'),
      icon: BarChart3,
      subItems: [
        { id: 'stock-report', label: t('Stock Report') },
        { id: 'stock-report-warehouse', label: t('Stock Report By Warehouse') },
        { id: 'divider_sir_1' },
        { id: 'invoice-report', label: t('Invoice Report') },
        { id: 'divider_sir_2' },
        { id: 'stock-movement', label: t('Stock Movement detail') },
        { id: 'vat-report', label: t('VAT Report') },
        { id: 'daily-sales-purchase', label: t('Daily Sales N Purchase') },
        { id: 'divider_sir_3' },
        { id: 'customer-report', label: t('Customer Report') },
        { id: 'supplier-report', label: t('Supplier Report') }
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
        { id: 'expense-accounts', label: t('expenseAccounts') },
        { id: 'currency-master', label: t('Currency Master') },
        { id: 'cost-center', label: t('Cost Center') },
        { id: 'acc-department', label: t('Acc department') },
        { id: 'divider_acc_1' },
        { id: 'financial-session', label: t('Financial Session') },
        { id: 'transaction-search', label: t('Transaction Search') }
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
        { id: 'employee-salary', label: t('Emp. Salary Pay') }
      ]
    },
    {
      id: 'accounts-report',
      label: t('Accounts Report'),
      icon: Book,
      subItems: [
        { id: 'accounts-summary', label: t('Accounts Summary') },
        { id: 'accounts-detail', label: t('Accounts Detail') },
        { id: 'cash-bank-report', label: t('Cash N Bank Report') }
      ]
    },
    {
      id: 'finance-report',
      label: t('Finance Report'),
      icon: BarChart3,
      subItems: [
        { id: 'income-expense', label: t('Income and Expense') },
        { id: 'trial-balance', label: t('Trial Balance') },
        { id: 'profit-loss', label: t('Profit and Loss') },
        { id: 'balance-sheet', label: t('Balance Sheet') }
      ]
    },
    {
      id: 'admin-setup',
      label: t('adminSetup'),
      icon: ShieldCheck,
      subItems: [
        { id: 'application-setup', label: t('Application Setup') },
        { id: 'transaction-types', label: t('transactionTypes') },
        { id: 'user-privileges', label: t('userPrivileges') },
        { id: 'user-info', label: t('userInfo') },
        { id: 'translation-manager', label: t('translationManager') },
        { id: 'company-info', label: t('Company Info') },
        { id: 'common-setting', label: t('Common Setting') },
        { id: 'entry-settings', label: t('Entry Settings') },
        { id: 'zatca-config', label: t('Zatca Config') }
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
                        sub.id.startsWith('divider') ? (
                          <div key={sub.id} className="h-px bg-sidebar-border my-1.5 opacity-50 mx-2" />
                        ) : (
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
                        )
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
