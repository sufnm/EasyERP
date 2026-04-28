import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User, ChevronDown } from 'lucide-react';
import { useCache } from '../context/CacheContext';

export default function CustomerDetails({ customer, setCustomer, vatNumber, setVatNumber }) {
  const { isReady, searchCustomers } = useCache();
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [saveCustomer, setSaveCustomer] = useState(false);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const nameInputRef = useRef(null);
  const vatInputRef = useRef(null);

  // Fetch default customer on mount (Special case for startup)
  useEffect(() => {
    const fetchDefault = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/customers/search?q=CASH SALE`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setCustomer({ id: data[0].ACC_NO, name: data[0].ACC_NAME });
          }
        }
      } catch (err) {
        console.error("Failed to fetch default customer:", err);
        setCustomer({ id: '6000', name: 'CASH SALE' }); 
      }
    };
    fetchDefault();
  }, []);

  const handleSearch = (query) => {
    if (query === undefined || query === null) {
      setSearchResults([]);
      return;
    }
    
    // Performance: Use local cache search instead of API
    let results = searchCustomers(query);

    // Add 999 option if it matches query or if query is empty
    const queryLower = query.toLowerCase();
    if ('999'.includes(queryLower) || 'new customer'.includes(queryLower) || query === '') {
      // Check if not already in results
      if (!results.find(r => r.ACC_NO === '999')) {
        results = [{ ACC_NO: '999', ACC_NAME: 'NEW CUSTOMER' }, ...results];
      }
    }

    setSearchResults(results);
    setShowDropdown(true);
    updateDropdownPosition();
  };

  const selectFirstResult = () => {
    if (searchResults.length > 0) {
      selectCustomer(searchResults[0]);
    }
  };

  const updateDropdownPosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (showDropdown) {
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [showDropdown, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCustomer = (selected) => {
    setCustomer({ id: selected.ACC_NO, name: selected.ACC_NAME });
    setSearchResults([]);
    setShowDropdown(false);

    if (selected.ACC_NO === '999') {
      setTimeout(() => nameInputRef.current?.focus(), 10);
    }
  };

  const toggleDropdown = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      setCustomer({ id: '', name: '' }); // Clear the box as requested
      handleSearch('');
      // Auto-focus after clearing
      setTimeout(() => nameInputRef.current?.focus(), 10);
    }
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
          Customer Info
        </h2>
        <div className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded uppercase tracking-tighter">
          BAL: SAR 0.00
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">Selected Customer</label>
          <div 
            ref={containerRef}
            className="flex border border-border rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-indigo-50 dark:focus-within:ring-indigo-900/20 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 relative"
          >
            <input 
              type="text" 
              value={customer.id}
              onChange={(e) => {
                const val = e.target.value;
                setCustomer({ ...customer, id: val });
                handleSearch(val);
                if (val === '999') {
                  setCustomer({ id: '999', name: '' });
                  setTimeout(() => nameInputRef.current?.focus(), 10);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  selectFirstResult();
                }
              }}
              className="w-16 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 px-2 py-1.5 text-sm outline-none text-zinc-500 dark:text-zinc-400 font-bold text-center" 
            />
            <input 
              ref={nameInputRef}
              type="text" 
              value={customer.name}
              onChange={(e) => {
                setCustomer({ ...customer, name: e.target.value });
                handleSearch(e.target.value);
              }}
              onClick={() => {
                if (!showDropdown) toggleDropdown();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (customer.id === '999') {
                    vatInputRef.current?.focus();
                  } else {
                    selectFirstResult();
                  }
                }
              }}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
              className="flex-1 bg-card px-3 py-1.5 text-sm outline-none font-bold text-zinc-800 dark:text-zinc-100 w-0 min-w-0" 
            />
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleDropdown();
              }}
              className="w-8 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 dark:text-zinc-500 hover:text-primary"
            >
              <ChevronDown size={14} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {customer.id === '999' && (
            <div className="mt-2 flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <input 
                type="checkbox" 
                id="saveCustomer"
                checked={saveCustomer}
                onChange={(e) => setSaveCustomer(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <label htmlFor="saveCustomer" className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tight cursor-pointer hover:text-primary transition-colors">
                Save Customer
              </label>
            </div>
          )}
          
          {showDropdown && searchResults.length > 0 && createPortal(
            <div 
              ref={dropdownRef}
              style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 9999
              }}
              className="bg-card border border-border shadow-2xl rounded-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto"
            >
              {searchResults.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => selectCustomer(item)}
                  className="p-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-0 flex justify-between items-center group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-card-foreground text-sm group-hover:text-primary">{item.ACC_NAME}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Acc No: {item.ACC_NO}</span>
                  </div>
                  <div className="p-2 rounded-full bg-zinc-50 dark:bg-zinc-900 group-hover:bg-primary/20 transition-colors">
                    <User size={16} className="text-zinc-400 dark:text-zinc-500 group-hover:text-primary" />
                  </div>
                </div>
              ))}
            </div>,
            document.body
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">VAT Number</label>
          <input 
            ref={vatInputRef}
            type="text" 
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="VAT #"
            className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all hover:border-zinc-300 dark:hover:border-zinc-600 font-medium dark:text-zinc-200" 
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">Warehouse</label>
          <div className="relative">
            <select className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm appearance-none focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
              <option>Batha</option>
              <option>Main Warehouse</option>
            </select>
             <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-400 dark:text-zinc-600">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

