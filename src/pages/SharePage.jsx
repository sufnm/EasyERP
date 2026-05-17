import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCache } from '../context/CacheContext';
import { API_ENDPOINTS } from '../config';
import { 
  Share2, Mail, MessageSquare, Search, FileText, CheckCircle, 
  Send, RefreshCw, Paperclip, Copy, Check, QrCode, Phone, AlertCircle, Trash2, ArrowUpRight,
  ArrowDownRight, Receipt, ClipboardList, Truck, ChevronDown, X, LogOut
} from 'lucide-react';

const DOCUMENT_CATEGORIES = {
  'sales': [6, 7],
  'sales-return': [3, 4],
  'purchase': [1, 2],
  'purchase-return': [8, 9],
  'quotation': [19],
  'delivery-note': [16]
};

export default function SharePage({ params }) {
  const { language, t } = useLanguage();
  const { isReady, currencies, defaultCurrency } = useCache();
  
  // Document Types List
  const docTypes = [
    { id: 'sales', label: language === 'ar' ? 'مبيعات' : 'Sales', trnTypes: [6, 7] },
    { id: 'sales-return', label: language === 'ar' ? 'مرتجع مبيعات' : 'Sales Return', trnTypes: [3, 4] },
    { id: 'purchase', label: language === 'ar' ? 'مشتريات' : 'Purchase', trnTypes: [1, 2] },
    { id: 'purchase-return', label: language === 'ar' ? 'مرتجع مشتريات' : 'Purchase Return', trnTypes: [8, 9] },
    { id: 'quotation', label: language === 'ar' ? 'عرض سعر' : 'Quotation', trnTypes: [19] },
    { id: 'delivery-note', label: language === 'ar' ? 'سند تسليم' : 'Delivery Note', trnTypes: [16] }
  ];

  const [selectedDocTypeId, setSelectedDocTypeId] = useState('sales');
  const selectedDocType = docTypes.find(d => d.id === selectedDocTypeId) || docTypes[0];

  const getIconForType = (typeId) => {
    switch (typeId) {
      case 'sales': return ArrowUpRight;
      case 'sales-return': return RefreshCw;
      case 'purchase': return ArrowDownRight;
      case 'purchase-return': return RefreshCw;
      case 'quotation': return ClipboardList;
      case 'delivery-note': return Truck;
      default: return FileText;
    }
  };

  // States
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('email'); // 'email' | 'whatsapp'
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  
  // Email Form State
  const [emailTo, setEmailTo] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null); // { success, message }
  
  // WhatsApp Form State
  const [phoneNo, setPhoneNo] = useState('');
  const [phonePrefix, setPhonePrefix] = useState('+966'); // Default KSA prefix
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState('app'); // 'app' | 'web'

  // Shares Log State (Session based, clean and empty to remove dummy data)
  const [sharesLog, setSharesLog] = useState([]);

  const suggestionsRef = useRef(null);
  const docTypeDropdownRef = useRef(null);
  const [showDocTypeDropdown, setShowDocTypeDropdown] = useState(false);

  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [whatsappQrCode, setWhatsappQrCode] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // On mount, auto-load invoice from params if passed
  useEffect(() => {
    if (params?.invoice) {
      const inv = params.invoice;
      // Determine the doc type ID based on TRN_TYPE
      let matchedDocTypeId = 'sales';
      if ([6, 7].includes(inv.TRN_TYPE)) matchedDocTypeId = 'sales';
      else if ([3, 4].includes(inv.TRN_TYPE)) matchedDocTypeId = 'sales-return';
      else if ([1, 2].includes(inv.TRN_TYPE)) matchedDocTypeId = 'purchase';
      else if ([8, 9].includes(inv.TRN_TYPE)) matchedDocTypeId = 'purchase-return';
      else if (inv.TRN_TYPE === 19) matchedDocTypeId = 'quotation';
      else if (inv.TRN_TYPE === 16) matchedDocTypeId = 'delivery-note';

      setSelectedDocTypeId(matchedDocTypeId);
      setSelectedInvoice(inv);
      setSearchQuery(`#${inv.INVOICE_NO}`);
    }
  }, [params]);

  // Poll background WhatsApp gateway status
  useEffect(() => {
    let intervalId;
    const fetchStatus = async () => {
      try {
        const baseUrl = API_ENDPOINTS.BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/whatsapp/status`);
        if (response.ok) {
          const data = await response.json();
          setWhatsappStatus(data.status || 'disconnected');
          setWhatsappQrCode(data.qr || null);
        }
      } catch (err) {
        console.error('⚠️ Could not connect to background WhatsApp gateway:', err.message);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000); // poll status every 3 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Dynamic Suggestion Fetch Hook (Debounced)
  useEffect(() => {
    if (!searchQuery || searchQuery.startsWith('#')) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    // Set loading state immediately to prevent visual glitches/old lists showing
    setLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const isPurchase = selectedDocTypeId === 'purchase' || selectedDocTypeId === 'purchase-return';
        const baseUrl = isPurchase ? `${API_ENDPOINTS.BASE_URL}/api/purchases/history` : `${API_ENDPOINTS.BASE_URL}/api/sales`;
        const trnTypesList = DOCUMENT_CATEGORIES[selectedDocTypeId] || [6, 7];
        const url = `${baseUrl}?q=${encodeURIComponent(searchQuery)}&trnType=${trnTypesList.join(',')}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.slice(0, 8));
        }
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedDocTypeId]);

  // Auto-fill template when selected invoice changes
  useEffect(() => {
    if (selectedInvoice) {
      const invNo = selectedInvoice.INVOICE_NO || '';
      const custName = selectedInvoice.ENAME || t('Cash Customer');
      const amount = ((Number(selectedInvoice.NET_AMOUNT) || 0) / (selectedInvoice.CRATE || 1)).toFixed(2);
      const currencyCode = selectedInvoice.CURRENCY_CODE || defaultCurrency.code || 'SAR';
      const datePart = selectedInvoice.CURDATE ? String(selectedInvoice.CURDATE).split(' ')[0] : new Date().toLocaleDateString();

      // Guess email based on customer name
      const safeName = custName.toLowerCase().replace(/[^a-z0-9]/g, '');
      setEmailTo(safeName ? `${safeName}@example.com` : 'client@example.com');
      setEmailCC('accounts@company.com');
      
      setEmailSubject(
        language === 'ar' 
          ? `${selectedDocType.label} رقم ${invNo} من شركة سهلة المحدودة` 
          : `${selectedDocType.label} #${invNo} from EasyERP Limited`
      );

      setEmailBody(
        language === 'ar'
          ? `عزيزي العميل،\n\nنأمل أن تكون بخير. لقد تم إصدار ${selectedDocType.label} الخاص بكم رقم #${invNo} بمبلغ قدره ${currencyCode} ${amount} بتاريخ ${datePart}.\n\nالرجاء الاطلاع على المستند المرفق (PDF) المرفق بهذا البريد لسجلاتكم.\n\nإذا كان لديك أي استفسار، فلا تتردد في الاتصال بنا.\n\nمع أطيب التحيات،\nقسم الحسابات - إيزي إي آر بي`
          : `Dear Customer,\n\nWe hope this email finds you well. Your ${selectedDocType.label} #${invNo} of amount ${currencyCode} ${amount} dated ${datePart} has been generated successfully.\n\nWe have attached the PDF document copy for your records.\n\nShould you have any questions or require further assistance, please do not hesitate to contact our accounting department.\n\nBest regards,\nAccounts Department\nEasyERP Ltd.`
      );

      // WhatsApp Form pre-fills
      setPhoneNo('501234567'); // Placeholder phone
      setWhatsappMessage(
        language === 'ar'
          ? `*عزيزي العميل*،\n\nتم إصدار ${selectedDocType.label} الخاص بكم *#${invNo}* بمبلغ قدره *${currencyCode} ${amount}*.\n\nشكراً لتعاملك معنا!\n*قسم المالية والمبيعات*`
          : `*Dear Customer*,\n\nYour ${selectedDocType.label} *#${invNo}* for *${currencyCode} ${amount}* has been generated.\n\nThank you for your business!\n*EasyERP Team*`
      );
    } else {
      // Clear forms
      setEmailTo('');
      setEmailCC('');
      setEmailSubject('');
      setEmailBody('');
      setPhoneNo('');
      setWhatsappMessage('');
    }
  }, [selectedInvoice, language, defaultCurrency.code, selectedDocTypeId, selectedDocType.label]);

  // Click outside suggestions list & dropdown to close them
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (docTypeDropdownRef.current && !docTypeDropdownRef.current.contains(event.target)) {
        setShowDocTypeDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setSearchQuery(`#${invoice.INVOICE_NO} - ${invoice.ENAME || t('Cash Customer')}`);
    setShowSuggestions(false);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTo) {
      setEmailResult({ success: false, message: language === 'ar' ? 'الرجاء إدخال بريد المستلم' : 'Please enter recipient email' });
      return;
    }
    if (!selectedInvoice) {
      setEmailResult({ success: false, message: 'Please select an invoice first.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailResult(null);

    try {
      const res = await fetch(API_ENDPOINTS.EMAIL_SHARE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: selectedInvoice.INVOICE_NO,
          trnType: selectedInvoice.TRN_TYPE,
          toEmail: emailTo,
          customerName: selectedInvoice.ENAME || '',
          subject: emailSubject || '',
          body: emailBody || ''
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newLog = {
          id: Date.now(),
          type: 'Email',
          recipient: emailTo,
          invoiceNo: selectedInvoice.INVOICE_NO,
          date: new Date().toLocaleString(),
          subject: emailSubject || 'Invoice Share',
          attached: true,
          status: 'Success'
        };
        setSharesLog(prev => [newLog, ...prev]);
        setEmailResult({ success: true, message: language === 'ar' ? `تم إرسال البريد بنجاح إلى ${emailTo}` : `Email sent successfully to ${emailTo}!` });
        
        // Reset form inputs after a brief delay
        setTimeout(() => {
          setSelectedInvoice(null);
          setSearchQuery('');
          setEmailTo('');
          setEmailCC('');
          setEmailSubject('');
          setEmailBody('');
        }, 500);

        // Auto-dismiss the success banner after 4 seconds
        setTimeout(() => {
          setEmailResult(null);
        }, 4000);
      } else {
        setEmailResult({ success: false, message: data.error || 'Failed to send email.' });
      }
    } catch (err) {
      setEmailResult({ success: false, message: 'Network error. Could not reach server.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsapp = async (e) => {
    e.preventDefault();
    if (!phoneNo) {
      setEmailResult({ 
        success: false, 
        message: language === 'ar' ? 'الرجاء إدخال رقم الهاتف أولاً' : 'Please enter the phone number first.' 
      });
      return;
    }

    setIsSendingWhatsapp(true);

    // Strip leading '+' from prefix
    const cleanPrefix = phonePrefix.replace('+', '');
    
    // Strip spaces, hyphens, and leading zero from the phone number
    let cleanPhone = phoneNo.replace(/[\s-()]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    const fullPhone = `${cleanPrefix}${cleanPhone}`;

    // --- CASE 1: HEADLESS PROGRAMMATIC BACKGROUND DISPATCH (OPTION A) ---
    if (whatsappStatus === 'ready') {
      try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL || ''}/api/whatsapp/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNo: selectedInvoice ? selectedInvoice.INVOICE_NO : '',
            trnType: selectedInvoice ? selectedInvoice.TRN_TYPE : 6,
            phone: fullPhone,
            messageBody: whatsappMessage
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const newLog = {
            id: Date.now(),
            type: 'WhatsApp (BG)',
            recipient: `${phonePrefix} ${cleanPhone}`,
            invoiceNo: selectedInvoice ? selectedInvoice.INVOICE_NO : 'N/A',
            date: new Date().toLocaleString(),
            subject: 'Automated Invoice Share (Background)',
            attached: true,
            status: 'Sent'
          };

          setSharesLog(prev => [newLog, ...prev]);

          setEmailResult({
            success: true,
            message: language === 'ar'
              ? 'تم إرسال الفاتورة وملف الـ PDF بنجاح عبر الواتساب!'
              : 'Invoice & PDF attached successfully and dispatched via WhatsApp!'
          });

          // Auto-reset entries 500ms after successful dispatch!
          setTimeout(() => {
            setSelectedInvoice(null);
            setSearchQuery('');
            setPhoneNo('');
            setWhatsappMessage('');
          }, 500);

          // Auto-dismiss the success banner after 4 seconds
          setTimeout(() => {
            setEmailResult(null);
          }, 4000);
        } else {
          setEmailResult({
            success: false,
            message: data.error || 'Failed to dispatch via WhatsApp background service.'
          });
        }
      } catch (err) {
        setEmailResult({
          success: false,
          message: 'Network error. Could not connect to background WhatsApp gateway.'
        });
      } finally {
        setIsSendingWhatsapp(false);
      }
      return;
    }

    // --- CASE 2: LEGACY REDIRECT FALLBACK (GATEWAY NOT CONNECTED) ---
    const encodedText = encodeURIComponent(whatsappMessage);
    const whatsappUrl = whatsappMode === 'app'
      ? `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`
      : `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;

    // Open WhatsApp secure link
    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
      setIsSendingWhatsapp(false);

      const newLog = {
        id: Date.now(),
        type: 'WhatsApp (Redirect)',
        recipient: `${phonePrefix} ${cleanPhone}`,
        invoiceNo: selectedInvoice ? selectedInvoice.INVOICE_NO : 'N/A',
        date: new Date().toLocaleString(),
        subject: 'WhatsApp Share Triggered',
        attached: false,
        status: 'Sent'
      };

      setSharesLog(prev => [newLog, ...prev]);
      
      // Beautiful Premium Pop-up notification modal!
      setEmailResult({ 
        success: true, 
        message: language === 'ar' 
          ? 'تم توجيهك بأمان إلى واتساب لإرسال المستند!' 
          : 'Redirected to WhatsApp successfully! Message drafted.' 
      });
    }, 800);
  };

  const handleWhatsappLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/whatsapp/logout`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWhatsappStatus('disconnected');
          setWhatsappQrCode(null);
          setEmailResult({
            success: true,
            message: language === 'ar' 
              ? 'تم إلغاء ربط جهاز واتساب بنجاح!' 
              : 'WhatsApp device unpaired successfully!'
          });
        } else {
          setEmailResult({
            success: false,
            message: language === 'ar' 
              ? 'فشل في إلغاء الربط: ' + data.error 
              : 'Failed to unlink device: ' + data.error
          });
        }
      }
    } catch (err) {
      setEmailResult({
        success: false,
        message: 'Network error. Could not connect to background WhatsApp gateway.'
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleClearAllFields = (e) => {
    if (e) e.preventDefault();
    setSelectedInvoice(null);
    setSearchQuery('');
    setSuggestions([]);
  };

  const handleCopyLink = () => {
    if (!selectedInvoice) return;
    const shareLink = `https://easyerp.io/shared/invoice/${selectedInvoice.INVOICE_NO}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleCopyBody = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    });
  };

  const handleDeleteLog = (id) => {
    setSharesLog(prev => prev.filter(log => log.id !== id));
  };

  const handleClearLog = () => {
    setSharesLog([]);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-indigo-600/10 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
            <Share2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">
              {language === 'ar' ? 'بوابة مشاركة المستندات' : 'Document Sharing Suite'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
              {language === 'ar' 
                ? 'شارك المستندات والمعاملات مباشرة مع العملاء والموردين عبر البريد الإلكتروني والواتساب في ثوانٍ معدودة' 
                : 'Instantly share documents and transactions directly with clients or suppliers via Email and WhatsApp in seconds'}
            </p>
          </div>
        </div>

        {/* Global stats badges */}
        <div className="flex flex-wrap gap-2">
          <div className="bg-indigo-50/60 dark:bg-zinc-800/40 border border-indigo-100 dark:border-zinc-800 rounded-xl px-4 py-2 text-center min-w-[100px] shadow-sm">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block uppercase tracking-widest">{language === 'ar' ? 'إجمالي المشاركات' : 'Total Shares'}</span>
            <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{sharesLog.length}</span>
          </div>
          <div className="bg-emerald-50/60 dark:bg-zinc-800/40 border border-emerald-100 dark:border-zinc-800 rounded-xl px-4 py-2 text-center min-w-[100px] shadow-sm">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 block uppercase tracking-widest">{language === 'ar' ? 'عبر البريد' : 'Via Email'}</span>
            <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{sharesLog.filter(l => l.type === 'Email').length}</span>
          </div>
          <div className="bg-sky-50/60 dark:bg-zinc-800/40 border border-sky-100 dark:border-zinc-800 rounded-xl px-4 py-2 text-center min-w-[100px] shadow-sm">
            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 block uppercase tracking-widest">{language === 'ar' ? 'عبر واتساب' : 'Via WhatsApp'}</span>
            <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{sharesLog.filter(l => l.type === 'WhatsApp').length}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
        
        {/* Left Side: Invoice Selector & Visual Preview Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 relative">
            <div className="flex items-center gap-2 mb-4">
              <Search className="text-indigo-600 dark:text-indigo-400 shrink-0" size={18} />
              <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest">
                {language === 'ar' ? '1. اختر نوع المستند والبحث' : '1. Select Document & Search'}
              </h2>
            </div>

            {/* Dropdown & Search Input Box */}
            <div className="flex flex-col gap-3">
              {/* Document Type Modern Dropdown Selector */}
              <div className="relative" ref={docTypeDropdownRef}>
                <label className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">{language === 'ar' ? 'نوع المستند' : 'Document Type'}</label>
                
                {/* Trigger Header Button */}
                <button
                  type="button"
                  onClick={() => setShowDocTypeDropdown(!showDocTypeDropdown)}
                  className="w-full flex items-center justify-between bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                      {React.createElement(getIconForType(selectedDocTypeId), { size: 12 })}
                    </div>
                    <span>{selectedDocType.label}</span>
                  </div>
                  <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${showDocTypeDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Floating Selection Popover List */}
                {showDocTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-2xl shadow-2xl z-[110] py-1.5 backdrop-blur-xl animate-in zoom-in-95 duration-100">
                    {docTypes.map(type => {
                      const isSelected = selectedDocTypeId === type.id;
                      const TypeIcon = getIconForType(type.id);

                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setSelectedDocTypeId(type.id);
                            setSelectedInvoice(null);
                            setSearchQuery('');
                            setSuggestions([]);
                            setShowDocTypeDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors text-xs font-bold text-left ${
                            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}>
                              <TypeIcon size={12} />
                            </div>
                            <span>{type.label}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search input with suggestions */}
              <div className="relative" ref={suggestionsRef}>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">{language === 'ar' ? 'البحث عن مستند' : 'Search Document'}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      if (selectedInvoice) setSelectedInvoice(null);
                    }}
                    placeholder={
                      language === 'ar'
                        ? `البحث برقم الـ ${selectedDocType.label} أو العميل...`
                        : `Search ${selectedDocType.label} # or Customer...`
                    }
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm text-foreground font-semibold"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (suggestions && suggestions.length > 0) {
                          e.preventDefault();
                          handleSelectInvoice(suggestions[0]);
                        }
                      }
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                    {loadingSuggestions ? (
                      <RefreshCw size={14} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <Search size={14} />
                    )}
                  </div>
                </div>

                {/* Suggestions Dropdown Popover */}
                {showSuggestions && searchQuery && !searchQuery.startsWith('#') && (suggestions.length > 0 || loadingSuggestions) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl z-[100] max-h-60 overflow-y-auto backdrop-blur-xl animate-in zoom-in-95 duration-100">
                    {loadingSuggestions ? (
                      <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                        {language === 'ar' ? 'جاري البحث في قاعدة البيانات...' : 'Searching database...'}
                      </div>
                    ) : (
                      suggestions.map((sale) => (
                        <button
                          key={sale.REC_NO}
                          type="button"
                          onClick={() => handleSelectInvoice(sale)}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border-b border-border last:border-b-0 transition-colors flex items-center justify-between text-xs font-bold"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText size={15} className="text-indigo-600 dark:text-indigo-400" />
                            <div>
                              <span className="text-foreground block font-black">#{sale.INVOICE_NO}</span>
                              <span className="text-[10px] text-zinc-400 block">{sale.ENAME || t('Cash Customer')}</span>
                            </div>
                          </div>
                          <span className="text-zinc-600 dark:text-zinc-300">
                            {sale.CURRENCY_CODE || 'SAR'} {((Number(sale.NET_AMOUNT) || 0) / (sale.CRATE || 1)).toFixed(2)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Empty suggestions popover */}
                {showSuggestions && searchQuery && !searchQuery.startsWith('#') && !loadingSuggestions && suggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl p-4 text-center text-xs text-zinc-400 italic z-[100]">
                    {language === 'ar' ? 'لم يتم العثور على مستندات مطابقة' : 'No matching documents found'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Invoice Preview Panel */}
          {selectedInvoice ? (
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-75">{language === 'ar' ? 'معاينة المستند' : 'Document Preview'}</span>
                    <h3 className="text-lg font-black tracking-tight mt-0.5">
                      {selectedDocType.label} #{selectedInvoice.INVOICE_NO}
                    </h3>
                  </div>
                  <span className="bg-white/20 text-white border border-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {language === 'ar' ? 'جاهز للمشاركة' : 'Ready'}
                  </span>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-6 space-y-4">
                
                {/* Visual Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
                  <div>
                    <span className="text-[9px] font-black text-zinc-400 block uppercase tracking-wider">{language === 'ar' ? 'العميل' : 'Customer'}</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{selectedInvoice.ENAME || t('Cash Customer')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-zinc-400 block uppercase tracking-wider">{language === 'ar' ? 'التاريخ' : 'Date'}</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {(() => {
                        if (!selectedInvoice.CURDATE) return '-';
                        return String(selectedInvoice.CURDATE).split(' ')[0];
                      })()}
                    </span>
                  </div>
                </div>

                {/* Amount Row */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="text-[9px] font-black text-zinc-400 block uppercase tracking-wider">{language === 'ar' ? 'إجمالي الفاتورة' : 'Invoice Total'}</span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 block leading-tight mt-0.5">
                      {selectedInvoice.CURRENCY_CODE || 'SAR'} {((Number(selectedInvoice.NET_AMOUNT) || 0) / (selectedInvoice.CRATE || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-zinc-400 block uppercase tracking-wider">{language === 'ar' ? 'حالة السداد' : 'Payment Status'}</span>
                    {(() => {
                      const paidAmt = Number(selectedInvoice.CASH_PAID || 0) + Number(selectedInvoice.OTHER_PAID || 0);
                      const netAmt = Number(selectedInvoice.NET_AMOUNT || 0);
                      const isPaid = Math.abs(paidAmt - netAmt) < 0.01;
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase mt-1.5 ${
                          isPaid 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {isPaid ? (language === 'ar' ? 'مدفوعة كاملة' : 'Fully Paid') : (language === 'ar' ? 'مستحقة السداد' : 'Pending')}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Share Link Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm"
                  >
                    {copiedLink ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copiedLink ? (language === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!') : (language === 'ar' ? 'نسخ رابط الفاتورة' : 'Copy Invoice URL')}
                  </button>
                </div>
              </div>

              {/* QR Code Segment */}
              <div className="bg-zinc-50 dark:bg-zinc-900/30 p-5 border-t border-border flex items-center gap-4">
                <div className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-border shadow-inner shrink-0">
                  <QrCode size={48} className="text-zinc-800 dark:text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">{language === 'ar' ? 'رمز الاستجابة السريعة للمشاركة' : 'Quick Share QR Code'}</span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-normal mt-0.5">
                    {language === 'ar'
                      ? 'يمكن للعميل مسح هذا الرمز ضوئياً بهاتفه لقراءة وعرض الفاتورة وتفاصيل السداد مباشرة'
                      : 'The client can scan this QR code on their device to instantly inspect and view the document on-the-go.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Placeholder Card
            <div className="bg-card border border-border rounded-2xl shadow-sm p-8 text-center text-zinc-400 border-dashed border-2 flex flex-col items-center justify-center h-72">
              <FileText size={48} className="text-zinc-300 dark:text-zinc-700 mb-3 animate-pulse" />
              <p className="text-sm font-bold w-3/4 leading-relaxed">
                {language === 'ar'
                  ? 'بمجرد اختيار فاتورة، ستظهر هنا معاينة حية للمستند مع خيارات التنزيل والتفاصيل الكاملة'
                  : 'Search and select an invoice above to display a live interactive document preview here.'}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Communication Channels Suite */}
        <div className="lg:col-span-7">
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-h-[500px]">
            
            {/* Panel Tab Selectors */}
            <div className="flex border-b border-border bg-zinc-50/50 dark:bg-zinc-900/20">
              <button
                onClick={() => setActiveTab('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'email'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-card'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Mail size={16} />
                {language === 'ar' ? 'إرسال بريد إلكتروني' : 'Email Sharing'}
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'whatsapp'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-card'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <MessageSquare size={16} />
                {language === 'ar' ? 'إرسال عبر واتساب' : 'WhatsApp Sharing'}
              </button>
            </div>

            {/* Panel Content Workspace */}
            <div className="p-6">
              
              {/* Tab 1: EMAIL SHARE FORM */}
              {activeTab === 'email' && (
                <form onSubmit={handleSendEmail} className="space-y-4 animate-in fade-in duration-300">
                  
                  {/* Email To */}
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">{language === 'ar' ? 'إلى (بريد المستلم)' : 'To (Recipient Email)'}</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="client@company.com"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-foreground"
                    />
                  </div>

                  {/* Email CC */}
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">{language === 'ar' ? 'نسخة بريد (CC)' : 'CC (Carbon Copy)'}</label>
                    <input
                      type="email"
                      value={emailCC}
                      onChange={(e) => setEmailCC(e.target.value)}
                      placeholder="finance@easyerp.com"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-foreground"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">{language === 'ar' ? 'الموضوع' : 'Subject'}</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={language === 'ar' ? 'إرسال فاتورتك رقم...' : 'Your invoice reference details...'}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-foreground font-semibold"
                    />
                  </div>

                  {/* Rich Text Area Body */}
                  <div className="relative">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{language === 'ar' ? 'نص الرسالة' : 'Email Body'}</label>
                      {emailBody && (
                        <button
                          type="button"
                          onClick={() => handleCopyBody(emailBody)}
                          className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                        >
                          {copiedText ? <Check size={10} /> : <Copy size={10} />}
                          {copiedText ? (language === 'ar' ? 'تم نسخ النص!' : 'Text Copied!') : (language === 'ar' ? 'نسخ النص كاملاً' : 'Copy Full Text')}
                        </button>
                      )}
                    </div>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={6}
                      placeholder={language === 'ar' ? 'اكتب تفاصيل البريد الإلكتروني هنا...' : 'Compose your rich email content here...'}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-foreground font-sans leading-relaxed resize-none"
                    />
                  </div>

                  {/* Simulated PDF Attachment Toggle */}
                  {selectedInvoice && (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-border rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                          <FileText size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 block font-mono">
                            document_{selectedInvoice.INVOICE_NO}.pdf
                          </span>
                          <span className="text-[9px] text-zinc-400 font-bold block">PDF Document • 42.4 KB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider shrink-0 select-none">
                        <CheckCircle size={11} />
                        {language === 'ar' ? 'مرفق' : 'Attached'}
                      </div>
                    </div>
                  )}


                   {/* Send Action Trigger */}
                   <div className="flex gap-2.5">
                     <button
                       type="submit"
                       disabled={isSendingEmail || !selectedInvoice}
                       className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none h-11"
                     >
                       {isSendingEmail ? (
                         <RefreshCw size={14} className="animate-spin" />
                       ) : (
                         <Send size={14} />
                       )}
                       {isSendingEmail 
                         ? (language === 'ar' ? 'جاري إرسال البريد...' : 'Dispatching Email...') 
                         : (language === 'ar' ? 'إرسال الفاتورة بالبريد' : 'Dispatch Invoice via Email')}
                     </button>
                     <button
                       type="button"
                       onClick={handleClearAllFields}
                       disabled={!selectedInvoice}
                       title={language === 'ar' ? 'مسح كل الحقول' : 'Clear all fields'}
                       className="flex items-center justify-center gap-1.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 h-11 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <Trash2 size={14} />
                       {language === 'ar' ? 'مسح' : 'Clear'}
                     </button>
                   </div>

                  {!selectedInvoice && (
                    <div className="flex items-center gap-2 text-rose-500/80 text-[10px] font-bold uppercase tracking-wider justify-center">
                      <AlertCircle size={12} />
                      {language === 'ar' ? 'الرجاء اختيار فاتورة أولاً لتمكين الإرسال' : 'Please select an invoice first to unlock sending options'}
                    </div>
                  )}
                </form>
              )}

              {/* Tab 2: WHATSAPP SHARE FORM */}
              {activeTab === 'whatsapp' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  
                  {/* WhatsApp Background Status Header */}
                  {whatsappStatus === 'ready' ? (
                    <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/10 border border-emerald-200/60 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between gap-4 shadow-sm animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                          <CheckCircle size={16} className="animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                            {language === 'ar' ? 'بوابة واتساب نشطة' : 'WhatsApp Gateway Active'}
                          </span>
                          <span className="text-[9px] text-emerald-600/90 dark:text-emerald-500 font-bold block mt-0.5 leading-tight">
                            {language === 'ar' ? 'جهازك متصل بالكامل وجاهز للإرسال' : 'Connected & ready for background share'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={handleWhatsappLogout}
                        disabled={isLoggingOut}
                        title={language === 'ar' ? 'تسجيل الخروج وإلغاء ربط الجهاز' : 'Logout and unlink device'}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20 transition-all font-black text-[9px] uppercase tracking-wider shrink-0 h-8 disabled:opacity-50"
                      >
                        {isLoggingOut ? (
                          <RefreshCw size={10} className="animate-spin" />
                        ) : (
                          <LogOut size={10} />
                        )}
                        {language === 'ar' ? 'إلغاء الربط' : 'Logout'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center text-center shadow-sm">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-2.5">
                        <QrCode size={18} className={whatsappStatus === 'connecting' || whatsappStatus === 'authenticating' ? 'animate-spin' : ''} />
                      </div>
                      <span className="text-xs font-black text-foreground uppercase tracking-widest block mb-1">
                        {language === 'ar' ? 'ربط تطبيق واتساب (موصى به)' : 'Link WhatsApp App (Recommended)'}
                      </span>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold max-w-sm mb-3.5 leading-relaxed">
                        {language === 'ar'
                          ? 'امسح الرمز ضوئيًا مرة واحدة لتمكين الإرسال الفوري في الخلفية بنقرة زر واحدة دون أي نوافذ منبثقة.'
                          : 'Scan the QR code once with your phone WhatsApp to enable instant single-click background dispatches.'}
                      </p>

                      {/* Live QR Image Container */}
                      <div className="relative p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-inner mb-3.5 flex items-center justify-center min-h-[150px] min-w-[150px]">
                        {whatsappStatus === 'qr_ready' && whatsappQrCode ? (
                          <img 
                            src={whatsappQrCode} 
                            alt="WhatsApp Link QR" 
                            className="w-32 h-32 rounded-lg select-none drag-none" 
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-indigo-600" />
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">
                              {whatsappStatus === 'connecting'
                                ? (language === 'ar' ? 'جاري الاتصال...' : 'Connecting...')
                                : whatsappStatus === 'authenticating'
                                ? (language === 'ar' ? 'جاري التحقق...' : 'Authenticating...')
                                : (language === 'ar' ? 'جاري إنشاء الرمز...' : 'Generating QR...')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Fallback Notice */}
                      <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
                        💡 {language === 'ar' ? 'ملاحظة: يمكنك الإرسال بدون ربط عبر خيار التحويل التلقائي أدناه' : 'Tip: You can still send without linking using fallback below'}
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleSendWhatsapp} className="space-y-4">
                    
                    {/* Phone Input Box */}
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1.5">
                        {language === 'ar' ? 'رقم هاتف العميل (واتساب)' : 'Client Phone Number (WhatsApp)'}
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={phonePrefix}
                          onChange={(e) => setPhonePrefix(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2.5 text-xs font-bold outline-none text-foreground"
                        >
                          <option value="+966">🇸🇦 +966 (KSA)</option>
                          <option value="+971">🇦🇪 +971 (UAE)</option>
                          <option value="+965">🇰🇼 +965 (KWT)</option>
                          <option value="+973">🇧🇭 +973 (BAH)</option>
                          <option value="+968">🇴🇲 +968 (OMN)</option>
                          <option value="+91">🇮🇳 +91 (IND)</option>
                        </select>
                        <input
                          type="text"
                          value={phoneNo}
                          onChange={(e) => setPhoneNo(e.target.value)}
                          placeholder="50 123 4567"
                          className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-foreground"
                        />
                      </div>
                    </div>

                    {/* Only show routing mode if gateway is not connected */}
                    {whatsappStatus !== 'ready' && (
                      <div>
                        <label className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">
                          {language === 'ar' ? 'طريقة الإرسال (احتياطي)' : 'Routing Mode (Fallback)'}
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                          <button
                            type="button"
                            onClick={() => setWhatsappMode('app')}
                            className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                              whatsappMode === 'app'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                          >
                            🚀 {language === 'ar' ? 'تطبيق واتساب' : 'WhatsApp App'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhatsappMode('web')}
                            className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                              whatsappMode === 'web'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                          >
                            🌐 {language === 'ar' ? 'واتساب ويب' : 'WhatsApp Web'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rich Text Area Body */}
                    <div className="relative">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                          {language === 'ar' ? 'نص رسالة واتساب' : 'WhatsApp Message Body'}
                        </label>
                        {whatsappMessage && (
                          <button
                            type="button"
                            onClick={() => handleCopyBody(whatsappMessage)}
                            className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                          >
                            {copiedText ? <Check size={10} /> : <Copy size={10} />}
                            {copiedText ? (language === 'ar' ? 'تم نسخ النص!' : 'Text Copied!') : (language === 'ar' ? 'نسخ النص كاملاً' : 'Copy Full Text')}
                          </button>
                        )}
                      </div>
                      <textarea
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        rows={6}
                        placeholder={language === 'ar' ? 'اكتب رسالة واتساب هنا...' : 'Enter WhatsApp formatted message text here...'}
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-foreground font-sans leading-relaxed resize-none"
                      />
                      <div className="text-[9px] font-bold text-zinc-400 mt-1 uppercase">
                        {language === 'ar'
                          ? 'ملاحظة: يمكنك استخدام الرموز *الخط العريض* و _المائل_ لتنسيق النص'
                          : 'Tip: You can use markdown modifiers like *bold* and _italic_ to format your WhatsApp text.'}
                      </div>
                    </div>

                    {/* Send Action Trigger */}
                    <div className="flex gap-2.5">
                      <button
                        type="submit"
                        disabled={isSendingWhatsapp || !selectedInvoice}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none h-11"
                      >
                        {isSendingWhatsapp ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <MessageSquare size={14} />
                        )}
                        {isSendingWhatsapp
                          ? (language === 'ar' ? 'جاري الإرسال...' : (whatsappStatus === 'ready' ? 'Sending headlessly...' : 'Opening WhatsApp...'))
                          : (language === 'ar' ? 'إرسال الفاتورة عبر الواتساب' : (whatsappStatus === 'ready' ? 'Send via WhatsApp (Single Click)' : `Dispatch via ${whatsappMode === 'app' ? 'WhatsApp App' : 'WhatsApp Web'}`))}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllFields}
                        disabled={!selectedInvoice}
                        title={language === 'ar' ? 'مسح كل الحقول' : 'Clear all fields'}
                        className="flex items-center justify-center gap-1.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-black text-xs uppercase tracking-widest rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 h-11 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        {language === 'ar' ? 'مسح' : 'Clear'}
                      </button>
                    </div>

                    {!selectedInvoice && (
                      <div className="flex items-center gap-2 text-rose-500/80 text-[10px] font-bold uppercase tracking-wider justify-center">
                        <AlertCircle size={12} />
                        {language === 'ar' ? 'الرجاء اختيار فاتورة أولاً لتمكين الإرسال' : 'Please select an invoice first to unlock sending options'}
                      </div>
                    )}
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Persistent Session Shares Log */}
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden mt-8 animate-in fade-in duration-500">
        
        {/* Header and clear controls */}
        <div className="px-6 py-5 bg-zinc-50/50 dark:bg-zinc-900/10 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="text-indigo-600 dark:text-indigo-400" size={18} />
            <h3 className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
              {t('shareHistory')}
            </h3>
          </div>
          {sharesLog.length > 0 && (
            <button
              onClick={handleClearLog}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 px-3 py-1.5 rounded-lg transition-colors border border-transparent"
            >
              <Trash2 size={12} />
              {language === 'ar' ? 'مسح السجل' : 'Clear Log'}
            </button>
          )}
        </div>

        {/* Share History Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/30 dark:bg-zinc-800/30 border-b border-border text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                <th className="px-6 py-3.5">{language === 'ar' ? 'النوع' : 'Medium'}</th>
                <th className="px-6 py-3.5">{language === 'ar' ? 'المستلم' : 'Recipient'}</th>
                <th className="px-6 py-3.5">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice'}</th>
                <th className="px-6 py-3.5">{language === 'ar' ? 'الموضوع / الرسالة' : 'Description'}</th>
                <th className="px-6 py-3.5">{language === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</th>
                <th className="px-6 py-3.5 text-center">{language === 'ar' ? 'المرفقات' : 'Attachment'}</th>
                <th className="px-6 py-3.5 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {sharesLog.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-zinc-400 italic">
                    {language === 'ar'
                      ? 'لم يتم إرسال أي مستندات في هذه الجلسة حتى الآن.'
                      : 'No documents shared in this session yet.'}
                  </td>
                </tr>
              ) : (
                sharesLog.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors group"
                  >
                    {/* Medium */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        log.type === 'Email'
                          ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30'
                          : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30'
                      }`}>
                        {log.type === 'Email' ? <Mail size={10} /> : <MessageSquare size={10} />}
                        {log.type}
                      </span>
                    </td>
                    {/* Recipient */}
                    <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-200">
                      {log.recipient}
                    </td>
                    {/* Invoice No */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        #{log.invoiceNo}
                      </span>
                    </td>
                    {/* Description preview */}
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 max-w-xs truncate font-medium">
                      {log.subject}
                    </td>
                    {/* Timestamp */}
                    <td className="px-6 py-4 text-zinc-400 font-bold text-[10px]">
                      {log.date}
                    </td>
                    {/* Attachment status */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                        log.attached
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {log.attached ? (language === 'ar' ? 'مرفق PDF' : 'PDF Attach') : (language === 'ar' ? 'لا يوجد' : 'None')}
                      </span>
                    </td>
                    {/* Send Status */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        <CheckCircle size={10} className="shrink-0" />
                        {log.status === 'Success' ? (language === 'ar' ? 'ناجح' : 'Success') : (language === 'ar' ? 'تم الإرسال' : 'Sent')}
                      </span>
                    </td>
                    {/* Delete action */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove Log Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Notification Toast Dialog Box on Top */}
      {emailResult && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm border rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          emailResult.success 
            ? 'bg-emerald-600 dark:bg-emerald-950 text-white dark:text-emerald-100 border-emerald-500 dark:border-emerald-850 shadow-emerald-500/20' 
            : 'bg-rose-600 dark:bg-rose-950 text-white dark:text-rose-100 border-rose-500 dark:border-rose-850 shadow-rose-500/20'
        }`}>
          
          {/* Status Icon */}
          <div className={`p-2 rounded-xl shrink-0 ${
            emailResult.success 
              ? 'bg-white/10 dark:bg-emerald-500/10 text-white dark:text-emerald-400 border border-white/20 dark:border-emerald-500/20' 
              : 'bg-white/10 dark:bg-rose-500/10 text-white dark:text-rose-400 border border-white/20 dark:border-rose-500/20'
          }`}>
            {emailResult.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          </div>

          {/* Info Details */}
          <div className="flex-1 min-w-0 pr-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest block leading-tight">
              {emailResult.success 
                ? (language === 'ar' ? 'تم الإرسال بنجاح' : 'Dispatch Success') 
                : (language === 'ar' ? 'فشل الإرسال' : 'Dispatch Failed')
              }
            </span>
            <p className={`text-[10px] font-bold leading-normal mt-1 leading-relaxed ${
              emailResult.success ? 'text-emerald-100 dark:text-emerald-300' : 'text-rose-100 dark:text-rose-300'
            }`}>
              {emailResult.message}
            </p>
          </div>

          {/* Close Trigger Button */}
          <button
            onClick={() => setEmailResult(null)}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              emailResult.success 
                ? 'text-emerald-200 hover:text-white hover:bg-white/10 dark:text-emerald-400 dark:hover:text-emerald-200 dark:hover:bg-emerald-900/40' 
                : 'text-rose-200 hover:text-white hover:bg-white/10 dark:text-rose-400 dark:hover:text-rose-200 dark:hover:bg-rose-900/40'
            }`}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
