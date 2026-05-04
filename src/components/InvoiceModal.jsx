import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, User, Printer } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function InvoiceModal({ sale, onClose, onEdit, address: passedAddress, historyInvoiceColumns = {
  barcode: true,
  description: true,
  unit: true,
  qty: true,
  price: true,
  vatPercent: true,
  vatAmt: true,
  total: true
} }) {
  const [saleItems, setSaleItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [customerAddress, setCustomerAddress] = useState(null);

  useEffect(() => {
    if (sale && sale.REC_NO) {
      fetchSaleItems();
      
      if (passedAddress) {
        setCustomerAddress(passedAddress);
      } else {
        // First try to fetch ad-hoc address from CASH_ACC_INFO
        fetchInvoiceAddress(sale.INVOICE_NO, sale.TRN_TYPE).then(adhocAddress => {
          if (adhocAddress) {
            setCustomerAddress(adhocAddress);
          } else if (sale.ACCODE && sale.ACCODE !== '6000') {
            // Fallback to customer master address
            fetchCustomerAddress(sale.ACCODE);
          } else {
            setCustomerAddress(null);
          }
        });
      }
    }
  }, [sale, passedAddress]);

  const fetchSaleItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch(API_ENDPOINTS.SALE_ITEMS(sale.REC_NO));
      if (res.ok) {
        const data = await res.json();
        setSaleItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch sale items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchCustomerAddress = async (accNo) => {
    try {
      const res = await fetch(API_ENDPOINTS.CUSTOMER_INFO(accNo));
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setCustomerAddress({
            building: data.building_no,
            street: data.street_name,
            district: data.district,
            city: data.city_name,
            pincode: data.postal_zone
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch customer address:", err);
    }
  };

  const fetchInvoiceAddress = async (invoiceNo, trnType) => {
    try {
      const res = await fetch(API_ENDPOINTS.INVOICE_ADDRESS(invoiceNo, trnType));
      if (res.ok) {
        const data = await res.json();
        return data; // returns building, street, district, city, pincode
      }
    } catch (err) {
      console.error("Failed to fetch invoice address:", err);
    }
    return null;
  };

  const handlePrint = () => {
    window.print();
  };

  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:relative print:z-0 print:w-full print:max-w-none">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30 print:hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">Invoice #{sale.INVOICE_NO}</h2>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> {sale.CURDATE ? new Date(sale.CURDATE).toLocaleDateString() : new Date().toLocaleDateString()}
                <span className="mx-1">•</span>
                <User size={12} /> {sale.ENAME || 'Cash Customer'}
                {sale.REF_NO && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="text-indigo-600 dark:text-indigo-400">REF #{sale.REF_NO}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {loadingItems ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 print:hidden">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Loading items...</p>
            </div>
          ) : (
            <div className="space-y-6">
               {/* Print Header (Only visible on print) */}
               <div className="hidden print:block mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-3xl font-black text-zinc-900 uppercase">EasyERP Invoice</h1>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Sales Receipt</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-zinc-900">#{sale.INVOICE_NO}</p>
                      <p className="text-xs text-zinc-500 font-bold">{sale.CURDATE ? new Date(sale.CURDATE).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                      {sale.REF_NO && <p className="text-[10px] font-bold text-indigo-600 mt-1">Ref: #{sale.REF_NO}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 py-6 border-y border-zinc-100">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Customer</p>
                      <p className="text-sm font-bold text-zinc-800">{sale.ENAME || 'Cash Customer'}</p>
                      {sale.ACCODE && <p className="text-xs text-zinc-500">ID: {sale.ACCODE}</p>}
                      {customerAddress && (
                        <div className="mt-2 text-[10px] text-zinc-600 leading-tight">
                          <p>{customerAddress.building} {customerAddress.street}</p>
                          <p>{customerAddress.district}, {customerAddress.city}</p>
                          <p>{customerAddress.pincode}</p>
                        </div>
                      )}
                    </div>
                    {sale.VAT_NUMBER && (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">VAT Number</p>
                        <p className="text-sm font-bold text-zinc-800">{sale.VAT_NUMBER}</p>
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:hidden">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Customer Details</p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                        <User size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{sale.ENAME || 'Cash Customer'}</p>
                        <p className="text-[10px] text-zinc-500">ID: {sale.ACCODE || 'N/A'}</p>
                      </div>
                    </div>
                    {customerAddress && (
                      <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
                        <p className="flex justify-between"><span>Building/Street:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{customerAddress.building} {customerAddress.street}</span></p>
                        <p className="flex justify-between"><span>District/City:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{customerAddress.district}, {customerAddress.city}</span></p>
                        <p className="flex justify-between"><span>Postal Code:</span> <span className="font-medium text-zinc-700 dark:text-zinc-300">{customerAddress.pincode}</span></p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Tax Information</p>
                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">VAT Number</span>
                        <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">{sale.VAT_NUMBER || 'NOT REGISTERED'}</span>
                      </div>
                      {sale.REF_NO && (
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">Reference #</span>
                          <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">#{sale.REF_NO}</span>
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden print:border-none print:rounded-none">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                      {historyInvoiceColumns.barcode && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Barcode</th>}
                      {historyInvoiceColumns.description && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Description</th>}
                      {historyInvoiceColumns.unit && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">UNIT</th>}
                      {historyInvoiceColumns.qty && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Qty</th>}
                      {historyInvoiceColumns.price && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">PRICE</th>}
                      {historyInvoiceColumns.vatPercent && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">VAT%</th>}
                      {historyInvoiceColumns.vatAmt && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">VAT Amt</th>}
                      {historyInvoiceColumns.total && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Total</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {saleItems.map((item, idx) => {
                      const unitPrice = Number(item.UNIT_PRICE) || 0;
                      const qty = Number(item.QTY) || 0;
                      const netSubtotal = unitPrice * qty;
                      
                      return (
                        <tr key={idx} className="text-[11px] print:text-[10px]">
                          {historyInvoiceColumns.barcode && <td className="px-4 py-3 font-mono text-zinc-500">{item.BARCODE}</td>}
                          {historyInvoiceColumns.description && <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200">{item.DESCRIPTION}</td>}
                          {historyInvoiceColumns.unit && <td className="px-4 py-3 text-center font-medium">{item.UNIT || 'Pcs'}</td>}
                          {historyInvoiceColumns.qty && <td className="px-4 py-3 text-center">{qty.toFixed(2)}</td>}
                          {historyInvoiceColumns.price && <td className="px-4 py-3 text-right text-zinc-500 font-bold">{sale.CURRENCY_CODE || 'SAR'} {unitPrice.toFixed(2)}</td>}
                          {historyInvoiceColumns.vatPercent && <td className="px-4 py-3 text-right text-zinc-400">{Number(item.VAT_PERCENT || 0).toFixed(0)}%</td>}
                          {historyInvoiceColumns.vatAmt && <td className="px-4 py-3 text-right text-zinc-400">{sale.CURRENCY_CODE || 'SAR'} {Number(item.VAT_AMOUNT || 0).toFixed(2)}</td>}
                          {historyInvoiceColumns.total && <td className="px-4 py-3 text-right font-black text-zinc-800 dark:text-zinc-100">{sale.CURRENCY_CODE || 'SAR'} {Number(item.ITM_TOTAL).toFixed(2)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              {(() => {
                const paidAmount = Number(sale.CASH_PAID || 0) + Number(sale.OTHER_PAID || 0);
                const balanceAmount = Number(sale.NET_AMOUNT || 0) - paidAmount;
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:grid-cols-6 print:mt-8">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Gross Total</p>
                      <p className="text-lg font-black text-zinc-700 dark:text-zinc-200">
                        {sale.CURRENCY_CODE || 'SAR'} {(Number(sale.G_TOTAL) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Discount</p>
                      <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                        {sale.CURRENCY_CODE || 'SAR'} {(Number(sale.DISC_AMT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">VAT Amount</p>
                      <p className="text-lg font-black text-zinc-700 dark:text-zinc-200">
                        {sale.CURRENCY_CODE || 'SAR'} {(Number(sale.VAT_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Net Total</p>
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                        {sale.CURRENCY_CODE || 'SAR'} {(Number(sale.NET_AMOUNT) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Paid Amount</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {sale.CURRENCY_CODE || 'SAR'} {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <div className="mt-1.5 pt-1.5 border-t border-emerald-500/10 flex flex-col gap-0.5">
                        <p className="text-[8px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase flex justify-between">
                          <span>Cash:</span> 
                          <span>{sale.CURRENCY_CODE || 'SAR'} {Number(sale.CASH_PAID || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </p>
                        <p className="text-[8px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase flex justify-between">
                          <span>Other:</span> 
                          <span>{sale.CURRENCY_CODE || 'SAR'} {Number(sale.OTHER_PAID || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    </div>
                    <div className={`p-4 rounded-xl border print:bg-white print:border-none ${
                      balanceAmount > 0 
                      ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' 
                      : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'
                    }`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                        balanceAmount > 0 ? 'text-amber-500' : 'text-zinc-400'
                      }`}>Balance</p>
                      <p className={`text-lg font-black ${
                        balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-200'
                      }`}>
                        {sale.CURRENCY_CODE || 'SAR'} {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex justify-end gap-3 print:hidden">
           <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
           >
            Close
           </button>
           <button 
            onClick={handlePrint}
            className="px-6 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-2"
           >
             <Printer size={14} /> Print
           </button>
           {onEdit && (
            <button 
              onClick={() => {
                onEdit(sale);
                onClose();
              }}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <FileText size={14} /> Edit Invoice
            </button>
           )}
        </div>
      </div>
    </div>
  );
}
