import React, { useState, useEffect } from 'react';
import { Save, Search, Languages, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { API_ENDPOINTS } from '../config';

export default function TranslationManagerPage() {
  const { defaultTranslations, customTranslations, fetchCustomTranslations, language, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTranslations, setEditingTranslations] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Initialize editing list from default translations
  useEffect(() => {
    const keys = Object.keys(defaultTranslations.en);
    const list = keys.map(key => ({
      key,
      en: customTranslations.en[key] || defaultTranslations.en[key],
      ar: customTranslations.ar[key] || defaultTranslations.ar[key],
      isModified: false
    }));
    setEditingTranslations(list);
  }, [defaultTranslations, customTranslations]);

  const handleValueChange = (key, lang, newValue) => {
    setEditingTranslations(prev => prev.map(item => {
      if (item.key === key) {
        return { ...item, [lang]: newValue, isModified: true };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    const modifiedItems = editingTranslations.filter(item => item.isModified);
    if (modifiedItems.length === 0) {
      setStatus({ type: 'info', message: 'No changes to save.' });
      return;
    }

    setIsSaving(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/translations/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translations: modifiedItems })
      });

      if (response.ok) {
        await fetchCustomTranslations();
        setStatus({ type: 'success', message: 'Translations saved successfully!' });
        setEditingTranslations(prev => prev.map(item => ({ ...item, isModified: false })));
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Error saving translations. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTranslations = editingTranslations.filter(item => 
    item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ar.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Languages size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight">Translation Manager</h1>
            <p className="text-sm text-zinc-500 font-medium">Customize your system labels and messages</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text"
              placeholder="Search keys or values..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm w-64 shadow-sm"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border animate-in slide-in-from-top-2 duration-300 ${
          status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800' :
          status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{status.message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest w-1/4">Translation Key</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest w-1/3">English Label</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest w-1/3">Arabic Label (العربية)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredTranslations.map((item) => (
                <tr key={item.key} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold font-mono text-zinc-400 group-hover:text-indigo-500 transition-colors">{item.key}</span>
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text"
                      value={item.en}
                      onChange={(e) => handleValueChange(item.key, 'en', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none transition-all text-sm font-medium ${item.isModified ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      type="text"
                      value={item.ar}
                      dir="rtl"
                      onChange={(e) => handleValueChange(item.key, 'ar', e.target.value)}
                      className={`w-full px-3 py-1.5 bg-transparent border-b border-transparent focus:border-indigo-500 outline-none transition-all text-sm font-bold text-right font-arabic ${item.isModified ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}
                    />
                  </td>
                </tr>
              ))}
              {filteredTranslations.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center">
                    <p className="text-zinc-500 font-medium">No translations found matching your search.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
