import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Send, FileText, Search } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function ZatcaSubmissionPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.ZATCA_INVOICES);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Failed to load ZATCA invoices:', err);
      alert('Failed to load ZATCA invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSubmit = async (invoice) => {
    try {
      setSubmittingId(invoice.REC_NO);
      const res = await fetch(API_ENDPOINTS.ZATCA_SUBMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: invoice.INVOICE_NO,
          trnType: invoice.TRN_TYPE
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully processed and submitted invoice #${invoice.INVOICE_NO} to ZATCA!`);
        fetchInvoices();
      } else {
        alert(`ZATCA Error: ${data.error || 'Unknown error'}\n${data.details || ''}`);
        fetchInvoices();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit invoice to ZATCA');
    } finally {
      setSubmittingId(null);
    }
  };

  const getTrnTypeLabel = (type) => {
    switch (Number(type)) {
      case 6: return { text: 'Cash Sale', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' };
      case 7: return { text: 'Credit Sale', color: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' };
      case 3: return { text: 'Return Cash', color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800' };
      case 4: return { text: 'Return Credit', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' };
      default: return { text: 'Other', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
    }
  };

  const renderStatus = (val, type) => {
    if (val === 1) {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle size={14} /> {type === 'qr' ? 'Created' : 'Submitted'}
        </span>
      );
    }
    if (val === 2) {
      return (
        <span className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-bold">
          <XCircle size={14} /> Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 font-bold">
        <AlertCircle size={14} /> Pending
      </span>
    );
  };

  const filteredInvoices = invoices.filter(inv => 
    String(inv.INVOICE_NO).includes(searchQuery) ||
    String(inv.ENAME || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950/50">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter">ZATCA Submission Panel</h1>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Phase-2 integration & reporting status</p>
        </div>
        <button 
          onClick={fetchInvoices} 
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Invoice # or Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm dark:text-zinc-200"
            />
          </div>

          {/* Invoices List */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Invoice</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">QR Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">ZATCA Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading && invoices.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-6 py-6">
                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-zinc-400 italic">No invoices found requiring ZATCA submission</td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const trnLabel = getTrnTypeLabel(inv.TRN_TYPE);
                    const isSubmitting = submittingId === inv.REC_NO;
                    return (
                      <tr key={inv.REC_NO} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              <FileText size={16} />
                            </div>
                            <span className="font-bold text-zinc-700 dark:text-zinc-200">#{inv.INVOICE_NO}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                          {new Date(inv.CURDATE).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{inv.ENAME || 'Cash Customer'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-tighter border ${trnLabel.color}`}>
                              {trnLabel.text}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            {renderStatus(inv.QR_CODE, 'qr')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center">
                            {renderStatus(inv.ZATCA_SEND, 'send')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-black text-zinc-800 dark:text-zinc-100">
                            {inv.CURRENCY_CODE || 'SAR'} {(Number(inv.NET_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleSubmit(inv)}
                            disabled={isSubmitting || inv.ZATCA_SEND === 1}
                            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              inv.ZATCA_SEND === 1
                                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                            }`}
                          >
                            {isSubmitting ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}
                            {inv.ZATCA_SEND === 1 ? 'Submitted' : isSubmitting ? 'Processing...' : 'Submit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
