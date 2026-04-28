import React from 'react';
import { Moon, Sun, Settings as SettingsIcon, Monitor, Bell, Shield } from 'lucide-react';

export default function SettingsPage({ darkMode, setDarkMode }) {
  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Control your application preferences and theme</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Navigation - Sidebar subtle */}
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold rounded-xl text-sm transition-all">
            <Monitor size={18} />
            Appearance
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm transition-all group">
            <Bell size={18} className="group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
            Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-sm transition-all group">
            <Shield size={18} className="group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
            Privacy
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="text-sm font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-6">Appearance Settings</h2>
            
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg transition-colors ${darkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-amber-100 text-amber-600'}`}>
                  {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Dark Mode</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Switch between light and dark themes</p>
                </div>
              </div>
              
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-offset-2 ring-indigo-500 focus:ring-2 ${darkMode ? 'bg-indigo-600' : 'bg-zinc-300'}`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} 
                />
              </button>
            </div>

            <div className="mt-6 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
               <p className="text-xs text-zinc-400 font-medium italic">More appearance options coming soon...</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
