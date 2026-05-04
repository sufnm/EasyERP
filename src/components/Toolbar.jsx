import React, { useState } from 'react';
import { Plus, Save, Printer, Search, Trash2, Clock, LogOut, Settings, X } from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, shortcut, onClick, colorClass = "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group shrink-0 min-w-[72px] ${colorClass}`}
  >
    <div className="bg-card p-2 rounded-md shadow-sm border border-border group-hover:shadow group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-all">
      <Icon size={20} className="mb-1" />
    </div>
    <span className="text-xs font-semibold mt-1">
      {shortcut && <span className="text-primary mr-1">{shortcut}</span>}
      {label}
    </span>
  </button>
);

export default function Toolbar({ 
  visibleColumns, setVisibleColumns, 
  taxIncluded, setTaxIncluded, 
  enterToQty, setEnterToQty,
  showInvoiceAfterSave, setShowInvoiceAfterSave,
  currencies = [], selectedCurrency, setSelectedCurrency,
  onNew, onPending, onClear, pendingCount = 0
}) {
  const [showOptions, setShowOptions] = useState(false);
  const toggleColumn = (key) => setVisibleColumns?.(prev => ({ ...prev, [key]: !prev[key] }));
  return (
    <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border shadow-sm overflow-x-auto transition-colors duration-300">
      <ToolbarButton icon={Plus} label="New" shortcut="F1" onClick={onNew} colorClass="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" />
      <ToolbarButton icon={Trash2} label="Clear" onClick={onClear} colorClass="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" />
      <ToolbarButton 
        icon={Clock} 
        label="Pending" 
        onClick={onPending} 
        colorClass={pendingCount > 0 ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 animate-pulse-subtle" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"} 
      />
      
      <div className="w-px h-10 bg-border mx-1"></div>
      
      <ToolbarButton icon={Printer} label="Print" />
      
      {/* Options Button replacing Zatca */}
      <button onClick={() => setShowOptions(true)} className="flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 group shrink-0 min-w-[72px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
        <div className="bg-card p-2 rounded-md shadow-sm border border-border group-hover:shadow group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-all">
          <Settings size={20} className="mb-1" />
        </div>
        <span className="text-xs font-semibold mt-1">Options</span>
      </button>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
          <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
            <div className="bg-zinc-800 dark:bg-zinc-900 p-5 flex justify-between items-center text-white shrink-0">
               <h3 className="text-lg font-bold tracking-wide">System Options</h3>
               <button onClick={() => setShowOptions(false)} className="text-zinc-300 hover:text-white transition-colors bg-zinc-700 dark:bg-zinc-800 p-1.5 rounded-full hover:bg-rose-500">
                 <X size={18} />
               </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">General Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                    <input type="checkbox" checked={taxIncluded} onChange={() => setTaxIncluded?.(!taxIncluded)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Unit Price includes VAT</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                    <input type="checkbox" checked={enterToQty} onChange={() => setEnterToQty?.(!enterToQty)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Enter Adds and Moves to QTY</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                    <input type="checkbox" checked={showInvoiceAfterSave} onChange={() => setShowInvoiceAfterSave?.(!showInvoiceAfterSave)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Show Invoice after Sale</span>
                  </label>
                  
                  <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl transition-all shadow-sm">
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Default Currency</span>
                    <select 
                      value={selectedCurrency} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setSelectedCurrency?.(val);
                      }}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      {currencies.map(curr => (
                        <option key={curr.Currency_No} value={curr.Currency_No}>
                          {curr.Currency_code} - {curr.Currency_Name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Visible Grid Columns</h4>
                <div className="grid grid-cols-2 gap-2">
                  {visibleColumns && Object.keys(visibleColumns).map(key => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg border border-transparent hover:border-border transition-all">
                      <input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-4 h-4 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-900/30 p-5 border-t border-border flex justify-end shrink-0">
              <button onClick={() => setShowOptions(false)} className="px-6 py-2.5 bg-zinc-800 dark:bg-zinc-950 text-white text-sm font-bold rounded-lg hover:bg-primary transition-colors shadow-md">
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ToolbarButton icon={Search} label="Search" />
      <div className="w-px h-10 bg-border mx-1"></div>
      <ToolbarButton icon={LogOut} label="Exit" shortcut="F8" colorClass="text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" />
    </div>
  );
}
