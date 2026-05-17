import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, User, Printer, ShoppingCart, CloudUpload, Mail, Send, Check, AlertCircle, Share2 } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function InvoiceModal({ sale, onClose, onEdit, onCompleteSales, onZatcaSubmit, address: passedAddress, historyInvoiceColumns = {
  barcode: true,
  description: true,
  unit: true,
  qty: true,
  price: true,
  vatPercent: true,
  vatAmt: true,
  total: true
}, isPurchase = false, autoPrint = false, crystalPrint = false, defaultPrintPaper = 'Thermal', onShare }) {
  const [saleItems, setSaleItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [customerAddress, setCustomerAddress] = useState(null);
  const [masterTerms, setMasterTerms] = useState([]);
  const [savedTerms, setSavedTerms] = useState([]);
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [isCrystalPrinting, setIsCrystalPrinting] = useState(false);
  const [crystalPrintResult, setCrystalPrintResult] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  // Email sharing state
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null); // { success, message }

  const handleEmailShare = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setEmailResult({ success: false, message: 'Please enter a valid email address.' });
      return;
    }
    setIsSendingEmail(true);
    setEmailResult(null);
    try {
      const res = await fetch(API_ENDPOINTS.EMAIL_SHARE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: sale?.INVOICE_NO,
          trnType: sale?.TRN_TYPE,
          toEmail: emailAddress,
          customerName: sale?.ENAME || ''
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailResult({ success: true, message: `Sent to ${emailAddress}` });
        setEmailAddress('');
        setTimeout(() => { setShowEmailInput(false); setEmailResult(null); }, 3000);
      } else {
        setEmailResult({ success: false, message: data.error || 'Failed to send email.' });
      }
    } catch (err) {
      setEmailResult({ success: false, message: 'Network error. Could not reach server.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePrint = async () => {
    if (crystalPrint) {
      setIsCrystalPrinting(true);
      setCrystalPrintResult(null);
      try {
        const brnCode = sale?.BRN_CODE || '1';
        const res = await fetch(API_ENDPOINTS.PRINT_CRYSTAL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNo: sale?.INVOICE_NO,
            trnType: sale?.TRN_TYPE,
            brnCode: brnCode,
            netAmount: sale?.NET_AMOUNT || 0,
            printPaper: defaultPrintPaper
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (data.pdfBase64) {
            const byteCharacters = atob(data.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const file = new Blob([byteArray], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            setPdfUrl(fileURL);
            
            setCrystalPrintResult({ success: true, message: 'PDF generated successfully!' });
            
            // Try to open it directly. Browsers might block it if triggered by autoPrint.
            window.open(fileURL, '_blank');
          } else {
            setCrystalPrintResult({ success: true, message: 'Printed successfully via Crystal Reports!' });
            alert('Printed successfully via Crystal Reports!');
          }
        } else {
          setCrystalPrintResult({ success: false, message: data.error || 'Printing failed' });
          alert(`Crystal Printing Failed: ${data.error || 'Unknown error'}\n${data.details || ''}`);
        }
      } catch (err) {
        console.error("Crystal printing error:", err);
        setCrystalPrintResult({ success: false, message: 'Failed to contact printing server' });
        alert('Failed to contact printing server');
      } finally {
        setIsCrystalPrinting(false);
      }
    } else {
      window.print();
    }
  };

  useEffect(() => {
    if (sale && autoPrint && !loadingItems) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [sale, autoPrint, loadingItems]);

  useEffect(() => {
    if (sale && sale.INVOICE_NO && !crystalPrint) {
      const brnCode = sale.BRN_CODE || '1';
      fetch(`${API_ENDPOINTS.INVOICE_QRCODE}?invoiceNo=${sale.INVOICE_NO}&trnType=${sale.TRN_TYPE}&brnCode=${brnCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.qrCode) {
            setQrCodeImage(data.qrCode);
          } else {
            setQrCodeImage(null);
          }
        })
        .catch(err => {
          console.error("Failed to fetch invoice QR code:", err);
          setQrCodeImage(null);
        });
    } else {
      setQrCodeImage(null);
    }
  }, [sale, crystalPrint]);

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
            // Fallback to customer/supplier master address
            if (isPurchase) {
              fetchSupplierAddress(sale.ACCODE);
            } else {
              fetchCustomerAddress(sale.ACCODE);
            }
          } else {
            setCustomerAddress(null);
          }
        });
      }
      if (sale.TRN_TYPE === 19) {
        fetch(API_ENDPOINTS.QUOTATION_TERMS)
          .then(res => res.json())
          .then(m => setMasterTerms(m))
          .catch(err => console.error("Failed to fetch master terms inside modal:", err));

        fetch(API_ENDPOINTS.QUOTATION_SAVED_TERMS(sale.INVOICE_NO, sale.TRN_TYPE))
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setSavedTerms(data);
            }
          })
          .catch(err => console.error("Failed to fetch saved terms for print modal:", err));
      } else {
        setSavedTerms([]);
        setMasterTerms([]);
      }
    }
  }, [sale, passedAddress]);

  const fetchSaleItems = async () => {
    setLoadingItems(true);
    try {
      const endpoint = isPurchase ? API_ENDPOINTS.PURCHASE_ITEMS(sale.REC_NO) : API_ENDPOINTS.SALE_ITEMS(sale.REC_NO);
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setSaleItems(data);
      }
    } catch (err) {
      console.error(`Failed to fetch ${isPurchase ? 'purchase' : 'sale'} items:`, err);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchSupplierAddress = async (accNo) => {
    try {
      const res = await fetch(API_ENDPOINTS.SUPPLIER_INFO(accNo));
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
      console.error("Failed to fetch supplier address:", err);
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


  const getInvoiceTitles = () => {
    let modalTitle = 'Invoice';
    let printH1 = 'EasyERP Invoice';
    let printSub = 'Sales Receipt';

    if (sale?.TRN_TYPE === 19) {
      modalTitle = 'Quotation';
      printH1 = 'EasyERP Quotation';
      printSub = 'Quotation Estimate';
    } else if (sale?.TRN_TYPE === 16) {
      modalTitle = 'Delivery Invoice';
      printH1 = 'EasyERP Delivery Invoice';
      printSub = 'Delivery Receipt';
    } else if (isPurchase) {
      if (sale?.TRN_TYPE === 8 || sale?.TRN_TYPE === 9) {
        modalTitle = 'Purchase Return';
        printH1 = 'EasyERP Purchase Return Invoice';
        printSub = 'Return Receipt';
      } else {
        modalTitle = 'Purchase Invoice';
        printH1 = 'EasyERP Purchase Invoice';
        printSub = 'Purchase Receipt';
      }
    } else {
      if (sale?.TRN_TYPE === 3 || sale?.TRN_TYPE === 4 || sale?.TRN_TYPE === 5) {
        modalTitle = 'Sales Return';
        printH1 = 'EasyERP Sales Return Invoice';
        printSub = 'Return Receipt';
      } else {
        modalTitle = 'Invoice';
        printH1 = 'EasyERP Invoice';
        printSub = 'Sales Receipt';
      }
    }

    return { modalTitle, printH1, printSub };
  };

  if (!sale) return null;

  const { modalTitle, printH1, printSub } = getInvoiceTitles();
  const isDeliveryType = sale?.TRN_TYPE === 16;
  const activeColumns = isDeliveryType ? {
    barcode: true,
    description: true,
    unit: true,
    qty: true,
    price: false,
    vatPercent: false,
    vatAmt: false,
    total: false
  } : historyInvoiceColumns;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none print:relative print:z-0 print:w-full print:max-w-none">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30 print:hidden">
          <div className="flex items-center gap-4">
            <div className={"w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg " + (isPurchase ? 'bg-rose-600 shadow-rose-600/20' : 'bg-indigo-600 shadow-indigo-600/20')}>
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-800 dark:text-zinc-100 tracking-tight uppercase">
                {modalTitle} #{sale.INVOICE_NO}
              </h2>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} /> {sale.CURDATE ? new Date(sale.CURDATE).toLocaleDateString() : new Date().toLocaleDateString()}
                <span className="mx-1">•</span>
                <User size={12} /> {sale.ENAME || 'Cash Customer'}
                {sale.REF_NO && (
                  <>
                    <span className="mx-1">•</span>
                    <span className={"mx-1 " + (isPurchase ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400')}>REF #{sale.REF_NO}</span>
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
              <div className={"w-10 h-10 border-4 border-t-transparent rounded-full animate-spin " + (isPurchase ? 'border-rose-600' : 'border-indigo-600')}></div>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest animate-pulse">Loading items...</p>
            </div>
          ) : (
            <div className="space-y-6">
               {/* Print Header (Only visible on print) */}
               <div className="hidden print:block mb-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">
                        {printH1}
                      </h1>
                      <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">
                        {printSub}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-lg font-black text-zinc-900">#{sale.INVOICE_NO}</p>
                      <p className="text-xs text-zinc-500 font-bold">{sale.CURDATE ? new Date(sale.CURDATE).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                      {sale.REF_NO && (
                        <p className={"text-[10px] font-bold mt-1 uppercase tracking-wider " + (isPurchase ? "text-rose-600" : "text-indigo-600")}>
                          Ref: #{sale.REF_NO}
                        </p>
                      )}
                      {qrCodeImage && (
                        <div className="mt-3">
                          <img src={qrCodeImage} alt="ZATCA QR Code" className="w-24 h-24 object-contain rounded-md border border-zinc-200 p-1" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-8 py-6 border-y border-zinc-100">
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{isPurchase ? 'Supplier' : 'Customer'}</p>
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
                    {sale.QOT_INV_NO && sale.QOT_INV_NO !== '0' && (
                      <div className="text-right mt-2">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Sale Invoice No.</p>
                        <p className="text-sm font-bold text-emerald-600">#{sale.QOT_INV_NO}</p>
                      </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:hidden">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">{isPurchase ? 'Supplier' : 'Customer'} Details</p>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
                        <User size={16} className={isPurchase ? 'text-rose-600' : 'text-indigo-600'} />
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
                        <span className={"text-sm font-mono font-black " + (isPurchase ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400')}>{sale.VAT_NUMBER || 'NOT REGISTERED'}</span>
                      </div>
                      {sale.QOT_INV_NO && sale.QOT_INV_NO !== '0' && (
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                          <span className="text-[11px] text-emerald-500 uppercase tracking-wider font-bold">Sale Invoice No.</span>
                          <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400">#{sale.QOT_INV_NO}</span>
                        </div>
                      )}
                      {sale.REF_NO && (
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">Reference #</span>
                          <span className={"text-sm font-mono font-black " + (isPurchase ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400')}>#{sale.REF_NO}</span>
                        </div>
                      )}
                      {qrCodeImage && (
                        <div className="flex justify-between items-start pt-3 mt-3 border-t border-zinc-200/60 dark:border-zinc-700/60">
                          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold mt-1">ZATCA QR</span>
                          <img src={qrCodeImage} alt="ZATCA QR Code" className="w-16 h-16 object-contain rounded-md bg-white border border-zinc-200 p-0.5 shadow-sm" />
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden print:border-none print:rounded-none">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                      {activeColumns.barcode && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Barcode</th>}
                      {activeColumns.description && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Description</th>}
                      {activeColumns.unit && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">UNIT</th>}
                      {activeColumns.qty && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Qty</th>}
                      {activeColumns.price && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">PRICE</th>}
                      {activeColumns.vatPercent && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">VAT%</th>}
                      {activeColumns.vatAmt && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">VAT Amt</th>}
                      {activeColumns.total && <th className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Total</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {saleItems.map((item, idx) => {
                      const crate = sale.CRATE || 1;
                      const unitPrice = (Number(item.UNIT_PRICE) || 0) / crate;
                      const qty = Number(item.QTY) || 0;
                      
                      return (
                        <tr key={idx} className="text-[11px] print:text-[10px]">
                          {activeColumns.barcode && <td className="px-4 py-3 font-mono text-zinc-500">{item.BARCODE}</td>}
                          {activeColumns.description && <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-200">{item.DESCRIPTION}</td>}
                          {activeColumns.unit && <td className="px-4 py-3 text-center font-medium">{item.UNIT || 'Pcs'}</td>}
                          {activeColumns.qty && <td className="px-4 py-3 text-center">{qty.toFixed(2)}</td>}
                          {activeColumns.price && <td className="px-4 py-3 text-right text-zinc-500 font-bold">{sale.CURRENCY_CODE || 'SAR'} {unitPrice.toFixed(2)}</td>}
                          {activeColumns.vatPercent && <td className="px-4 py-3 text-right text-zinc-400">{Number(item.VAT_PERCENT || 0).toFixed(0)}%</td>}
                          {activeColumns.vatAmt && <td className="px-4 py-3 text-right text-zinc-400">{sale.CURRENCY_CODE || 'SAR'} {(Number(item.VAT_AMOUNT || 0) / crate).toFixed(2)}</td>}
                          {activeColumns.total && <td className="px-4 py-3 text-right font-black text-zinc-800 dark:text-zinc-100">{sale.CURRENCY_CODE || 'SAR'} {(Number(item.ITM_TOTAL) / crate).toFixed(2)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              {!isDeliveryType && (() => {
                const crate = sale.CRATE || 1;
                const paidAmount = (Number(sale.CASH_PAID || 0) + Number(sale.OTHER_PAID || 0)) / crate;
                const balanceAmount = (Number(sale.NET_AMOUNT || 0) / crate) - paidAmount;
                const isQuotationType = sale.TRN_TYPE === 19;
                
                return (
                  <div className={`grid grid-cols-2 md:grid-cols-3 ${isQuotationType ? 'lg:grid-cols-4' : 'lg:grid-cols-6'} gap-4 print:mt-8 ${isQuotationType ? 'print:grid-cols-4' : 'print:grid-cols-6'}`}>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Gross Total</p>
                      <p className="text-lg font-black text-zinc-700 dark:text-zinc-200">
                        {sale.CURRENCY_CODE || 'SAR'} {((Number(sale.G_TOTAL) || 0) / crate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Discount</p>
                      <p className="text-lg font-black text-rose-600 dark:text-rose-400">
                        {sale.CURRENCY_CODE || 'SAR'} {((Number(sale.DISC_AMT) || 0) / crate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 print:bg-white print:border-none">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">VAT Amount</p>
                      <p className="text-lg font-black text-zinc-700 dark:text-zinc-200">
                        {sale.CURRENCY_CODE || 'SAR'} {((Number(sale.VAT_AMOUNT) || 0) / crate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={"p-4 rounded-xl border print:bg-white print:border-none " + (
                      isPurchase 
                      ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30' 
                      : 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30'
                    )}>
                      <p className={"text-[9px] font-black uppercase tracking-widest mb-1 " + (isPurchase ? 'text-rose-400' : 'text-indigo-400')}>Net Total</p>
                      <p className={"text-lg font-black " + (isPurchase ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400')}>
                        {sale.CURRENCY_CODE || 'SAR'} {((Number(sale.NET_AMOUNT) || 0) / crate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {!isQuotationType && (
                      <>
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 print:bg-white print:border-none">
                          <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Paid Amount</p>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            {sale.CURRENCY_CODE || 'SAR'} {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <div className="mt-1.5 pt-1.5 border-t border-emerald-500/10 flex flex-col gap-0.5">
                            <p className="text-[8px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase flex justify-between">
                              <span>Cash:</span> 
                              <span>{sale.CURRENCY_CODE || 'SAR'} {(Number(sale.CASH_PAID || 0) / crate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </p>
                            <p className="text-[8px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase flex justify-between">
                              <span>Other:</span> 
                              <span>{sale.CURRENCY_CODE || 'SAR'} {(Number(sale.OTHER_PAID || 0) / crate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </p>
                          </div>
                        </div>
                        <div className={"p-4 rounded-xl border print:bg-white print:border-none " + (
                          balanceAmount > 0 
                          ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' 
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800'
                        )}>
                          <p className={"text-[9px] font-black uppercase tracking-widest mb-1 " + (
                            balanceAmount > 0 ? 'text-amber-500' : 'text-zinc-400'
                          )}>Balance</p>
                          <p className={"text-lg font-black " + (
                            balanceAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-700 dark:text-zinc-200'
                          )}>
                            {sale.CURRENCY_CODE || 'SAR'} {balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Terms & Conditions (Only for Quotations) */}
              {sale.TRN_TYPE === 19 && savedTerms.length > 0 && (
                <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                  <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                    Terms & Conditions / الشروط والأحكام
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {savedTerms.map((term, index) => {
                      const master = masterTerms.find(m => m.ID === term.QUOT_TERM_ID);
                      const label = master ? master.DESC_NAME : `Term #${term.QUOT_TERM_ID}`;
                      return (
                        <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800/80 print:bg-white print:p-2 print:border-none">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider mb-0.5">{label.replace('_', ' ')}</p>
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 leading-relaxed">{term.QUOT_DESCRIPTION}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col gap-3 print:hidden rounded-b-3xl">
           <div className="flex justify-between items-center">
             <div>
               {crystalPrintResult && (
                 <p className={`text-xs font-bold ${crystalPrintResult.success ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {crystalPrintResult.message}
                 </p>
               )}
             </div>
             <div className="flex justify-end gap-3 flex-wrap">
               <button 
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-all"
               >
                Close
               </button>
               {pdfUrl && (
                 <a 
                   href={pdfUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                 >
                   <FileText size={14} /> Open PDF
                 </a>
               )}
               <button 
                onClick={handlePrint}
                disabled={isCrystalPrinting}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCrystalPrinting ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
               >
                 {isCrystalPrinting ? (
                   <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                   <Printer size={14} />
                 )}
                 {isCrystalPrinting ? 'Printing...' : 'Print'}
               </button>
               {onZatcaSubmit && (
                  <button 
                    onClick={() => onZatcaSubmit(sale)}
                    className="px-6 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                  >
                    <CloudUpload size={14} />
                    Submit to ZATCA
                  </button>
               )}
               {sale?.TRN_TYPE === 19 && onCompleteSales && (
                <button 
                  onClick={() => {
                    onCompleteSales(sale);
                    onClose();
                  }}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <ShoppingCart size={14} /> Complete Sales
                </button>
               )}
               {onEdit && (
                <button 
                  onClick={() => {
                    onEdit(sale);
                    onClose();
                  }}
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <FileText size={14} /> {sale.TRN_TYPE === 19 ? 'Edit Quotation' : 'Edit Invoice'}
                </button>
               )}
               {onShare && (
                <button 
                  onClick={() => {
                    onShare(sale);
                    onClose();
                  }}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Share2 size={14} /> Share & Send
                </button>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
