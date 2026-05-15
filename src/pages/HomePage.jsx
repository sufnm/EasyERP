import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { API_ENDPOINTS } from '../config';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area
} from 'recharts';

export default function HomePage({ navigateTo }) {
  const [data, setData] = useState({
    totalSalesToday: 0,
    pendingInvoices: 0,
    activeCustomers: 0,
    growth: '+0%'
  });
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch(API_ENDPOINTS.DASHBOARD_STATS),
          fetch(`${API_ENDPOINTS.DASHBOARD_SALES_HISTORY}?period=${period}`)
        ]);

        if (statsRes.ok) {
          const stats = await statsRes.json();
          setData(stats);
        }

        if (historyRes.ok) {
          const history = await historyRes.json();
          setChartData(history);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  const insights = useMemo(() => {
    if (chartData.length === 0) return { highest: { val: 0, label: '-' }, lowest: { val: 0, label: '-' }, average: 0, total: 0 };
    
    const sorted = [...chartData].sort((a, b) => b.sales - a.sales);
    const total = chartData.reduce((acc, curr) => acc + curr.sales, 0);
    
    return {
      highest: { val: sorted[0].sales, label: sorted[0].name },
      lowest: { val: sorted[sorted.length - 1].sales, label: sorted[sorted.length - 1].name },
      average: total / chartData.length,
      total: total
    };
  }, [chartData]);

  const stats = [
    { 
      label: 'Total Sales Today', 
      value: `SAR ${Number(data.totalSalesToday).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      icon: DollarSign, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10' 
    },
    { 
      label: 'Pending Invoices', 
      value: data.pendingInvoices.toString(), 
      icon: ShoppingBag, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10' 
    },
    { 
      label: 'Active Customers', 
      value: data.activeCustomers.toString(), 
      icon: Users, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10' 
    },
    { 
      label: 'Growth', 
      value: data.growth, 
      icon: TrendingUp, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10' 
    },
  ];

  return (
    <div className="p-4 md:p-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-card-foreground uppercase">Overview</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            <Activity size={14} className="text-indigo-500" />
            Business Intelligence Console
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const isClickable = stat.label === 'Total Sales Today' || stat.label === 'Pending Invoices';
          
          return (
            <div 
              key={i} 
              onClick={() => {
                if (stat.label === 'Total Sales Today') navigateTo('sales-history', { category: 'sales' });
                if (stat.label === 'Pending Invoices') navigateTo('sales-history', { filter: 'pending' });
              }}
              className={`group bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
                  <p className="text-2xl font-black text-card-foreground tracking-tight">{stat.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} group-hover:scale-110 transition-transform duration-500`}>
                  <Icon className={stat.color} size={28} />
                </div>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 ${stat.bg}`}></div>
            </div>
          );
        })}
      </div>

      {/* Analytics Section */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Chart area */}
          <div className="lg:col-span-9 p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <TrendingUp className="text-indigo-500" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-card-foreground leading-none">Sales Performance</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                    {period === 'daily' ? '7-Day Trend Analysis' : '12-Month Historical Review'}
                  </p>
                </div>
              </div>

              {/* Period Toggle - Moved here for better visibility */}
              <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex gap-1 border border-border">
                <button 
                  onClick={() => setPeriod('daily')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    period === 'daily' 
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setPeriod('monthly')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    period === 'monthly' 
                    ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
            
            <div className="h-[450px] w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Compiling Data...</span>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 30 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#18181B', 
                        borderRadius: '20px', 
                        border: '1px solid #3F3F46',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        padding: '12px 16px',
                        fontSize: '12px',
                        color: '#fff'
                      }}
                      itemStyle={{ color: '#818CF8', fontWeight: 900 }}
                      cursor={{ stroke: '#6366F1', strokeWidth: 2, strokeDasharray: '5 5' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#6366F1" 
                      strokeWidth={5}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3 bg-zinc-50/50 dark:bg-zinc-900/30 p-8 flex flex-col">
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-10">Performance Insights</h4>
            
            <div className="space-y-10 flex-grow">
              {/* Highest */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="text-emerald-500" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Peak {period === 'daily' ? 'Day' : 'Month'}</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">SAR {insights.highest.val.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800 px-2 py-1 rounded-md mt-2 inline-block">
                    {insights.highest.label}
                  </p>
                </div>
              </div>

              {/* Average */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Activity className="text-indigo-500" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Average {period === 'daily' ? 'Daily' : 'Monthly'}</p>
                  <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">SAR {insights.average.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <div className="w-32 bg-zinc-200 dark:bg-zinc-800 h-1.5 mt-3 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${(insights.average/insights.highest.val)*100 || 0}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Lowest */}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <ArrowDownRight className="text-rose-500" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Lowest {period === 'daily' ? 'Day' : 'Month'}</p>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400">SAR {insights.lowest.val.toLocaleString()}</p>
                  <p className="text-[10px] font-black text-zinc-400 bg-zinc-200/50 dark:bg-zinc-800 px-2 py-1 rounded-md mt-2 inline-block">
                    {insights.lowest.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Period Summary */}
            <div className="mt-12 p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20">
              <div className="flex items-center gap-2 opacity-70 mb-2">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Period Revenue</span>
              </div>
              <p className="text-2xl font-black tracking-tight">
                SAR {insights.total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
