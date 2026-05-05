import React from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react';

export default function HomePage() {
  const stats = [
    { label: 'Total Sales Today', value: 'SAR 14,250', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-100' },
    { label: 'Pending Invoices', value: '4', icon: ShoppingBag, color: 'text-orange-500', bg: 'bg-orange-100' },
    { label: 'Active Customers', value: '128', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100' },
    { label: 'Growth', value: '+12.5%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-100' },
  ];

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1600px] mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-card-foreground uppercase tracking-tighter">Overview</h1>
        <p className="text-[10px] md:text-sm text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-1">Business Intelligence Dashboard</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-card p-4 md:p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-card-foreground">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} dark:bg-opacity-20`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm h-96 flex items-center justify-center">
        <p className="text-zinc-400 font-medium flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Sales Chart Placeholder
        </p>
      </div>
    </div>
  );
}

function BarChart3(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  )
}
