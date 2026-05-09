import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ReceiptText } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function InvoiceHeader({ 
  invoiceNo, 
  warehouses = [], 
  selectedWarehouse, 
  setSelectedWarehouse,
  isReturn = false,
  onInvoiceSelect,
  selectedInvoice = null,
  onReferenceChange,
  referenceNo = '',
  hideInvoiceNo = false,
  isPurchase = false,
  isDelivery = false,
  onReferenceSelect = null,
  selectedRefSourceDoc = null,
  onClearRef = null
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const [sourceType, setSourceType] = useState(null);
  const [showSourceMenu, setShowSourceMenu] = useState(false);

  const getLocalDate = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  const handleSearch = async (val) => {
    setSearchTerm(val);
    if (val.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      const endpoint = isPurchase ? API_ENDPOINTS.PURCHASE_HISTORY : API_ENDPOINTS.SALES_HISTORY;
      const trnTypes = isPurchase ? '1,2' : '6,7';
      
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(val)}&trnType=${trnTypes}&searchField=INVOICE_NO`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Failed to search invoices:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeliverySearch = async (val) => {
    setSearchTerm(val);
    if (val.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      const trnTypes = sourceType === 'quotation' ? '19' : '6,7';
      const res = await fetch(`${API_ENDPOINTS.SALES_HISTORY}?q=${encodeURIComponent(val)}&trnType=${trnTypes}&searchField=INVOICE_NO`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Failed to search delivery references:", err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
      if (!e.target.closest('.source-menu-btn-container')) {
        setShowSourceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
      <div className={`grid grid-cols-2 ${isDelivery ? 'md:grid-cols-5' : hideInvoiceNo ? 'md:grid-cols-4' : 'md:grid-cols-5'} gap-3`}>
        {!isReturn ? (
          <>
            {!hideInvoiceNo && (
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Inv. No</label>
                <input 
                  type="text" 
                  value={invoiceNo}
                  readOnly
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-bold text-zinc-700 dark:text-zinc-300 outline-none" 
                />
              </div>
            )}
            
            {isDelivery ? (
              <div className="col-span-2 relative">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Ref #</label>
                <div className="relative flex items-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-indigo-50 dark:focus-within:ring-indigo-950/20 rounded-lg pr-1 group transition-all duration-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Search size={16} />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={selectedRefSourceDoc ? `${sourceType === 'quotation' ? 'QTN' : 'INV'} #${selectedRefSourceDoc.INVOICE_NO}` : (!sourceType ? referenceNo : searchTerm)}
                    onChange={(e) => {
                      if (!selectedRefSourceDoc) {
                        if (sourceType) {
                          setSearchTerm(e.target.value);
                          handleDeliverySearch(e.target.value);
                        } else {
                          // Manual entry mode
                          if (onReferenceChange) onReferenceChange(e.target.value);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !selectedRefSourceDoc) {
                        if (searchResults.length > 0) {
                          e.preventDefault();
                          if (onReferenceSelect) {
                            onReferenceSelect(searchResults[0], sourceType);
                          }
                          setShowDropdown(false);
                          setTimeout(() => {
                            const firstRowInput = document.getElementById('itemCode-0') || document.querySelector('[id^="itemCode-"]');
                            if (firstRowInput) {
                              firstRowInput.focus();
                              firstRowInput.select();
                            }
                          }, 150);
                        }
                      }
                    }}
                    placeholder={!sourceType ? "Enter manual Reference #..." : sourceType === 'quotation' ? "Search Quote #..." : "Search Invoice #..."}
                    readOnly={!!selectedRefSourceDoc}
                    className={`w-full pl-10 pr-[80px] py-1.5 text-sm rounded-lg border-0 outline-none bg-transparent transition-all font-medium ${
                      selectedRefSourceDoc
                        ? 'text-indigo-700 dark:text-indigo-400 font-bold'
                        : 'dark:text-zinc-200 text-zinc-800'
                    }`}
                  />
                  
                  {/* Button group / menu toggle at the end of the input field */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-1 gap-1">
                    {selectedRefSourceDoc ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          if (onClearRef) onClearRef();
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-500 rounded-md transition-colors mr-1"
                        title="Clear reference"
                      >
                        <X size={15} />
                      </button>
                    ) : isSearching ? (
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                    ) : null}

                    {/* Source Selection Button & Dropdown */}
                    <div className="relative source-menu-btn-container">
                      <button
                        type="button"
                        onClick={() => !selectedRefSourceDoc && setShowSourceMenu(!showSourceMenu)}
                        disabled={!!selectedRefSourceDoc}
                        className="flex items-center gap-1.5 h-7 px-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 text-[10px] font-bold rounded-md border border-zinc-200 dark:border-zinc-700/60 transition-all duration-300 active:scale-95 disabled:opacity-50"
                      >
                        <span>{sourceType === 'quotation' ? 'Quote' : sourceType === 'invoice' ? 'Invoice' : 'Source'}</span>
                        <svg className="w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Tiny Dropdown Menu */}
                      {showSourceMenu && (
                        <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 shadow-xl rounded-xl py-1 z-[10000] animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            type="button"
                            onClick={() => {
                              setSourceType('quotation');
                              setSearchTerm('');
                              if (onReferenceChange) onReferenceChange('');
                              setShowSourceMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors flex items-center justify-between ${sourceType === 'quotation' ? 'text-primary font-bold bg-primary/5' : 'text-zinc-600 dark:text-zinc-300'}`}
                          >
                            <span>Quotation</span>
                            {sourceType === 'quotation' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSourceType('invoice');
                              setSearchTerm('');
                              if (onReferenceChange) onReferenceChange('');
                              setShowSourceMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors flex items-center justify-between ${sourceType === 'invoice' ? 'text-primary font-bold bg-primary/5' : 'text-zinc-600 dark:text-zinc-300'}`}
                          >
                            <span>Invoice</span>
                            {sourceType === 'invoice' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                          <div className="h-px bg-zinc-100 dark:bg-zinc-800/80 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setSourceType(null);
                              setSearchTerm('');
                              if (onReferenceChange) onReferenceChange('');
                              setShowSourceMenu(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors flex items-center justify-between ${sourceType === null ? 'text-primary font-bold bg-primary/5' : 'text-zinc-600 dark:text-zinc-300'}`}
                          >
                            <span>None (Manual)</span>
                            {sourceType === null && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={hideInvoiceNo ? "col-span-1" : ""}>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Ref #</label>
                <input 
                  type="text" 
                  placeholder="Reference"
                  value={referenceNo}
                  onChange={(e) => onReferenceChange && onReferenceChange(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/10 outline-none transition-all hover:border-zinc-300 dark:text-zinc-200" 
                />
              </div>
            )}
          </>
        ) : (
          <div className="col-span-2 relative">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">
              Return From Invoice
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                {selectedInvoice ? <ReceiptText size={16} className="text-blue-500" /> : <Search size={16} />}
              </div>
              <input 
                ref={inputRef}
                type="text" 
                value={selectedInvoice ? `INV #${selectedInvoice.INVOICE_NO} ${selectedInvoice.ENAME}` : searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!selectedInvoice) {
                    setSearchTerm(val);
                    handleSearch(val);
                    if (onReferenceChange) onReferenceChange(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !selectedInvoice) {
                    if (searchResults.length > 0) {
                      onInvoiceSelect(searchResults[0]);
                    }
                    setShowDropdown(false);
                    setTimeout(() => {
                      const firstRowInput = document.querySelector('[id^="itemCode-"]');
                      if (firstRowInput) {
                        firstRowInput.focus();
                        firstRowInput.select();
                      }
                    }, 150);
                  }
                }}
                placeholder="Search Invoice #..."
                className={`w-full pl-10 pr-10 py-1.5 text-sm rounded-lg border outline-none transition-all ${
                  selectedInvoice 
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold' 
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-800 focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/10'
                }`}
                readOnly={!!selectedInvoice}
              />
              {selectedInvoice ? (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    onInvoiceSelect(null);
                    if (onReferenceChange) onReferenceChange('');
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              ) : isSearching ? (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Warehouse</label>
          <div className="relative">
            <select 
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm appearance-none focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/10 outline-none hover:border-zinc-300 transition-all cursor-pointer font-medium text-zinc-700 dark:text-zinc-200"
            >
              {warehouses.map(w => (
                <option key={w.WR_CODE} value={String(w.WR_CODE)}>
                  {w.WR_NAME}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Salesman</label>
          <div className="relative">
            <select className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm appearance-none focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/10 outline-none hover:border-zinc-300 transition-all cursor-pointer font-medium text-zinc-700 dark:text-zinc-200">
              <option>Admin</option>
              <option>John Doe</option>
              <option>Jane Smith</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
        </div>

        <div>
           <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 px-1">Date</label>
           <input 
            type="date" 
            value={getLocalDate()}
            readOnly
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 outline-none" 
          />
        </div>
      </div>

      {showDropdown && searchResults.length > 0 && createPortal(
        <div 
          ref={dropdownRef}
          className="bg-card border border-border shadow-2xl rounded-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 border-zinc-200 dark:border-zinc-800 shadow-indigo-500/5"
          style={{
            position: 'fixed',
            top: inputRef.current?.getBoundingClientRect().bottom + window.scrollY,
            left: inputRef.current?.getBoundingClientRect().left,
            width: inputRef.current?.getBoundingClientRect().width,
            zIndex: 9999
          }}
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {searchResults.map((s, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  if (isDelivery) {
                    if (onReferenceSelect) onReferenceSelect(s, sourceType);
                  } else {
                    if (onInvoiceSelect) onInvoiceSelect(s);
                  }
                  setShowDropdown(false);
                }}
                className="p-3 hover:bg-primary/10 cursor-pointer border-b border-border/50 last:border-0 flex justify-between items-center group transition-colors"
              >
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">
                      #{s.INVOICE_NO}
                    </span>
                    <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {isDelivery ? (sourceType === 'quotation' ? 'Quote' : 'Invoice') : 'Match'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">{s.ENAME || 'CASH CUSTOMER'}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-primary block">{Number(s.NET_AMOUNT).toFixed(2)} SAR</span>
                  <span className="text-[10px] text-zinc-400 font-medium">{new Date(s.CURDATE).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
