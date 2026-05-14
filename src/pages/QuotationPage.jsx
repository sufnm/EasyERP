import React, { useState, useEffect } from 'react';
import { ChevronRight, ScrollText } from 'lucide-react';
import { API_ENDPOINTS } from '../config';
import { useCache } from '../context/CacheContext';
import Toolbar from '../components/Toolbar';
import InvoiceHeader from '../components/InvoiceHeader';
import CustomerDetails from '../components/CustomerDetails';
import SalesGrid from '../components/SalesGrid';
import QuotationSummaryFooter from '../components/QuotationSummaryFooter';
import InvoiceModal from '../components/InvoiceModal';
import PendingQuotationsModal from '../components/PendingQuotationsModal';
import { useLanguage } from '../context/LanguageContext';

export default function QuotationPage({ user, params = {}, navigateTo, onBack }) {
  const { t, language } = useLanguage();
  const {
    refreshCache,
    cachedAccounts,
    taxIncluded, setTaxIncluded,
    enterToQty, setEnterToQty,
    visibleColumns, setVisibleColumns,
    historyInvoiceColumns,
    showInvoiceAfterSave, setShowInvoiceAfterSave,
    defaultCurrency,
    selectedQuotationTermIds: selectedTermIds,
    setSelectedQuotationTermIds: setSelectedTermIds,
    quotationTermDetails: termDetails,
    setQuotationTermDetails: setTermDetails,
    pendingQuotations,
    addPendingQuotation,
    removePendingQuotation,
    clearPendingQuotations,
  } = useCache();

  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 2, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 3, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 4, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 5, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
  ]);

  // Shared Quotation State
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

  const [validationErrors, setValidationErrors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('1');
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [editingRecNo, setEditingRecNo] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency.no);
  const [selectedCurrencyRate, setSelectedCurrencyRate] = useState(1);
  const prevRateRef = React.useRef(selectedCurrencyRate);
  const [isSaving, setIsSaving] = useState(false);
  const [allTerms, setAllTerms] = useState([]);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const handleTermDetailChange = (id, value) => {
    setTermDetails(prev => ({ ...prev, [id]: value }));
  };

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleHoldAndNew = () => {
    const hasItems = rows.some(r => r.itemCode.trim() !== '');
    if (hasItems) {
      const currentQuotation = {
        id: Date.now(),
        rows: [...rows],
        customer: { ...customer },
        vatNumber,
        address: { ...address },
        totals: { ...totals },
        selectedWarehouse,
        selectedCurrency,
        referenceNo,
        selectedTermIds: [...selectedTermIds],
        termDetails: { ...termDetails }
      };
      addPendingQuotation(currentQuotation);
    }
    resetPage();
  };

  const handleRestoreQuotation = (quote) => {
    setRows(quote.rows);
    setCustomer(quote.customer);
    setVatNumber(quote.vatNumber || '');
    setAddress(quote.address || { street: '', city: '', district: '', building: '', pincode: '' });
    setTotals(quote.totals || { gross: 0, discount: 0, vat: 0, net: 0 });
    setSelectedWarehouse(quote.selectedWarehouse || '1');
    setSelectedCurrency(quote.selectedCurrency || 1);
    setReferenceNo(quote.referenceNo || '');
    setSelectedTermIds(quote.selectedTermIds || []);
    setTermDetails(quote.termDetails || {});
    setIsPendingModalOpen(false);
  };

  const fetchInvoiceNo = () => {
    if (editingRecNo) return; 
    fetch(API_ENDPOINTS.INVOICE_NEXT)
      .then(res => res.json())
      .then(data => setInvoiceNo(data.nextInvoice))
      .catch(err => console.error("Failed to fetch next quotation invoice:", err));
  };

  useEffect(() => {
    fetchInvoiceNo();
  }, []);

  // Handle real-time currency conversion when rate changes
  useEffect(() => {
    if (prevRateRef.current !== selectedCurrencyRate) {
      const oldRate = prevRateRef.current;
      const newRate = selectedCurrencyRate;

      // Convert rows
      setRows(prevRows => prevRows.map(row => ({
        ...row,
        price: row.price ? (row.price * oldRate) / newRate : '',
        purchasePrice: row.purchasePrice ? (row.purchasePrice * oldRate) / newRate : '',
        salePrice: row.salePrice ? (row.salePrice * oldRate) / newRate : '',
        retailPrice: row.retailPrice ? (row.retailPrice * oldRate) / newRate : '',
      })));

      prevRateRef.current = newRate;
    }
  }, [selectedCurrencyRate]);

  const resetPage = () => {
    setEditingRecNo(null);
    fetchInvoiceNo();
    // Complete Reset
    setVatNumber('');
    setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
    setValidationErrors([]);
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setReferenceNo('');
    setSelectedTermIds([]);
    setTermDetails({});
    setRows([
      { id: Date.now(), itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 1, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 2, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 3, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 4, itemCode: '', description: '', unit: '', unitId: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    ]);
  };

  const handleSave = async () => {
    if (invoiceNo === 'Loading...') {
      alert('Quotation number is still loading. Please wait.');
      return;
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
        alert(`VAT Quotation requires a complete address.`);
        return;
      }
    }
    setValidationErrors([]);

    // MANDATORY VALIDATION: All checked quotation terms and conditions must be filled!
    if (selectedTermIds.length > 0) {
      const emptyTerms = [];
      for (const id of selectedTermIds) {
        const val = termDetails[id]?.trim() || '';
        if (val === '') {
          const master = allTerms.find(t => t.ID === id);
          const label = master ? master.DESC_NAME.replace(/_/g, ' ') : `Term #${id}`;
          emptyTerms.push(label);
        }
      }
      if (emptyTerms.length > 0) {
        alert(language === 'ar' 
          ? `يرجى تعبئة جميع تفاصيل الشروط المختارة: ${emptyTerms.join(', ')}`
          : `Please fill in all selected terms and conditions: ${emptyTerms.join(', ')}`
        );
        return;
      }
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      const payload = {
        INVOICE_NO: String(invoiceNo),
        ACCODE: String(customer.id || ''),
        ENAME: String(customer.name || ''),
        G_TOTAL: totals.gross * selectedCurrencyRate,
        DISC_AMT: totals.discount * selectedCurrencyRate,
        NET_AMOUNT: totals.net * selectedCurrencyRate,
        VAT_AMOUNT: totals.vat * selectedCurrencyRate,
        CASH_PAID: 0,
        OTHER_PAID: 0,
        VAT_NUMBER: String(vatNumber || ''),
        PAYMENT_METHOD: 'Others', // generic payment type
        TAX_INCLUDED: taxIncluded,
        USERNAME: user?.username || '',
        WR_CODE: selectedWarehouse,
        REC_NO: editingRecNo,
        CURRENCY: selectedCurrency,
        CRATE: selectedCurrencyRate,
        CURRENCY_RATE: selectedCurrencyRate,
        TRN_TYPE: 19, // Quotation transaction type
        ADDRESS: address,
        REF_INV_NO: referenceNo,
        QUOT_TERMS: selectedTermIds.map(id => ({
          QUOT_TERM_ID: id,
          QUOT_DESCRIPTION: termDetails[id] || ''
        })).filter(t => t.QUOT_DESCRIPTION.trim() !== ''),
        ROWS: rows.filter(r => r.itemCode.trim() !== '').map(r => {
          const rowQty = Number(r.qty || 0);
          const rowPrice = Number(r.price || 0);
          const vatRate = (Number(r.vatPercent || 0) / 100);
          const lineTotalUI = taxIncluded ? (rowQty * rowPrice) : (rowQty * rowPrice * (1 + vatRate));
          const lineVatUI = taxIncluded ? (rowQty * (rowPrice - (rowPrice / (1 + vatRate)))) : (rowQty * rowPrice * vatRate);
          const lineTaxableUI = lineTotalUI - lineVatUI;
          
          return {
            ...r,
            price: rowPrice * selectedCurrencyRate,
            vatAmt: lineVatUI * selectedCurrencyRate,
            total: lineTotalUI * selectedCurrencyRate,
            FRN_AMOUNT: lineTotalUI,
            TAXABLE_AMOUNT: lineTaxableUI * selectedCurrencyRate
          };
        })
      };

      console.log('💎 QUOTATION_PAGE: Sending payload:', payload);
      const res = await fetch(API_ENDPOINTS.SALES_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        refreshCache();

        if (showInvoiceAfterSave) {
          // Prepare invoice data for modal
          const invoiceData = {
            REC_NO: result.REC_NO,
            INVOICE_NO: result.INVOICE_NO,
            CURDATE: new Date().toISOString(),
            ENAME: customer.name || 'Cash Customer',
            ACCODE: customer.id,
            G_TOTAL: totals.gross * selectedCurrencyRate,
            DISC_AMT: totals.discount * selectedCurrencyRate,
            NET_AMOUNT: totals.net * selectedCurrencyRate,
            VAT_AMOUNT: totals.vat * selectedCurrencyRate,
            VAT_NUMBER: vatNumber,
            TRN_TYPE: 19,
            REF_NO: referenceNo,
            CRATE: selectedCurrencyRate,
            CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
          };
          setSavedInvoice(invoiceData);
        } else {
          alert('Quotation saved successfully!');
          resetPage();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.details || 'Save failed'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Error saving quotation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseInvoice = () => {
    setSavedInvoice(null);
    resetPage();
  };

  useEffect(() => {
    if (!params?.editQuotation) {
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

    fetch(API_ENDPOINTS.QUOTATION_TERMS)
      .then(res => res.json())
      .then(data => setAllTerms(data))
      .catch(err => console.error("Failed to fetch quotation terms:", err));
  }, []);

  useEffect(() => {
    const curr = currencies.find(c => c.Currency_No === selectedCurrency);
    if (curr) {
      setSelectedCurrencyRate(curr.Currency_Rate || 1);
    }
  }, [selectedCurrency, currencies]);

  // Handle Edit Mode from Params (if navigating back to edit)
  useEffect(() => {
    if (params && params.editQuotation) {
      const sale = params.editQuotation;
      setEditingRecNo(sale.REC_NO);
      setInvoiceNo(sale.INVOICE_NO);
      setCustomer({ id: String(sale.ACCODE || ''), name: sale.ENAME || '' });
      setVatNumber(sale.VAT_NUMBER || '');
      setReferenceNo(sale.REF_NO || '');
      setSelectedCurrencyRate(sale.CRATE || 1);
      
      // Fetch Sale Items (reusing sales endpoints)
      fetch(API_ENDPOINTS.SALE_ITEMS(sale.REC_NO))
        .then(res => res.json())
        .then(items => {
          const mappedRows = items.map((item, idx) => ({
            id: idx + 1,
            itemCode: item.BARCODE,
            description: item.DESCRIPTION,
            unit: item.UNIT,
            qty: item.QTY,
            price: item.UNIT_PRICE / (sale.CRATE || 1),
            vatPercent: item.VAT_PERCENT,
            vatAmt: item.VAT_AMOUNT / (sale.CRATE || 1),
            total: item.ITM_TOTAL / (sale.CRATE || 1),
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
        .catch(err => console.error("Failed to fetch edit quotation items:", err));
        
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

      // Fetch Saved Terms Details
      fetch(API_ENDPOINTS.QUOTATION_SAVED_TERMS(sale.INVOICE_NO))
        .then(res => res.json())
        .then(savedTerms => {
          if (Array.isArray(savedTerms)) {
            const activeIds = savedTerms.map(t => t.QUOT_TERM_ID);
            const details = {};
            savedTerms.forEach(t => {
              details[t.QUOT_TERM_ID] = t.QUOT_DESCRIPTION;
            });
            setSelectedTermIds(activeIds);
            setTermDetails(details);
          }
        })
        .catch(err => console.error("Failed to fetch saved terms:", err));
    }
  }, [params]);

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
              selectedCurrencyRate={selectedCurrencyRate}
              setSelectedCurrencyRate={setSelectedCurrencyRate}
              onNew={handleHoldAndNew}
              onPending={() => setIsPendingModalOpen(true)}
              onHistory={() => navigateTo?.('active-quotations')}
              onClear={resetPage}
              pendingCount={pendingQuotations.length}
              isQuotation={true}
              allTerms={allTerms}
              selectedTermIds={selectedTermIds}
              setSelectedTermIds={setSelectedTermIds}
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
            <h2 className="text-2xl font-black text-indigo-600 uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0">
              {language === 'ar' ? 'عرض سعر' : 'QUOTATION ENTRY'}
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
              hideInvoiceNo={true}
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
            />
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <SalesGrid initialData={[]} rows={rows} setRows={setRows} visibleColumns={visibleColumns} enterToQty={enterToQty} taxIncluded={taxIncluded} selectedCurrencyRate={selectedCurrencyRate} />

            {selectedTermIds.length > 0 && (
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm transition-all duration-300 mt-2">
                <h3 className="block text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2 px-1">
                  {language === 'ar' ? 'تفاصيل الشروط والأحكام' : 'Quotation Terms & Conditions Details'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {allTerms.filter(t => selectedTermIds.includes(t.ID)).map(term => (
                    <div key={term.ID} className="flex flex-col">
                      <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 px-1">
                        {term.DESC_NAME.replace(/_/g, ' ')}
                      </label>
                      <input
                        type="text"
                        value={termDetails[term.ID] || ''}
                        onChange={(e) => handleTermDetailChange(term.ID, e.target.value)}
                        placeholder={language === 'ar' ? `أدخل تفاصيل ${term.DESC_NAME.replace(/_/g, ' ')}...` : `Enter ${term.DESC_NAME.toLowerCase().replace(/_/g, ' ')}...`}
                        className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all hover:border-zinc-300 dark:hover:border-zinc-600 font-medium dark:text-zinc-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <QuotationSummaryFooter
            rows={rows}
            taxIncluded={taxIncluded}
            onTotalsChange={setTotals}
            onSave={handleSave}
            currencyCode={currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'}
            isSaving={isSaving}
            selectedCurrencyRate={selectedCurrencyRate}
          />
        </div>
      </div>

      {/* Final Quotation Modal */}
      <InvoiceModal 
        sale={savedInvoice} 
        onClose={handleCloseInvoice}
        address={address}
        historyInvoiceColumns={historyInvoiceColumns}
        onCompleteSales={(quote) => navigateTo('sales', { loadQuotation: quote })}
      />

      {/* Pending Quotations Dialog Overlay */}
      <PendingQuotationsModal 
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        pendingQuotations={pendingQuotations}
        onSelect={handleRestoreQuotation}
        onRemove={removePendingQuotation}
        onClearAll={clearPendingQuotations}
        language={language}
      />
    </div>
  );
}
