import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { API_ENDPOINTS } from '../config';
import { useCache } from '../context/CacheContext';
import Toolbar from '../components/Toolbar';
import InvoiceHeader from '../components/InvoiceHeader';
import CustomerDetails from '../components/CustomerDetails';
import SalesGrid from '../components/SalesGrid';
import SummaryFooter from '../components/SummaryFooter';
import InvoiceModal from '../components/InvoiceModal';
import PendingSalesModal from '../components/PendingSalesModal';
import { useLanguage } from '../context/LanguageContext';

export default function SalesPage({ user, params = {}, navigateTo, onBack }) {
  const { t, language } = useLanguage();
  const {
    refreshCache,
    cachedAccounts,
    taxIncluded, setTaxIncluded,
    historyInvoiceColumns,
    defaultCurrency,
    pendingSales, addPendingSale, removePendingSale, clearPendingSales
  } = useCache();

  // Database-synced User Entry Options States
  const [autoPrint, setAutoPrint] = useState(false);
  const [defaultPrintPaper, setDefaultPrintPaper] = useState('Thermal');
  const [showInvoiceAfterSave, setShowInvoiceAfterSave] = useState(true);
  const [enterToQty, setEnterToQty] = useState(false);
  const [crystalPrint, setCrystalPrint] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    itemCode: true, description: true, unit: true, qty: true, 
    price: true, aliasCode: true, vatAmt: true, total: true, stock: true
  });

  const [salesData, setSalesData] = useState([]);
  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 2, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 3, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 4, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 5, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
  ]);

  // Shared Sales State
  const [invoiceNo, setInvoiceNo] = useState('Loading...');
  const [customer, setCustomer] = useState({ id: '', name: 'Loading...' });
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState({
    street: '', city: '', district: '', building: '', pincode: ''
  });
  const [referenceNo, setReferenceNo] = useState('');

  // Totals for saving
  const [totals, setTotals] = useState({
    gross: 0, discount: 0, net: 0, vat: 0
  });

  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashPaid, setCashPaid] = useState(0);
  const [otherPaid, setOtherPaid] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('1');
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [editingRecNo, setEditingRecNo] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency.no);
  const [isSaving, setIsSaving] = useState(false);
  const [isZatcaEnabled, setIsZatcaEnabled] = useState(false);
  const [isPrintEnabled, setIsPrintEnabled] = useState(false);
  const loadUserOptions = async () => {
    if (!user?.userid) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.USER_ENTRY_OPTIONS}?userId=${user.userid}&trnType=6`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.options) {
          const opts = data.options;
          setAutoPrint(opts.Auto_print === true || opts.Auto_print === 1);
          setDefaultPrintPaper(opts.Default_Print_paper || 'Thermal');
          setShowInvoiceAfterSave(opts.Show_Invoce === true || opts.Show_Invoce === 1);
          setEnterToQty(opts.Auto_next_Line === true || opts.Auto_next_Line === 1 ? false : true);
          setCrystalPrint(opts.Crystal_Print === true || opts.Crystal_Print === 1);
          
          if (opts.grid_coolums) {
            const keys = ['itemCode', 'description', 'unit', 'qty', 'price', 'aliasCode', 'vatAmt', 'total', 'stock'];
            const newCols = {};
            keys.forEach((k, idx) => {
              newCols[k] = opts.grid_coolums[idx] === '1';
            });
            setVisibleColumns(newCols);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user entry options:", err);
    }
  };

  const saveUserOptions = async () => {
    if (!user?.userid) return;
    
    // We get latest states from closure directly since this runs on Save click
    const keys = ['itemCode', 'description', 'unit', 'qty', 'price', 'aliasCode', 'vatAmt', 'total', 'stock'];
    const gridStr = keys.map(k => (visibleColumns[k] ? '1' : '0')).join('').padEnd(10, '1');

    try {
      await fetch(API_ENDPOINTS.USER_ENTRY_OPTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userid,
          trnType: 6,
          autoPrint: autoPrint,
          defaultPrintPaper: defaultPrintPaper,
          showInvoce: showInvoiceAfterSave,
          autoNextLine: !enterToQty,
          gridCoolums: gridStr,
          crystalPrint: crystalPrint
        })
      });
    } catch (err) {
      console.error("Failed to save user entry options:", err);
    }
  };

  useEffect(() => {
    loadUserOptions();
  }, [user]);

  // Sync when local settings are manipulated, ensuring instant backend sync on click of options
  useEffect(() => {
    if (user?.userid) {
      saveUserOptions();
    }
  }, [autoPrint, defaultPrintPaper, showInvoiceAfterSave, enterToQty, visibleColumns, crystalPrint]);
  
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const handleHoldAndNew = () => {
    const hasItems = rows.some(r => r.itemCode.trim() !== '');
    if (hasItems) {
      const currentSale = {
        id: Date.now(),
        rows: [...rows],
        customer: { ...customer },
        vatNumber,
        address: { ...address },
        totals: { ...totals },
        selectedWarehouse,
        selectedCurrency,
        paymentMethod,
        cashPaid,
        otherPaid,
        referenceNo
      };
      addPendingSale(currentSale);
    }
    resetPage();
  };

  const handleRestoreSale = (sale) => {
    setRows(sale.rows);
    setCustomer(sale.customer);
    setVatNumber(sale.vatNumber);
    setAddress(sale.address);
    setTotals(sale.totals);
    setSelectedWarehouse(sale.selectedWarehouse);
    setSelectedCurrency(sale.selectedCurrency);
    setPaymentMethod(sale.paymentMethod);
    setCashPaid(sale.cashPaid);
    setOtherPaid(sale.otherPaid);
    setReferenceNo(sale.referenceNo || '');
    
    // Remove from pending
    removePendingSale(sale.id);
    setIsPendingModalOpen(false);
  };

  const handleRemovePending = (id) => {
    removePendingSale(id);
  };

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const fetchInvoiceNo = () => {
    if (editingRecNo) return; // Don't fetch if editing
    fetch(API_ENDPOINTS.INVOICE_NEXT)
      .then(res => res.json())
      .then(data => setInvoiceNo(data.nextInvoice))
      .catch(err => console.error("Failed to fetch next invoice:", err));
  };

  const resetPage = () => {
    setEditingRecNo(null);
    setIsZatcaEnabled(false);
    setIsPrintEnabled(false);
    fetchInvoiceNo();
    // Complete Reset
    setVatNumber('');
    setPaymentMethod('');
    setCashPaid(0);
    setOtherPaid(0);
    setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
    setValidationErrors([]);
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setReferenceNo('');
    setRows([
      { id: Date.now(), itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 1, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 2, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 3, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 4, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    ]);
  };

  const handleSave = async (isQuickSave = false) => {
    if (invoiceNo === 'Loading...') {
      alert('Invoice number is still loading. Please wait.');
      return;
    }

    if (!isQuickSave && !paymentMethod) {
      alert('Please select a payment method before saving.');
      return;
    }

    if (!customer.id || customer.id === '6000') {
      if (!isQuickSave && false) return; // Removed confirmation prompt
    }

    // MANDATORY VALIDATION: If VAT Number is added, address fields are mandatory
    if (vatNumber && vatNumber.trim() !== '') {
      const errors = [];
      if (!address.building?.trim()) errors.push('building');
      if (!address.street?.trim()) errors.push('street');
      if (!address.district?.trim()) errors.push('district');
      if (!address.city?.trim()) errors.push('city');
      if (!address.pincode?.trim()) errors.push('pincode');

      if (errors.length > 0) {
        setValidationErrors(errors);
        alert(`VAT Invoice requires a complete address.`);
        return;
      }
    }
    setValidationErrors([]);

    if (isSaving) return;
    setIsSaving(true);

    try {
      const finalPaymentMethod = isQuickSave ? 'Others' : paymentMethod;
      const finalCashPaid = isQuickSave ? 0 : cashPaid;
      const finalOtherPaid = isQuickSave ? 0 : otherPaid;

      const payload = {
        INVOICE_NO: String(invoiceNo),
        ACCODE: String(customer.id || ''),
        ENAME: String(customer.name || ''),
        G_TOTAL: totals.gross,
        DISC_AMT: totals.discount,
        NET_AMOUNT: totals.net,
        VAT_AMOUNT: totals.vat,
        CASH_PAID: finalCashPaid,
        OTHER_PAID: finalOtherPaid,
        VAT_NUMBER: String(vatNumber || ''),
        PAYMENT_METHOD: finalPaymentMethod,
        TAX_INCLUDED: taxIncluded,
        USERNAME: user?.username || '',
        WR_CODE: selectedWarehouse,
        REC_NO: editingRecNo,
        CURRENCY: selectedCurrency,
        TRN_TYPE: finalPaymentMethod === 'Cash' ? 6 : 7,
        ADDRESS: address,
        REF_INV_NO: referenceNo,
        ROWS: rows.filter(r => r.itemCode.trim() !== '')
      };

      console.log('💎 SALES_PAGE: Sending payload:', payload);
      const res = await fetch(API_ENDPOINTS.SALES_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        
        refreshCache();
        setIsZatcaEnabled(true);
        setIsPrintEnabled(true);
        setInvoiceNo(result.INVOICE_NO);
        setEditingRecNo(result.REC_NO);

        const invoiceData = {
          REC_NO: result.REC_NO,
          INVOICE_NO: result.INVOICE_NO,
          CURDATE: new Date().toISOString(),
          ENAME: customer.name || 'Cash Customer',
          ACCODE: customer.id,
          G_TOTAL: totals.gross,
          DISC_AMT: totals.discount,
          NET_AMOUNT: totals.net,
          VAT_AMOUNT: totals.vat,
          VAT_NUMBER: vatNumber,
          TRN_TYPE: finalPaymentMethod === 'Cash' ? 6 : 7,
          REF_NO: referenceNo,
          CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
        };

        if (autoPrint || (showInvoiceAfterSave && !isQuickSave)) {
          setSavedInvoice(invoiceData);
        } else {
          alert(`Sale saved successfully! Invoice No: ${result.INVOICE_NO}`);
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.details || 'Save failed'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Error saving sale');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceNo || invoiceNo === 'Loading...') return;
    const invoiceData = {
      REC_NO: editingRecNo || 0,
      INVOICE_NO: invoiceNo,
      CURDATE: new Date().toISOString(),
      ENAME: customer.name || 'Cash Customer',
      ACCODE: customer.id,
      G_TOTAL: totals.gross,
      DISC_AMT: totals.discount,
      NET_AMOUNT: totals.net,
      VAT_AMOUNT: totals.vat,
      VAT_NUMBER: vatNumber,
      TRN_TYPE: paymentMethod === 'Cash' ? 6 : 7,
      REF_NO: referenceNo,
      CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
    };
    setSavedInvoice(invoiceData);
  };

  const handleCloseInvoice = () => {
    setSavedInvoice(null);
  };

  useEffect(() => {
    if (!params?.editSale) {
      fetchInvoiceNo();
    }

    // Fetch Default Cash Customer (6000)
    fetch(API_ENDPOINTS.CUSTOMER_BY_ID('6000'))
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.ACC_NO) {
          setCustomer({ id: String(data.ACC_NO), name: data.ACC_NAME });
        }
      })
      .catch(err => {
        console.error("Failed to fetch default customer:", err);
        setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
      });

    fetch(API_ENDPOINTS.SALES_HISTORY)
      .then(res => res.json())
      .then(data => setSalesData(data))
      .catch(err => console.error("Failed to fetch database sales:", err));

    fetch(API_ENDPOINTS.WAREHOUSE_LIST)
      .then(res => res.json())
      .then(data => {
        setWarehouses(data);
        if (data.length > 0) setSelectedWarehouse(String(data[0].WR_CODE));
      })
      .catch(err => console.error("Failed to fetch warehouses:", err));

    fetch(API_ENDPOINTS.CURRENCY_LIST)
      .then(res => res.json())
      .then(data => {
        setCurrencies(data);
        if (data.length > 0 && !editingRecNo) {
          setSelectedCurrency(defaultCurrency.no);
        }
      })
      .catch(err => console.error("Failed to fetch currencies:", err));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleHoldAndNew();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, customer, vatNumber, address, totals, selectedWarehouse, selectedCurrency, paymentMethod, cashPaid, otherPaid]);

  // Handle Edit Mode from Params
  useEffect(() => {
    if (params && params.editSale) {
      const sale = params.editSale;
      setEditingRecNo(sale.REC_NO);
      setIsZatcaEnabled(true);
      setIsPrintEnabled(true);
      setInvoiceNo(sale.INVOICE_NO);
      setCustomer({ id: String(sale.ACCODE || ''), name: sale.ENAME || '' });
      setVatNumber(sale.VAT_NUMBER || '');
      setPaymentMethod(sale.TRN_TYPE === 6 ? 'Cash' : 'Others');
      setReferenceNo(sale.REF_NO || '');
      
      // Fetch Sale Items
      fetch(API_ENDPOINTS.SALE_ITEMS(sale.REC_NO))
        .then(res => res.json())
        .then(items => {
          const mappedRows = items.map((item, idx) => ({
            id: idx + 1,
            itemCode: item.BARCODE,
            description: item.DESCRIPTION,
            unit: item.UNIT,
            qty: item.QTY,
            price: item.UNIT_PRICE,
            vatPercent: item.VAT_PERCENT,
            vatAmt: item.VAT_AMOUNT,
            total: item.ITM_TOTAL,
            aliasCode: '',
            stock: ''
          }));
          
          // Fill up to at least 5 rows
          while (mappedRows.length < 5) {
            mappedRows.push({ 
              id: mappedRows.length + 1, 
              itemCode: '', description: '', unit: '', qty: '', price: '', 
              aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '', unitId: '' 
            });
          }
          setRows(mappedRows);
        })
        .catch(err => console.error("Failed to fetch edit items:", err));
        
      // Fetch Customer Address if available
      if (sale.ACCODE && sale.ACCODE !== '6000') {
        fetch(API_ENDPOINTS.CUSTOMER_INFO(sale.ACCODE))
          .then(res => res.json())
          .then(data => {
            if (data) {
              setAddress({
                building: data.building_no || '',
                street: data.street_name || '',
                district: data.district || '',
                city: data.city_name || '',
                pincode: data.postal_zone || ''
              });
            }
          });
      }
    }
  }, [params]);

  // Handle Load Quotation Mode from Params
  useEffect(() => {
    if (params && params.loadQuotation) {
      const sale = params.loadQuotation;
      setEditingRecNo(null);
      fetchInvoiceNo();
      setCustomer({ id: String(sale.ACCODE || ''), name: sale.ENAME || '' });
      setVatNumber(sale.VAT_NUMBER || '');
      setReferenceNo(sale.INVOICE_NO ? `QTN-${sale.INVOICE_NO}` : '');
      
      // Fetch Sale Items
      fetch(API_ENDPOINTS.SALE_ITEMS(sale.REC_NO))
        .then(res => res.json())
        .then(items => {
          const mappedRows = items.map((item, idx) => ({
            id: idx + 1,
            itemCode: item.BARCODE,
            description: item.DESCRIPTION,
            unit: item.UNIT,
            qty: item.QTY,
            price: item.UNIT_PRICE,
            vatPercent: item.VAT_PERCENT,
            vatAmt: item.VAT_AMOUNT,
            total: item.ITM_TOTAL,
            aliasCode: '',
            stock: ''
          }));
          
          // Fill up to at least 5 rows
          while (mappedRows.length < 5) {
            mappedRows.push({ 
              id: mappedRows.length + 1, 
              itemCode: '', description: '', unit: '', qty: '', price: '', 
              aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '', unitId: '' 
            });
          }
          setRows(mappedRows);
        })
        .catch(err => console.error("Failed to fetch edit items:", err));
        
      // Fetch Address (First from invoice address, then fallback to customer info)
      fetch(API_ENDPOINTS.INVOICE_ADDRESS(sale.INVOICE_NO, sale.TRN_TYPE))
        .then(res => res.ok ? res.json() : null)
        .then(adhocAddress => {
          if (adhocAddress) {
            setAddress({
              building: adhocAddress.building || '',
              street: adhocAddress.street || '',
              district: adhocAddress.district || '',
              city: adhocAddress.city || '',
              pincode: adhocAddress.pincode || ''
            });
          } else if (sale.ACCODE && sale.ACCODE !== '6000') {
            fetch(API_ENDPOINTS.CUSTOMER_INFO(sale.ACCODE))
              .then(res => res.json())
              .then(data => {
                if (data) {
                  setAddress({
                    building: data.building_no || '',
                    street: data.street_name || '',
                    district: data.district || '',
                    city: data.city_name || '',
                    pincode: data.postal_zone || ''
                  });
                }
              });
          }
        })
        .catch(err => console.error("Failed to fetch address for quotation load:", err));
    }
  }, [params]);

  useEffect(() => {
    if (cachedAccounts.length > 0) {
      setAccounts(cachedAccounts);
      if (!selectedAccount) setSelectedAccount(String(cachedAccounts[0].ACC_NO));
    }
  }, [cachedAccounts, selectedAccount]);

  const handleZatcaSubmit = async () => {
    try {
      const trnType = paymentMethod === 'Cash' ? 6 : 7;
      alert(`ZATCA: Submitting Sales Invoice #${invoiceNo} (Type: ${trnType === 6 ? 'Cash Sale' : 'Credit Sale'}) to ZATCA server...`);
      const res = await fetch(API_ENDPOINTS.ZATCA_SUBMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: String(invoiceNo),
          trnType: trnType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ ZATCA SUCCESS: Invoice #${invoiceNo} processed and submitted successfully!\n${data.message || ''}`);
      } else {
        alert(`❌ ZATCA ERROR: ${data.error || 'Submission failed'}\n${data.details || ''}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ ZATCA Request Failed: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        <div className="flex items-center justify-between mb-6 px-2 shrink-0 gap-4">
          <div className="flex-1">
            <Toolbar 
              visibleColumns={visibleColumns} 
              setVisibleColumns={setVisibleColumns} 
              taxIncluded={taxIncluded} 
              setTaxIncluded={setTaxIncluded} 
              enterToQty={enterToQty} 
              setEnterToQty={setEnterToQty}
              showInvoiceAfterSave={showInvoiceAfterSave}
              setShowInvoiceAfterSave={setShowInvoiceAfterSave}
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              onNew={handleHoldAndNew}
              onPending={() => setIsPendingModalOpen(true)}
              onHistory={() => navigateTo?.('sales-history')}
              onReturn={() => navigateTo?.('sales-return')}
              onClear={resetPage}
              pendingCount={pendingSales.length}
              autoPrint={autoPrint}
              setAutoPrint={setAutoPrint}
              defaultPrintPaper={defaultPrintPaper}
              setDefaultPrintPaper={setDefaultPrintPaper}
              onSaveOptions={saveUserOptions}
              crystalPrint={crystalPrint}
              setCrystalPrint={setCrystalPrint}
            />
          </div>

          <div className="flex items-center gap-4">
            {editingRecNo && onBack && (
              <button 
                onClick={onBack}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-500"
              >
                <ChevronRight className="rotate-180" size={24} />
              </button>
            )}
            <h2 className={`text-2xl font-black ${editingRecNo ? 'text-indigo-600' : 'text-rose-500'} uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0`}>
              {editingRecNo ? (language === 'ar' ? 'تعديل فاتورة' : 'EDIT SALE') : (language === 'ar' ? 'مبيعات آجلة' : 'CREDIT SALES')}
            </h2>
          </div>
        </div>
        <div className="flex flex-col flex-1 pb-6 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch shrink-0">
            <InvoiceHeader 
              invoiceNo={invoiceNo} 
              warehouses={warehouses}
              selectedWarehouse={selectedWarehouse}
              setSelectedWarehouse={setSelectedWarehouse}
              referenceNo={referenceNo}
              onReferenceChange={setReferenceNo}
            />
            <CustomerDetails
              customer={customer}
              setCustomer={setCustomer}
              vatNumber={vatNumber}
              setVatNumber={setVatNumber}
              setAddress={setAddress}
              address={address}
              handleAddressChange={handleAddressChange}
              validationErrors={validationErrors}
              setSelectedCurrency={setSelectedCurrency}
            />
          </div>

          <SalesGrid initialData={[]} rows={rows} setRows={setRows} visibleColumns={visibleColumns} enterToQty={enterToQty} taxIncluded={taxIncluded} />

          <SummaryFooter
            rows={rows}
            taxIncluded={taxIncluded}
            onTotalsChange={setTotals}
            onSave={handleSave}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            cashPaid={cashPaid}
            setCashPaid={setCashPaid}
            otherPaid={otherPaid}
            setOtherPaid={setOtherPaid}
            accounts={accounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            customerId={customer.id}
            isSaving={isSaving}
            currencyCode={currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'}
            isZatcaEnabled={isZatcaEnabled}
            onZatcaSubmit={handleZatcaSubmit}
            isPrintEnabled={isPrintEnabled}
            onPrint={handlePrint}
            autoPrint={autoPrint}
            setAutoPrint={setAutoPrint}
          />
        </div>
      </div>

      {/* Final Invoice Modal */}
      <InvoiceModal 
        sale={savedInvoice} 
        onClose={handleCloseInvoice}
        address={address}
        historyInvoiceColumns={historyInvoiceColumns}
        autoPrint={autoPrint}
        crystalPrint={crystalPrint}
        defaultPrintPaper={defaultPrintPaper}
      />

      <PendingSalesModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        pendingSales={pendingSales}
        onSelect={handleRestoreSale}
        onRemove={handleRemovePending}
        onClearAll={clearPendingSales}
      />
    </div>
  );
}
