import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../config';
import { createPortal } from 'react-dom';
import { Truck, ChevronDown, MapPin, Trash2 } from 'lucide-react';
import { useCache } from '../context/CacheContext';
export default function SupplierDetails({ 
  supplier, 
  setSupplier, 
  vatNumber, 
  setVatNumber, 
  setAddress,
  address,
  handleAddressChange,
  validationErrors = [],
  setSelectedCurrency
}) {
  const { isReady, searchSuppliers, getAddressFromCache, updateAddressCache } = useCache();
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [saveSupplier, setSaveSupplier] = useState(false);
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [addressPopupPos, setAddressPopupPos] = useState({ top: 0, left: 0, width: 0 });
  const addressButtonRef = useRef(null);
  const addressPopupRef = useRef(null);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const nameInputRef = useRef(null);
  const vatInputRef = useRef(null);

  // Fetch default supplier on mount
  useEffect(() => {
    const fetchDefault = async () => {
      try {
        const res = await fetch(`${API_ENDPOINTS.SUPPLIER_SEARCH}?q=CASH PURCHASE`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setSupplier({ id: data[0].ACC_NO, name: data[0].ACC_NAME });
            // Also fetch info for default supplier to set correct default currency!
            try {
              const infoRes = await fetch(API_ENDPOINTS.SUPPLIER_INFO(data[0].ACC_NO));
              if (infoRes.ok) {
                const info = await infoRes.json();
                if (info && setSelectedCurrency) {
                  setSelectedCurrency(info.currency ? Number(info.currency) : 1);
                }
              }
            } catch (err) {
              console.error("Failed to fetch default supplier info:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch default supplier:", err);
        setSupplier({ id: '', name: 'CASH PURCHASE' }); 
        if (setSelectedCurrency) setSelectedCurrency(1);
      }
    };
    fetchDefault();
  }, []);

  const handleSearch = async (query) => {
    if (query === undefined || query === null) {
      setSearchResults([]);
      return;
    }
    
    // 1. Try local cache first
    let results = searchSuppliers(query);

    // 2. If cache is empty, fallback to API search
    if (results.length === 0 && query !== '999') {
      try {
        const res = await fetch(`${API_ENDPOINTS.SUPPLIER_SEARCH}?q=${encodeURIComponent(query || '')}`);
        if (res.ok) {
          const apiData = await res.json();
          const q = (query || '').toLowerCase();
          results = apiData.filter(s => 
            (s.ACC_NO && String(s.ACC_NO).toLowerCase().includes(q)) || 
            (s.ACC_NAME && s.ACC_NAME.toLowerCase().includes(q))
          );
        }
      } catch (err) {
        console.error("Supplier API search failed:", err);
      }
    }
    
    // Add 999 option for new supplier
    const queryLower = (query || '').toLowerCase();
    if (queryLower === '' || '999'.includes(queryLower) || 'new supplier'.includes(queryLower)) {
      if (!results.find(r => String(r.ACC_NO) === '999')) {
        results = [{ ACC_NO: '999', ACC_NAME: 'NEW SUPPLIER' }, ...results];
      }
    }

    setSearchResults(results);
    setShowDropdown(true);
    updateDropdownPosition();
  };

  const selectFirstResult = () => {
    if (searchResults.length > 0) {
      selectSupplier(searchResults[0]);
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

  const updateAddressPopupPosition = useCallback(() => {
    if (addressButtonRef.current) {
      const rect = addressButtonRef.current.getBoundingClientRect();
      const popupWidth = 400;
      let left = rect.right - popupWidth;
      if (left < 20) left = 20;

      setAddressPopupPos({
        top: rect.bottom + 8,
        left: left,
        width: popupWidth
      });
    }
  }, []);

  useEffect(() => {
    if (showAddressPopup) {
      window.addEventListener('scroll', updateAddressPopupPosition, true);
      window.addEventListener('resize', updateAddressPopupPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateAddressPopupPosition, true);
      window.removeEventListener('resize', updateAddressPopupPosition);
    };
  }, [showAddressPopup, updateAddressPopupPosition]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressPopupRef.current && !addressPopupRef.current.contains(event.target) && 
          addressButtonRef.current && !addressButtonRef.current.contains(event.target)) {
        setShowAddressPopup(false);
      }
    };
    if (showAddressPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddressPopup]);

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

  const selectSupplier = async (selected) => {
    setSupplier({ id: selected.ACC_NO, name: selected.ACC_NAME });
    setSearchResults([]);
    setShowDropdown(false);

    if (selected && selected.ACC_NO && selected.ACC_NO !== '999' && setAddress) {
      const cachedInfo = getAddressFromCache(selected.ACC_NO);
      if (cachedInfo) {
        setAddress({
          street: cachedInfo.street_name || '',
          city: cachedInfo.city_name || '',
          district: cachedInfo.district || '',
          building: cachedInfo.building_no || '',
          pincode: cachedInfo.postal_zone || ''
        });
        if (setSelectedCurrency) {
          setSelectedCurrency(cachedInfo.currency ? Number(cachedInfo.currency) : 1);
        }
        return;
      }

      try {
        const res = await fetch(API_ENDPOINTS.SUPPLIER_INFO(selected.ACC_NO));
        if (res.ok) {
          const info = await res.json();
          if (info) {
            updateAddressCache(selected.ACC_NO, info);
            setAddress({
              street: info.street_name || '',
              city: info.city_name || '',
              district: info.district || '',
              building: info.building_no || '',
              pincode: info.postal_zone || ''
            });
            if (setSelectedCurrency) {
              setSelectedCurrency(info.currency ? Number(info.currency) : 1);
            }
          } else {
            setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
            if (setSelectedCurrency) {
              setSelectedCurrency(1);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch supplier address info:", err);
      }
    }

    if (String(selected.ACC_NO) === '999') {
      setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
          nameInputRef.current.select();
        }
      }, 50);
    }
  };

  const toggleDropdown = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      setSupplier({ id: '', name: '' });
      handleSearch('');
      setTimeout(() => nameInputRef.current?.focus(), 10);
    }
  };

  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">Selected Supplier</label>
          <div 
            ref={containerRef}
            className="flex border border-border rounded-lg overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-indigo-50 dark:focus-within:ring-indigo-900/20 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 relative"
          >
            <input 
              type="text" 
              value={supplier.id}
              onChange={(e) => {
                const val = e.target.value;
                setSupplier({ ...supplier, id: val });
                handleSearch(val);
                if (String(val) === '999') {
                  setSupplier({ id: '999', name: '' });
                  setTimeout(() => {
                    if (nameInputRef.current) {
                      nameInputRef.current.focus();
                      nameInputRef.current.select();
                    }
                  }, 50);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') selectFirstResult();
              }}
              className="w-16 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 px-2 py-1.5 text-sm outline-none text-zinc-500 dark:text-zinc-400 font-bold text-center" 
            />
            <input 
              ref={nameInputRef}
              type="text" 
              value={supplier.name}
              onChange={(e) => {
                setSupplier({ ...supplier, name: e.target.value });
                handleSearch(e.target.value);
              }}
              onClick={() => {
                if (!showDropdown) toggleDropdown();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (supplier.id === '999') {
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

          {supplier.id === '999' && (
            <div className="mt-2 flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <input 
                type="checkbox" 
                id="saveSupplier"
                checked={saveSupplier}
                onChange={(e) => setSaveSupplier(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
              />
              <label htmlFor="saveSupplier" className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tight cursor-pointer hover:text-primary transition-colors">
                Save Supplier
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
                  onClick={() => selectSupplier(item)}
                  className="p-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-0 flex justify-between items-center group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-card-foreground text-sm group-hover:text-primary">{item.ACC_NAME}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Acc No: {item.ACC_NO}</span>
                  </div>
                  <div className="p-2 rounded-full bg-zinc-50 dark:bg-zinc-900 group-hover:bg-primary/20 transition-colors">
                    <Truck size={16} className="text-zinc-400 dark:text-zinc-500 group-hover:text-primary" />
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
          <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">Address Details</label>
          <button
            ref={addressButtonRef}
            type="button"
            onClick={() => {
              if (!showAddressPopup) updateAddressPopupPosition();
              setShowAddressPopup(!showAddressPopup);
            }}
            className={`w-full flex items-center justify-between gap-2 py-1.5 px-3 rounded-lg border text-xs transition-all h-[38px] ${
              showAddressPopup 
                ? 'border-primary ring-2 ring-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-500/10 text-primary' 
                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-primary hover:text-primary'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <MapPin size={14} className={showAddressPopup ? 'text-primary' : 'text-zinc-400'} />
              <span className="truncate font-bold uppercase tracking-tight">
                {address.city ? `${address.building} ${address.street}, ${address.city}`.trim() : 'Click to add address'}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showAddressPopup ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showAddressPopup && createPortal(
          <div 
            ref={addressPopupRef}
            style={{
              position: 'fixed',
              top: addressPopupPos.top,
              left: addressPopupPos.left,
              width: addressPopupPos.width,
              zIndex: 9999
            }}
            className="bg-card border border-border shadow-2xl rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-1 w-4 bg-primary rounded-full"></div>
                <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">Address Details</h3>
              </div>
              <button onClick={() => setShowAddressPopup(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="grid grid-cols-12 gap-x-3 gap-y-3">
              <div className="col-span-4">
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 px-1">Bld #</label>
                <input type="text" value={address.building} onChange={(e) => handleAddressChange('building', e.target.value)} placeholder="#" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm outline-none dark:text-zinc-200" />
              </div>
              <div className="col-span-8">
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 px-1">Street</label>
                <input type="text" value={address.street} onChange={(e) => handleAddressChange('street', e.target.value)} placeholder="Street Details" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm outline-none dark:text-zinc-200" />
              </div>
              <div className="col-span-12">
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 px-1">District</label>
                <input type="text" value={address.district} onChange={(e) => handleAddressChange('district', e.target.value)} placeholder="District Name" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm outline-none dark:text-zinc-200" />
              </div>
              <div className="col-span-7">
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 px-1">City</label>
                <input type="text" value={address.city} onChange={(e) => handleAddressChange('city', e.target.value)} placeholder="City" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm outline-none dark:text-zinc-200" />
              </div>
              <div className="col-span-5">
                <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1 px-1">Pincode</label>
                <input type="text" value={address.pincode} onChange={(e) => handleAddressChange('pincode', e.target.value)} placeholder="Pincode" className="w-full bg-zinc-50 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm outline-none dark:text-zinc-200" />
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <button type="button" onClick={() => setAddress({ street: '', city: '', district: '', building: '', pincode: '' })} className="text-[10px] font-black text-zinc-400 hover:text-rose-500 transition-colors uppercase tracking-widest flex items-center gap-1 px-2 py-1">
                <Trash2 size={12} /> Clear Address
              </button>
              <button type="button" onClick={() => setShowAddressPopup(false)} className="px-6 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-widest">
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
