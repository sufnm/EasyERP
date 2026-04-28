import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useCache } from '../context/CacheContext';

export default function SalesGrid({ initialData = [], rows, setRows, visibleColumns = {}, enterToQty = false, taxIncluded = true }) {
  const { searchItems } = useCache();
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchId, setActiveSearchId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = React.useRef(null);

  const updateDropdownPosition = React.useCallback(() => {
    if (activeSearchId) {
      const input = document.getElementById(`itemCode-${activeSearchId}`);
      if (input) {
        const rect = input.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    }
  }, [activeSearchId]);

  React.useEffect(() => {
    if (activeSearchId) {
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      updateDropdownPosition();
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [activeSearchId, updateDropdownPosition]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearchResults([]);
        setActiveSearchId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (initialData.length > 0) {
      // Map initial data to grid structure
      const mappedRows = initialData.map((d, index) => ({
        id: index + 1,
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
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleItemSearch = (id, codeQuery, isSelection = false) => {
    if (!codeQuery) {
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

    // Performance: Use local cache search instead of API
    const data = searchItems(codeQuery);
    
    if (isSelection) {
      if (data && data.length > 0) {
        selectItem(id, data[0]);
      }
      return;
    }
    
    setSearchResults(data);
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

  const selectItem = (id, item) => {
    setRows(prevRows => {
      let nextRows = prevRows.map(row => 
        row.id === id 
          ? { 
              ...row, 
              unit: item.isManual ? '' : item.SALE_PRICE, 
              itemCode: item.BARCODE,
              description: item.DESCRIPTION || '',
              vatPercent: item.VAT_PERCENT || 0,
              qty: item.isManual ? '' : (Number(row.qty || 0) + 1),
              isManual: item.isManual || false
            }
          : row
      );
      
      if (!enterToQty && id === prevRows[prevRows.length - 1].id) {
         nextRows.push({ id: id + 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' });
      }
      return nextRows;
    });

    setSearchResults([]);
    setActiveSearchId(null);

    setTimeout(() => {
      if (item.isManual) {
        document.getElementById(`description-${id}`)?.focus();
      } else if (enterToQty) {
        const qtyInput = document.getElementById(`qty-${id}`);
        qtyInput?.focus();
        qtyInput?.select();
      } else {
        document.getElementById(`itemCode-${id + 1}`)?.focus();
      }
    }, 50);
  };

  const addRow = () => {
    setRows([...rows, { id: rows.length + 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' }]);
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
              {visibleColumns.price && <th className="p-3 font-semibold min-w-[100px]">Price</th>}
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
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">Barcode: {item.BARCODE} | Code: {item.ITEM_CODE}</span>
                            </div>
                            <div className="text-right shrink-0">
                               <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 block">SAR {Number(item.SALE_PRICE).toFixed(2)}</span>
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
                {visibleColumns.unit && <td className="p-1"><input 
                  id={`unit-${row.id}`}
                  type="text" 
                  value={row.unit} 
                  onChange={(e) => updateRow(row.id, 'unit', e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      document.getElementById(`qty-${row.id}`)?.focus();
                    }
                  }}
                  className={`w-full p-2 outline-none rounded dark:text-zinc-200 ${row.isManual ? 'bg-card border border-border focus:ring-1 focus:ring-primary' : 'bg-transparent focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary'}`}
                /></td>}
                {visibleColumns.qty && <td className="p-1"><input 
                  id={`qty-${row.id}`} 
                  type="number" 
                  value={row.qty} 
                  onChange={(e) => updateRow(row.id, 'qty', e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!row.qty) updateRow(row.id, 'qty', '0');
                      const nextId = row.id + 1;
                      setRows(prev => prev[prev.length - 1].id === row.id ? [...prev, { id: nextId, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' }] : prev);
                      setTimeout(() => document.getElementById(`itemCode-${nextId}`)?.focus(), 50);
                    }
                  }} 
                  className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded text-right dark:text-zinc-200" 
                /></td>}
                {visibleColumns.price && <td className="p-1"><input type="number" value={row.qty && row.unit ? ((Number(row.qty) || 0) * (Number(row.unit) || 0)).toFixed(2) : ''} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent dark:border-zinc-800 p-2 outline-none rounded text-right text-zinc-700 dark:text-zinc-400" readOnly /></td>}
                {visibleColumns.aliasCode && <td className="p-1"><input 
                  id={`aliasCode-${row.id}`}
                  type="text" 
                  value={row.aliasCode} 
                  onChange={(e) => updateRow(row.id, 'aliasCode', e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!row.aliasCode) updateRow(row.id, 'aliasCode', 'N/A');
                      const nextId = row.id + 1;
                      setRows(prev => prev[prev.length - 1].id === row.id ? [...prev, { id: nextId, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' }] : prev);
                      setTimeout(() => document.getElementById(`itemCode-${nextId}`)?.focus(), 50);
                    }
                  }}
                  className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded dark:text-zinc-200" 
                /></td>}
                {visibleColumns.vatAmt && <td className="p-1"><input 
                  type="number" 
                  value={row.qty && row.unit ? (
                    taxIncluded 
                      ? (Number(row.qty) * (Number(row.unit) - (Number(row.unit) / (1 + Number(row.vatPercent)/100)))).toFixed(2)
                      : (Number(row.qty) * Number(row.unit) * Number(row.vatPercent) / 100).toFixed(2)
                  ) : ''} 
                  onChange={(e) => row.isManual && updateRow(row.id, 'vatPercent', (Number(e.target.value) / ((Number(row.qty)||1)*(Number(row.unit)||1)) * 100).toFixed(2))}
                  className={`w-full p-2 outline-none rounded text-right ${row.isManual ? 'bg-card border border-border focus:ring-1 focus:ring-primary dark:text-zinc-200' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'}`} 
                  readOnly={!row.isManual} 
                /></td>}
                {visibleColumns.total && <td className="p-1"><input 
                  type="number" 
                  value={row.qty && row.unit ? (
                    taxIncluded 
                      ? (Number(row.qty) * Number(row.unit)).toFixed(2)
                      : (Number(row.qty) * Number(row.unit) * (1 + Number(row.vatPercent)/100)).toFixed(2)
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
      <div className="p-3 border-t border-border bg-white dark:bg-zinc-900 flex items-center justify-between">
        <button onClick={addRow} className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-indigo-500 px-3 py-1.5 rounded hover:bg-primary/10 transition-colors">
          <Plus size={16} /> Add Row
        </button>
      </div>
    </div>
  );
}
