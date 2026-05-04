import React from 'react';
import { X, Clock, User, DollarSign, ArrowRight } from 'lucide-react';

export default function PendingSalesModal({ isOpen, onClose, pendingSales, onSelect, onRemove, onClearAll }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
        <div className="bg-zinc-800 dark:bg-zinc-900 p-5 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-rose-400" />
            <h3 className="text-xl font-bold tracking-tight">Pending Sales</h3>
            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-black">
              {pendingSales.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pendingSales.length > 0 && (
              <button 
                onClick={() => {
                  if (confirm('Discard all pending sales?')) onClearAll();
                }}
                className="text-xs font-bold bg-white/10 hover:bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg border border-white/10 transition-all"
              >
                Discard All
              </button>
            )}
            <button onClick={onClose} className="text-zinc-300 hover:text-white transition-colors bg-zinc-700 dark:bg-zinc-800 p-1.5 rounded-full hover:bg-rose-500">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {pendingSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
              <Clock size={64} className="mb-4 opacity-10" />
              <p className="text-lg font-semibold">No pending sales found</p>
              <p className="text-sm">Held sales will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingSales.map((sale) => (
                <div 
                  key={sale.id}
                  className="group bg-white dark:bg-zinc-900 border border-border hover:border-primary/50 rounded-xl p-4 transition-all hover:shadow-lg flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-zinc-400" />
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                        {sale.customer.name || 'Walk-in Customer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(sale.id).toLocaleTimeString()}
                      </span>
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        {sale.rows.filter(r => r.itemCode).length} Items
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end text-rose-500 font-black text-lg">
                      <span className="text-xs font-bold mr-0.5 opacity-70">SAR</span>
                      {Number(sale.totals.net).toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={() => onRemove(sale.id)}
                        className="text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Discard
                      </button>
                      <button 
                        onClick={() => onSelect(sale)}
                        className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                      >
                        Restore <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 border-t border-border flex justify-between items-center text-xs text-zinc-500 font-medium">
          <span>Click Restore to continue a held sale.</span>
          <button onClick={onClose} className="hover:text-zinc-800 dark:hover:text-zinc-200">Close Window</button>
        </div>
      </div>
    </div>
  );
}
