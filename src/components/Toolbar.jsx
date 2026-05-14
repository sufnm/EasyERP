import React, { useState } from 'react';
import { Plus, Save, Printer, Search, Trash2, Clock, LogOut, Settings, X, History, Undo2, ShoppingCart, ShoppingBag } from 'lucide-react';

const ToolbarButton = ({ icon: Icon, label, shortcut, onClick, colorClass = "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-200 group shrink-0 min-w-[72px] ${colorClass}`}
  >
    <div className="bg-card p-1.5 rounded-md shadow-sm border border-border group-hover:shadow group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-all">
      <Icon size={20} className="mb-0.5" />
    </div>
    <span className="text-[10px] font-bold mt-0.5">
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
  selectedCurrencyRate, setSelectedCurrencyRate,
  onNew, onPending, onHistory, onReturn, onClear, 
  pendingCount = 0, isReturn = false, isPurchase = false,
  isQuotation = false, isDelivery = false,
  allTerms = [], selectedTermIds = [], setSelectedTermIds,
  autoPrint, setAutoPrint,
  defaultPrintPaper, setDefaultPrintPaper,
  onSaveOptions,
  crystalPrint, setCrystalPrint
}) {
  const [showOptions, setShowOptions] = useState(false);
  const [isCurrencyExpanded, setIsCurrencyExpanded] = useState(false);
  const toggleColumn = (key) => setVisibleColumns?.(prev => ({ ...prev, [key]: !prev[key] }));
  return (
    <div className="flex items-center gap-2 bg-card py-1.5 px-3 rounded-xl border border-border shadow-sm overflow-x-auto transition-colors duration-300">
      <ToolbarButton icon={Plus} label="New" shortcut="F1" onClick={onNew} colorClass="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" />
      <ToolbarButton icon={Trash2} label="Clear" onClick={onClear} colorClass="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" />
      {/* Pending and History/Active Quotations buttons */}
      {(isQuotation || true) && (
        <>
          <ToolbarButton 
            icon={Clock} 
            label="Pending" 
            onClick={onPending} 
            colorClass={pendingCount > 0 ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 animate-pulse-subtle" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"} 
          />
          
          <div className="w-px h-8 bg-border mx-1"></div>
          
          <ToolbarButton 
            icon={History} 
            label={isQuotation ? "Active Quotations" : (isDelivery ? "Delivery History" : "History")} 
            onClick={onHistory} 
            colorClass="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" 
          />
        </>
      )}
      
      {/* Options Button replacing Zatca */}
      <button onClick={() => setShowOptions(true)} className="flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-200 group shrink-0 min-w-[72px] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
        <div className="bg-card p-1.5 rounded-md shadow-sm border border-border group-hover:shadow group-hover:border-zinc-300 dark:group-hover:border-zinc-600 transition-all">
          <Settings size={20} className="mb-0.5" />
        </div>
        <span className="text-[10px] font-bold mt-0.5">Options</span>
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
                  {!isDelivery && (
                    <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                      <input type="checkbox" checked={taxIncluded} onChange={() => setTaxIncluded?.(!taxIncluded)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Unit Price includes VAT</span>
                    </label>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                     <input type="checkbox" checked={!enterToQty} onChange={() => setEnterToQty?.(!enterToQty)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                     <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Auto_Next line</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                    <input type="checkbox" checked={showInvoiceAfterSave} onChange={() => setShowInvoiceAfterSave?.(!showInvoiceAfterSave)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">
                      {isQuotation 
                        ? 'Show Quotation after Save' 
                        : isDelivery 
                          ? 'Show Invoice after Delivery' 
                          : `Show Invoice after ${isPurchase ? 'Purchase' : 'Sale'}`}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                    <input type="checkbox" checked={autoPrint} onChange={() => setAutoPrint?.(!autoPrint)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Auto Print</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all shadow-sm">
                    <input type="checkbox" checked={crystalPrint} onChange={() => setCrystalPrint?.(!crystalPrint)} className="w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white">Crystal Print</span>
                  </label>
                  <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-border rounded-xl transition-all shadow-sm">
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Default Print Paper</span>
                    <select 
                      value={defaultPrintPaper || 'Thermal'} 
                      onChange={(e) => setDefaultPrintPaper?.(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="Thermal">Thermal / Roll</option>
                      <option value="A4">A4 / Standard</option>
                    </select>
                  </div>
                  
                  {!isDelivery && (() => {
                    const selectedCurr = currencies.find(c => c.Currency_No === selectedCurrency);

                    return (
                      <div className="flex flex-col gap-2 p-3 bg-zinc-100/50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Default Currency</span>
                          <button 
                            onClick={() => setIsCurrencyExpanded(!isCurrencyExpanded)}
                            className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                          >
                            {isCurrencyExpanded ? 'Collapse' : 'Change'}
                          </button>
                        </div>
                        
                        {/* Selected Currency Card - More Sophisticated Dark Indigo */}
                        <div className="flex items-center justify-between p-3 rounded-xl border bg-indigo-950 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10 transition-all">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-indigo-100">
                              {selectedCurr?.Currency_code || 'SAR'}
                            </span>
                            <span className="text-[10px] text-indigo-300/80 font-medium">
                              {selectedCurr?.Currency_Name || 'Saudi Riyal'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-400 transition-all">
                            <span className="opacity-60 text-[9px] text-indigo-300 font-black uppercase">Rate</span>
                            <input 
                              type="number" 
                              value={selectedCurrencyRate || 1} 
                              onChange={(e) => setSelectedCurrencyRate?.(parseFloat(e.target.value) || 0)}
                              step="0.0001"
                              className="bg-transparent text-white text-xs font-black w-16 outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        {/* Dropdown for other currencies - Deeper Tones */}
                        {isCurrencyExpanded && (
                          <div className="mt-2 space-y-2 pt-2 border-t border-zinc-300 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                            <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-500 uppercase tracking-widest mb-1 px-1">Other Available Currencies</p>
                            {currencies.filter(c => c.Currency_No !== selectedCurrency).map(curr => (
                              <button
                                key={curr.Currency_No}
                                onClick={() => {
                                  setSelectedCurrency?.(curr.Currency_No);
                                  setIsCurrencyExpanded(false);
                                }}
                                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-400 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all text-left group"
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                    {curr.Currency_code}
                                  </span>
                                  <span className="text-[9px] text-zinc-500 dark:text-zinc-500">
                                    {curr.Currency_Name}
                                  </span>
                                </div>
                                <div className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-500 flex items-center gap-1 group-hover:bg-indigo-500/10 group-hover:text-indigo-600 transition-colors">
                                  <span className="opacity-60 text-[8px]">Rate:</span>
                                  {Number(curr.Currency_Rate || 0).toFixed(3)}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {isQuotation && allTerms && allTerms.length > 0 && (
                <div className="mb-6 border-t border-border pt-4">
                  <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Quotation Terms & Conditions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {allTerms.map(term => {
                      const isChecked = selectedTermIds?.includes(term.ID);
                      return (
                        <label key={term.ID} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg border border-transparent hover:border-border transition-all">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              if (isChecked) {
                                setSelectedTermIds?.(prev => prev.filter(id => id !== term.ID));
                              } else {
                                setSelectedTermIds?.(prev => [...prev, term.ID]);
                              }
                            }} 
                            className="w-4 h-4 rounded text-primary focus:ring-primary border-zinc-300 dark:border-zinc-700" 
                          />
                          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 uppercase tracking-tight text-xs">
                            {term.DESC_NAME.replace('_', ' ')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

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
              <button 
                onClick={() => {
                  setShowOptions(false);
                  onSaveOptions?.();
                }} 
                className="px-6 py-2.5 bg-zinc-800 dark:bg-zinc-950 text-white text-sm font-bold rounded-lg hover:bg-primary transition-colors shadow-md"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {!isQuotation && !isDelivery && (
        <>
          <ToolbarButton 
            icon={isReturn ? (isPurchase ? ShoppingBag : ShoppingCart) : Undo2} 
            label={isReturn ? (isPurchase ? "Purchase" : "Sales") : "Return"} 
            onClick={onReturn}
            colorClass={isReturn ? "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20" : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"} 
          />
          <div className="w-px h-8 bg-border mx-1"></div>
        </>
      )}
    </div>
  );
}
