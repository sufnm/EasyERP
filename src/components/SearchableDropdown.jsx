import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

/**
 * A premium searchable dropdown component designed for the EasyERP "Indigo and Zinc" theme.
 * Standardizes the look and feel of selects across the application.
 * 
 * @param {Array} options - Array of objects { id, label, subLabel }
 * @param {string|number} value - Current selected ID
 * @param {Function} onChange - Callback function(e) where e is a synthetic event { target: { name, value } }
 * @param {string} name - The name attribute for the input (used in onChange)
 * @param {string} placeholder - Placeholder text when no option is selected
 * @param {string} label - Optional top label
 * @param {React.Component} icon - Optional Lucide icon component
 * @param {string} themeColor - indigo, rose, emerald, amber, zinc
 * @param {boolean} required - Whether the field is required
 */
export default function SearchableDropdown({ 
  options = [], 
  value, 
  onChange, 
  name,
  placeholder = "Select an option", 
  label, 
  icon: Icon,
  className = "",
  themeColor = "indigo",
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(opt => opt.id?.toString() === value?.toString());

  const filteredOptions = options.filter(opt => 
    opt.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionId) => {
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: optionId,
          type: 'select-one'
        }
      });
    }
    setIsOpen(false);
    setSearchTerm("");
  };

  const themeClasses = {
    indigo: {
      border: "focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10",
      text: "text-indigo-600 dark:text-indigo-400",
      active: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
    },
    rose: {
      border: "focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10",
      text: "text-rose-600 dark:text-rose-400",
      active: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
    },
    emerald: {
      border: "focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      active: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
    },
    amber: {
      border: "focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      active: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
    },
    zinc: {
      border: "focus-within:border-zinc-500 focus-within:ring-4 focus-within:ring-zinc-500/10",
      text: "text-zinc-600 dark:text-zinc-400",
      active: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
    }
  };

  const currentTheme = themeClasses[themeColor] || themeClasses.indigo;

  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {label && (
        <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block ml-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      
      <div className={`relative group transition-all duration-300 ${currentTheme.border} rounded-xl`}>
        {/* Trigger */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl 
            cursor-pointer group-hover:border-zinc-300 dark:group-hover:border-zinc-700 transition-all shadow-inner overflow-hidden
            ${isOpen ? 'border-zinc-300 dark:border-zinc-700 ring-4 ring-zinc-500/5' : ''}
          `}
        >
          {Icon && (
            <Icon 
              size={16} 
              className={`shrink-0 transition-colors duration-300 ${selectedOption ? currentTheme.text : 'text-zinc-400 dark:text-zinc-500'}`} 
            />
          )}
          
          <div className="flex-1 truncate">
            {selectedOption ? (
              <div className="flex flex-col">
                <span className={`text-xs font-black uppercase tracking-tight truncate ${currentTheme.text}`}>
                  {selectedOption.label}
                </span>
                {selectedOption.subLabel && (
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider truncate leading-none mt-0.5">
                    {selectedOption.subLabel}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 italic">
                {placeholder}
              </span>
            )}
          </div>

          <ChevronDown 
            size={14} 
            className={`transition-transform duration-500 text-zinc-400 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300 ease-out origin-top">
            {/* Search Input */}
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center gap-3">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search options..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400"
                onClick={(e) => e.stopPropagation()}
              />
              {searchTerm && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setSearchTerm(""); }}
                  className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X size={12} className="text-zinc-400" />
                </button>
              )}
            </div>
            
            {/* Options List */}
            <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = value?.toString() === opt.id?.toString();
                  return (
                    <div 
                      key={opt.id}
                      onClick={() => handleSelect(opt.id)}
                      className={`
                        flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-0.5 group/opt
                        ${isSelected 
                          ? currentTheme.active
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'}
                      `}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-black uppercase tracking-tight">
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'opacity-80' : 'opacity-50'}`}>
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className={`p-1 rounded-full ${themeColor === 'zinc' ? 'bg-zinc-900 text-white' : 'bg-current/10'}`}>
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-3 border border-dashed border-zinc-200 dark:border-zinc-800">
                    <Search size={20} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">No results found</p>
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-1 max-w-[150px]">Try searching with a different term</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
