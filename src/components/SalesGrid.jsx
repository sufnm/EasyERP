import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, PlusCircle } from 'lucide-react';
import { useCache } from '../context/CacheContext';
import { API_ENDPOINTS } from '../config';

export default function SalesGrid({ 
  initialData = [], 
  rows, 
  setRows, 
  visibleColumns = {}, 
  enterToQty = false, 
  taxIncluded = true,
  restrictedItems = null,
  isPurchase = false
}) {
  const { searchItems, cachedUnits } = useCache();
  const [searchResults, setSearchResults] = useState([]);
  const [unitSearchResults, setUnitSearchResults] = useState([]);
  const [activeSearchId, setActiveSearchId] = useState(null);
  const [activeUnitSearchId, setActiveUnitSearchId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = React.useRef(null);

  const updateDropdownPosition = React.useCallback(() => {
    const activeId = activeSearchId || activeUnitSearchId;
    if (activeId) {
      const inputId = activeSearchId ? `itemCode-${activeSearchId}` : `unit-${activeUnitSearchId}`;
      const input = document.getElementById(inputId);
      if (input) {
        const rect = input.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    }
  }, [activeSearchId, activeUnitSearchId]);

  React.useEffect(() => {
    if (activeSearchId || activeUnitSearchId) {
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      updateDropdownPosition();
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [activeSearchId, activeUnitSearchId, updateDropdownPosition]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearchResults([]);
        setActiveSearchId(null);
        setUnitSearchResults([]);
        setActiveUnitSearchId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (initialData.length > 0) {
      // Map initial data to grid structure
      const mappedRows = initialData.map((d, index) => ({
        id: Date.now() + index,
        itemCode: d.itemCode || d.id || '',
        description: d.description || d.name || '',
        unit: d.unit || '',
        qty: d.qty || '',
        price: d.price || 0,
        aliasCode: '',
        vatAmt: '',
        vatPercent: d.vatPercent || 0,
        total: '',
        stock: ''
      }));
      setRows(mappedRows);
    }
  }, [initialData]);

  const updateRow = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id !== id) return row;
      
      let finalValue = value;
      
      // RESTRICTION: Clamp Quantity if restrictedItems is active
      if (field === 'qty' && restrictedItems) {
        const originalItem = restrictedItems.find(i => i.BARCODE === row.itemCode);
        if (originalItem) {
          const maxQty = Number(originalItem.QTY);
          if (Number(value) > maxQty) {
            alert(`Maximum return quantity for this item is ${maxQty}`);
            finalValue = maxQty;
          }
        }
      }

      // Sync 'price' with 'purchasePrice' or 'salePrice' if relevant
      let extra = {};
      if (field === 'purchasePrice' && isPurchase) extra.price = finalValue;
      if (field === 'salePrice' && !isPurchase) extra.price = finalValue;

      return { ...row, [field]: finalValue, ...extra };
    }));
  };

  const handleItemSearch = async (id, codeQuery, isSelection = false) => {
    // Allow empty query if in restricted mode to show all invoice items
    if (!codeQuery && !restrictedItems) {
      setSearchResults([]);
      setActiveSearchId(null);
      return;
    }
    
    if (codeQuery === '999') {
      setSearchResults([]);
      setActiveSearchId(null);
      selectItem(id, {
        BARCODE: '999',
        DESCRIPTION: '',
        SALE_PRICE: 0,
        VAT_PERCENT: 0,
        ITEM_CODE: '999',
        isManual: true
      });
      return;
    }

    let data = [];

    // IF RESTRICTED: Search only within provided items
    if (restrictedItems) {
      const q = (codeQuery || '').toLowerCase();
      data = restrictedItems.filter(i => 
        i.BARCODE.toLowerCase().includes(q) || 
        i.DESCRIPTION.toLowerCase().includes(q)
      ).map(i => ({
        ...i,
        SALE_PRICE: i.UNIT_PRICE // Map from original invoice field names
      }));
    } else {
      // 1. Try local cache first
      data = searchItems(codeQuery);
      
      // 2. If cache is empty or returns nothing, fallback to API search
      if (!data || data.length === 0) {
        try {
          const res = await fetch(`${API_ENDPOINTS.ITEM_SEARCH}?q=${encodeURIComponent(codeQuery)}`);
          if (res.ok) {
            data = await res.json();
          }
        } catch (err) {
          console.error("API search failed:", err);
        }
      }
    }
    
    if (isSelection) {
      if (data && data.length > 0) {
        selectItem(id, data[0]);
      }
      return;
    }
    
    setSearchResults(data || []);
    setActiveSearchId(id);
    
    // Calculate position for fixed portal
    const input = document.getElementById(`itemCode-${id}`);
    if (input) {
      const rect = input.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleUnitSearch = (id, query) => {
    setActiveUnitSearchId(id);
    const q = query.toLowerCase();
    const filtered = cachedUnits.filter(u => 
      (u.Unit_Name && u.Unit_Name.toLowerCase().includes(q)) ||
      (u.Unit_id && String(u.Unit_id).includes(q))
    ).slice(0, 10);
    setUnitSearchResults(filtered);

    const input = document.getElementById(`unit-${id}`);
    if (input) {
      const rect = input.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };
  
  const getUnitName = (unitId) => {
    if (!unitId) return '';
    const unit = cachedUnits.find(u => 
      String(u.Unit_id || u.unit_id || '') === String(unitId)
    );
    return unit ? (unit.Unit_Name || unit.unit_name) : '';
  };

  const selectItem = (id, item) => {
    const wasDuplicate = rows.findIndex(r => r.id !== id && r.itemCode === item.BARCODE) !== -1;

    setRows(prevRows => {
      // Check if item already exists in another row
      const existingRowIndex = prevRows.findIndex(r => r.id !== id && r.itemCode === item.BARCODE);
      
      if (existingRowIndex !== -1) {
        const nextRows = [...prevRows];
        const existingRow = { ...nextRows[existingRowIndex] };
        const newQty = Number(existingRow.qty || 0) + 1;
        
        // RESTRICTION: Check max qty if in restricted mode
        if (restrictedItems) {
          const originalItem = restrictedItems.find(i => i.BARCODE === item.BARCODE);
          if (originalItem && newQty > Number(originalItem.QTY)) {
            alert(`Maximum return quantity for this item is ${originalItem.QTY}`);
            // Don't increment
          } else {
            existingRow.qty = newQty;
          }
        } else {
          existingRow.qty = newQty;
        }
        
        nextRows[existingRowIndex] = existingRow;
        
        // Clear the current editing row
        const currentRowIndex = nextRows.findIndex(r => r.id === id);
        nextRows[currentRowIndex] = { 
          id: id, 
          itemCode: '', 
          description: '', 
          unit: '', 
          qty: '', 
          price: '', 
          purchasePrice: '',
          salePrice: '',
          retailPrice: '',
          aliasCode: '', 
          vatAmt: '', 
          vatPercent: 0, 
          total: '', 
          stock: '' 
        };
        
        return nextRows;
      }

      // Standard logic for new item
      let nextRows = prevRows.map(row => 
        row.id === id 
          ? { 
              ...row, 
              unit: item.isManual 
                ? (cachedUnits.find(u => u.Unit_Name?.toUpperCase() === 'PCS')?.Unit_Name || '')
                : (restrictedItems ? item.UNIT : getUnitName(item.UNIT)), 
              itemCode: item.ITEM_CODE || item.BARCODE,
              description: item.DESCRIPTION || '',
              vatPercent: item.VAT_PERCENT || 0,
              qty: item.isManual ? '' : (Number(row.qty || 0) + 1),
              purchasePrice: item.AVG_PUR_PRICE || 0,
              salePrice: item.SALE_PRICE || item.price || 0,
              retailPrice: item.RETAIL_PRICE || 0,
              price: isPurchase ? (item.AVG_PUR_PRICE || 0) : (item.SALE_PRICE || item.price || 0),
              isManual: item.isManual || false
            }
          : row
      );
      
      if (!enterToQty && id === prevRows[prevRows.length - 1].id) {
         nextRows.push({ 
           id: Date.now() + 1, 
           itemCode: '', 
           description: '', 
           unit: '', 
           qty: '', 
           price: '', 
           purchasePrice: '',
           salePrice: '',
           retailPrice: '',
           aliasCode: '', 
           vatAmt: '', 
           vatPercent: 0, 
           total: '', 
           stock: '' 
         });
      }
      return nextRows;
    });

    setSearchResults([]);
    setActiveSearchId(null);

    setTimeout(() => {
      if (wasDuplicate) {
        // If it was a duplicate, stay on the CURRENT row (which we just cleared)
        const currentInput = document.getElementById(`itemCode-${id}`);
        if (currentInput) {
          currentInput.focus();
          currentInput.select();
        }
        return;
      }

      if (item.isManual) {
        document.getElementById(`description-${id}`)?.focus();
      } else if (enterToQty) {
        const qtyInput = document.getElementById(`qty-${id}`);
        qtyInput?.focus();
        qtyInput?.select();
      } else {
        // Find next row after current id
        setRows(currentRows => {
          const currentIndex = currentRows.findIndex(r => r.id === id);
          const nextRow = currentRows[currentIndex + 1];
          if (nextRow) {
             setTimeout(() => document.getElementById(`itemCode-${nextRow.id}`)?.focus(), 10);
          }
          return currentRows;
        });
      }
    }, 50);
  };

  const [isAllItemsImported, setIsAllItemsImported] = useState(false);

  React.useEffect(() => {
    if (!restrictedItems) {
      setIsAllItemsImported(false);
    }
  }, [restrictedItems]);

  const addAllFromInvoice = () => {
    if (!restrictedItems) return;
    
    const newRows = restrictedItems.map((item, idx) => ({
      id: Date.now() + idx,
      itemCode: item.BARCODE,
      description: item.DESCRIPTION,
      unit: item.UNIT,
      qty: item.QTY,
      price: item.UNIT_PRICE,
      vatPercent: item.VAT_PERCENT || 0,
      vatAmt: '',
      total: '',
      aliasCode: '',
      stock: ''
    }));
    
    setIsAllItemsImported(true);
    setRows(newRows);
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' }]);
  };

  const removeRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden mb-6 flex-1 min-h-[300px] transition-colors duration-300">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-border">
              <th className="p-3 w-10 text-center">#</th>
              {visibleColumns.itemCode && <th className="p-3 font-semibold min-w-[120px]">Item Code</th>}
              {visibleColumns.description && <th className="p-3 font-semibold min-w-[250px]">Description</th>}
              {visibleColumns.unit && <th className="p-3 font-semibold min-w-[100px]">Unit</th>}
              {visibleColumns.qty && <th className="p-3 font-semibold min-w-[80px]">QTY</th>}
              {visibleColumns.purchasePrice && <th className="p-3 font-semibold min-w-[100px]">Purchase Price</th>}
              {visibleColumns.salePrice && <th className="p-3 font-semibold min-w-[100px]">Sale Price</th>}
              {visibleColumns.retailPrice && <th className="p-3 font-semibold min-w-[100px]">Retail Price</th>}
              {visibleColumns.price && !isPurchase && <th className="p-3 font-semibold min-w-[100px]">Price</th>}
              {visibleColumns.aliasCode && <th className="p-3 font-semibold min-w-[120px]">Alias Code</th>}
              {visibleColumns.vatAmt && <th className="p-3 font-semibold min-w-[100px]">VAT Amt</th>}
              {visibleColumns.total && <th className="p-3 font-semibold min-w-[100px]">Total</th>}
              {visibleColumns.stock && <th className="p-3 font-semibold min-w-[100px]">Stock</th>}
              <th className="p-3 w-10 text-center">Act</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-border hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group">
                <td className="p-2 text-center text-zinc-400 dark:text-zinc-500 font-medium">{index + 1}</td>
                {visibleColumns.itemCode && <td className="p-1 relative">
                  <input 
                    id={`itemCode-${row.id}`}
                    type="text" 
                    value={row.itemCode}
                    onChange={(e) => {
                       updateRow(row.id, 'itemCode', e.target.value);
                       handleItemSearch(row.id, e.target.value);
                    }}
                    onFocus={() => {
                      if (restrictedItems) {
                        handleItemSearch(row.id, row.itemCode);
                      }
                    }}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter') {
                        if (!row.itemCode) {
                          updateRow(row.id, 'itemCode', 'N/A');
                        }
                        if (searchResults.length > 0) {
                          selectItem(row.id, searchResults[0]);
                        } else {
                          handleItemSearch(row.id, row.itemCode || 'N/A', true); 
                        }
                      } 
                    }}
                    className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded dark:text-zinc-200" 
                    placeholder="Scan or type..." 
                    autoComplete="off"
                  />
                  {activeSearchId === row.id && searchResults.length > 0 && createPortal(
                    <div 
                      ref={dropdownRef}
                      style={{ 
                        position: 'fixed', 
                        top: dropdownPos.top, 
                        left: dropdownPos.left, 
                        width: Math.max(dropdownPos.width, 350),
                        zIndex: 9999 
                      }}
                      className="bg-card border border-border shadow-2xl rounded-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="max-h-60 overflow-y-auto">
                        {searchResults.map((item, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => selectItem(row.id, item)}
                            className="p-3 hover:bg-primary/10 cursor-pointer border-b border-border last:border-0 flex justify-between items-center group transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-card-foreground text-sm group-hover:text-primary">{item.DESCRIPTION || 'No Description'}</span>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">Code: {item.ITEM_CODE || 'N/A'} | Barcode: {item.BARCODE || 'N/A'}</span>
                            </div>
                            <div className="text-right shrink-0">
                               <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 block">SAR {Number(isPurchase ? (item.AVG_PUR_PRICE || 0) : (item.SALE_PRICE || item.price || 0)).toFixed(2)}</span>
                               <span className="text-[10px] text-zinc-400 dark:text-zinc-500">VAT: {item.VAT_PERCENT}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>,
                    document.body
                  )}
                </td>}
                {visibleColumns.description && <td className="p-1"><input 
                  id={`description-${row.id}`}
                  type="text" 
                  value={row.description} 
                  onChange={(e) => updateRow(row.id, 'description', e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!row.description) updateRow(row.id, 'description', 'N/A');
                      document.getElementById(`unit-${row.id}`)?.focus();
                    }
                  }}
                  className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded dark:text-zinc-100" 
                /></td>}
                {visibleColumns.unit && <td className="p-1 relative"><input 
                  id={`unit-${row.id}`}
                  type="text" 
                  value={row.unit} 
                  onChange={(e) => {
                    updateRow(row.id, 'unit', e.target.value);
                    handleUnitSearch(row.id, e.target.value);
                  }} 
                  onFocus={() => handleUnitSearch(row.id, row.unit || '')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (unitSearchResults.length > 0) {
                        updateRow(row.id, 'unit', unitSearchResults[0].Unit_Name || unitSearchResults[0].unit_name);
                        setActiveUnitSearchId(null);
                      }
                      document.getElementById(`qty-${row.id}`)?.focus();
                    }
                  }}
                  className={`w-full p-2 outline-none rounded dark:text-zinc-200 ${row.isManual ? 'bg-card border border-border focus:ring-1 focus:ring-primary' : 'bg-transparent focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary'}`}
                  autoComplete="off"
                />
                {activeUnitSearchId === row.id && unitSearchResults.length > 0 && createPortal(
                  <div 
                    ref={dropdownRef}
                    style={{ 
                      position: 'fixed', 
                      top: dropdownPos.top, 
                      left: dropdownPos.left, 
                      width: dropdownPos.width,
                      zIndex: 9999 
                    }}
                    className="bg-card border border-border shadow-2xl rounded-xl mt-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    <div className="max-h-48 overflow-y-auto">
                      {unitSearchResults.map((u, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            updateRow(row.id, 'unit', u.Unit_Name || u.unit_name);
                            setActiveUnitSearchId(null);
                          }}
                          className="p-2.5 hover:bg-primary/10 cursor-pointer border-b border-border last:border-0 flex justify-between items-center group transition-colors"
                        >
                          <span className="font-bold text-card-foreground text-sm group-hover:text-primary">{u.Unit_Name || u.unit_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
                </td>}
                {visibleColumns.qty && <td className="p-1"><input 
                  id={`qty-${row.id}`} 
                  type="number" 
                  value={row.qty} 
                  onChange={(e) => updateRow(row.id, 'qty', e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!row.qty) updateRow(row.id, 'qty', '0');
                      const newId = Date.now();
                      setRows(prev => {
                        const isLast = prev[prev.length - 1].id === row.id;
                        if (isLast) {
                          const nextRows = [...prev, { id: newId, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' }];
                          setTimeout(() => document.getElementById(`itemCode-${newId}`)?.focus(), 50);
                          return nextRows;
                        } else {
                          const currentIndex = prev.findIndex(r => r.id === row.id);
                          const nextRow = prev[currentIndex + 1];
                          if (nextRow) setTimeout(() => document.getElementById(`itemCode-${nextRow.id}`)?.focus(), 10);
                          return prev;
                        }
                      });
                    }
                  }} 
                  className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-right dark:text-zinc-200" 
                /></td>}
                {visibleColumns.purchasePrice && <td className="p-1">
                  <input 
                    id={`purchasePrice-${row.id}`}
                    type="number" 
                    value={row.purchasePrice} 
                    onChange={(e) => updateRow(row.id, 'purchasePrice', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        document.getElementById(`salePrice-${row.id}`)?.focus();
                      }
                    }}
                    className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-right dark:text-zinc-200" 
                  />
                </td>}
                {visibleColumns.salePrice && <td className="p-1">
                  <input 
                    id={`salePrice-${row.id}`}
                    type="number" 
                    value={row.salePrice} 
                    onChange={(e) => updateRow(row.id, 'salePrice', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        document.getElementById(`retailPrice-${row.id}`)?.focus();
                      }
                    }}
                    className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-right dark:text-zinc-200" 
                  />
                </td>}
                {visibleColumns.retailPrice && <td className="p-1">
                  <input 
                    id={`retailPrice-${row.id}`}
                    type="number" 
                    value={row.retailPrice} 
                    onChange={(e) => updateRow(row.id, 'retailPrice', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newId = Date.now();
                        setRows(prev => {
                          const isLast = prev[prev.length - 1].id === row.id;
                          if (isLast) {
                            const nextRows = [...prev, { 
                              id: newId, itemCode: '', description: '', unit: '', qty: '', 
                              purchasePrice: '', salePrice: '', retailPrice: '', 
                              aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' 
                            }];
                            setTimeout(() => document.getElementById(`itemCode-${newId}`)?.focus(), 50);
                            return nextRows;
                          } else {
                            const currentIndex = prev.findIndex(r => r.id === row.id);
                            const nextRow = prev[currentIndex + 1];
                            if (nextRow) setTimeout(() => document.getElementById(`itemCode-${nextRow.id}`)?.focus(), 10);
                            return prev;
                          }
                        });
                      }
                    }}
                    className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-right dark:text-zinc-200" 
                  />
                </td>}
                {visibleColumns.price && !isPurchase && <td className="p-1">
                  <input 
                    id={`price-${row.id}`}
                    type="number" 
                    value={row.price} 
                    onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        document.getElementById(`aliasCode-${row.id}`)?.focus();
                      }
                    }}
                    className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-right dark:text-zinc-200" 
                  />
                </td>}
                {visibleColumns.aliasCode && <td className="p-1"><input 
                  id={`aliasCode-${row.id}`}
                  type="text" 
                  value={row.aliasCode} 
                  onChange={(e) => updateRow(row.id, 'aliasCode', e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!row.aliasCode) updateRow(row.id, 'aliasCode', 'N/A');
                      const newId = Date.now();
                      setRows(prev => {
                        const isLast = prev[prev.length - 1].id === row.id;
                        if (isLast) {
                          const nextRows = [...prev, { id: newId, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' }];
                          setTimeout(() => document.getElementById(`itemCode-${newId}`)?.focus(), 50);
                          return nextRows;
                        } else {
                          const currentIndex = prev.findIndex(r => r.id === row.id);
                          const nextRow = prev[currentIndex + 1];
                          if (nextRow) setTimeout(() => document.getElementById(`itemCode-${nextRow.id}`)?.focus(), 10);
                          return prev;
                        }
                      });
                    }
                  }}
                  className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded dark:text-zinc-200" 
                /></td>}
                {visibleColumns.vatAmt && <td className="p-1"><input 
                  type="number" 
                  value={row.qty && row.price ? (
                    taxIncluded 
                      ? (Number(row.qty) * (Number(row.price) - (Number(row.price) / (1 + Number(row.vatPercent)/100)))).toFixed(2)
                      : (Number(row.qty) * Number(row.price) * Number(row.vatPercent) / 100).toFixed(2)
                  ) : ''} 
                  onChange={(e) => row.isManual && updateRow(row.id, 'vatPercent', (Number(e.target.value) / ((Number(row.qty)||1)*(Number(row.price)||1)) * 100).toFixed(2))}
                  className={`w-full p-2 outline-none rounded text-right ${row.isManual ? 'bg-card border border-border focus:ring-1 focus:ring-primary dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'}`} 
                  readOnly={!row.isManual} 
                /></td>}
                {visibleColumns.total && <td className="p-1"><input 
                  type="number" 
                  value={(row.qty !== '' && (isPurchase ? row.purchasePrice !== '' : row.price !== '')) ? (
                    taxIncluded 
                      ? (Number(row.qty) * Number(isPurchase ? row.purchasePrice : row.price)).toFixed(2)
                      : (Number(row.qty) * Number(isPurchase ? row.purchasePrice : row.price) * (1 + Number(row.vatPercent)/100)).toFixed(2)
                  ) : ''} 
                  className="w-full bg-zinc-100 dark:bg-zinc-900 font-semibold p-2 outline-none rounded text-right text-zinc-900 dark:text-zinc-100 border border-transparent dark:border-zinc-800" 
                  readOnly 
                /></td>}
                {visibleColumns.stock && <td className="p-1"><input type="text" value={row.stock} onChange={(e) => updateRow(row.id, 'stock', e.target.value)} className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-center dark:text-zinc-200" /></td>}
                <td className="p-1 text-center">
                  <button onClick={() => removeRow(row.id)} className="text-zinc-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-1.5 border-t border-border bg-white dark:bg-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isAllItemsImported && (
            <button onClick={addRow} className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-indigo-500 px-3 py-1.5 rounded hover:bg-primary/10 transition-colors">
              <Plus size={16} /> Add Row
            </button>
          )}
          {restrictedItems && !isAllItemsImported && (
            <button 
              onClick={addAllFromInvoice}
              className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-500 px-3 py-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors border border-emerald-100 dark:border-emerald-900/30 ml-2"
            >
              <PlusCircle size={16} /> Add All from Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
