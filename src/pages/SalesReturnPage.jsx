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

export default function SalesReturnPage({ user, params = {}, onBack }) {
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
    pendingSales, addPendingSale, removePendingSale, clearPendingSales
  } = useCache();

  const [salesData, setSalesData] = useState([]);
  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 2, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 3, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 4, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 5, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
  ]);

  // Shared Sales State
  const [invoiceNo, setInvoiceNo] = useState('Loading...');
  const [customer, setCustomer] = useState({ id: '', name: 'Loading...' });
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState({
    street: '', city: '', district: '', building: '', pincode: ''
  });

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
  
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  // RETURN RESTRICTION STATE
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState(null);
  const [manualReferenceNo, setManualReferenceNo] = useState('');

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
        selectedInvoice,
        invoiceItems
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
    setSelectedInvoice(sale.selectedInvoice || null);
    setInvoiceItems(sale.invoiceItems || null);
    
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

  const handleInvoiceSelect = async (inv) => {
    if (!inv) {
      setSelectedInvoice(null);
      setInvoiceItems(null);
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.SALE_ITEMS(inv.REC_NO));
      if (res.ok) {
        const items = await res.json();
        setInvoiceItems(items);
        setSelectedInvoice(inv);
        
        // Populate Customer
        setCustomer({ id: String(inv.ACCODE), name: inv.ENAME });
        setVatNumber(inv.VAT_NUMBER === '0' ? '' : (inv.VAT_NUMBER || ''));
        
        // Reset rows to clear previous free-return data
        setRows([
          { id: Date.now(), itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: Date.now() + 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: Date.now() + 2, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: Date.now() + 3, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: Date.now() + 4, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
        ]);

        // Fetch Ad-hoc Address first
        try {
          const adhocRes = await fetch(API_ENDPOINTS.INVOICE_ADDRESS(inv.INVOICE_NO, inv.TRN_TYPE));
          if (adhocRes.ok) {
            const adhocData = await adhocRes.json();
            if (adhocData) {
              setAddress({
                building: adhocData.building || '',
                street: adhocData.street || '',
                district: adhocData.district || '',
                city: adhocData.city || '',
                pincode: adhocData.pincode || ''
              });
            } else if (inv.ACCODE && inv.ACCODE !== '6000') {
              // Fallback to Customer Master Address
              const addrRes = await fetch(API_ENDPOINTS.CUSTOMER_INFO(inv.ACCODE));
              if (addrRes.ok) {
                const data = await addrRes.json();
                if (data) {
                  setAddress({
                    building: data.building_no || '',
                    street: data.street_name || '',
                    district: data.district || '',
                    city: data.city_name || '',
                    pincode: data.postal_zone || ''
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch address details:", err);
        }
      }
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
      alert("Failed to load invoice items.");
    }
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
    setSelectedInvoice(null);
    setInvoiceItems(null);
    setManualReferenceNo('');
    fetchInvoiceNo();
    // Complete Reset
    setVatNumber('');
    setPaymentMethod('');
    setCashPaid(0);
    setOtherPaid(0);
    setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
    setValidationErrors([]);
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setRows([
      { id: Date.now(), itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 2, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 3, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 4, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    ]);
  };

  const handleSave = async (isQuickSave = false) => {
    console.log('🚀 SalesReturnPage: handleSave called. isQuickSave:', isQuickSave);
    setValidationErrors([]);
    if (invoiceNo === 'Loading...') {
      alert('Invoice number is still loading. Please wait.');
      return;
    }

    if (!isQuickSave && !paymentMethod) {
      alert('Please select a payment method before saving.');
      return;
    }

    if (!customer.id || customer.id === '6000') {
      if (!isQuickSave && !confirm('Save as Return Sale?')) return;
      // If quick save is attempted for 6000, it should have been blocked in UI, 
      // but let's double check here just in case.
      if (isQuickSave) {
        alert('Payment is mandatory for walkthrough customers.');
        return;
      }
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
        TRN_TYPE: finalPaymentMethod === 'Cash' ? 3 : 4,
        REF_INV_NO: selectedInvoice?.INVOICE_NO || manualReferenceNo || null,
        ADDRESS: address,
        ROWS: rows.filter(r => r.itemCode.trim() !== '')
      };

      console.log('🔄 SALES_RETURN_PAGE: Sending payload:', payload);
      const res = await fetch(API_ENDPOINTS.SALES_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        
        refreshCache();

        if (showInvoiceAfterSave && !isQuickSave) {
          // Prepare invoice data for modal
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
            TRN_TYPE: finalPaymentMethod === 'Cash' ? 3 : 4,
            REF_NO: selectedInvoice?.INVOICE_NO || manualReferenceNo || null
          };
          setSavedInvoice({
              ...invoiceData,
              CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
            });
        } else {
          alert('Return sale saved successfully!');
          resetPage();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.details || 'Save failed'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Connection error');
    }
  };

  const handleCloseInvoice = () => {
    setSavedInvoice(null);
    resetPage();
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
      setInvoiceNo(sale.INVOICE_NO);
      setCustomer({ id: String(sale.ACCODE || ''), name: sale.ENAME || '' });
      setVatNumber(sale.VAT_NUMBER || '');
      setPaymentMethod(sale.TRN_TYPE === 3 ? 'Cash' : 'Others');
      
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
              aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' 
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

  useEffect(() => {
    if (cachedAccounts.length > 0) {
      setAccounts(cachedAccounts);
      if (!selectedAccount) setSelectedAccount(String(cachedAccounts[0].ACC_NO));
    }
  }, [cachedAccounts, selectedAccount]);

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
              onClear={resetPage}
              pendingCount={pendingSales.length}
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
            <h2 className={`text-2xl font-black ${editingRecNo ? 'text-indigo-600' : 'text-blue-600'} uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0`}>
              {editingRecNo ? (language === 'ar' ? 'مرتجع تعديل' : 'EDIT RETURN') : (language === 'ar' ? 'مرتجع مبيعات' : 'RETURN SALES')}
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
              isReturn={true}
              onInvoiceSelect={handleInvoiceSelect}
              selectedInvoice={selectedInvoice}
              onReferenceChange={setManualReferenceNo}
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

          <SalesGrid 
            initialData={[]} 
            rows={rows} 
            setRows={setRows} 
            visibleColumns={visibleColumns} 
            enterToQty={enterToQty} 
            taxIncluded={taxIncluded} 
            restrictedItems={invoiceItems}
          />

          <SummaryFooter
            isReturn={true}
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
            currencyCode={currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'}
          />
        </div>
      </div>

      {/* Final Invoice Modal */}
      <InvoiceModal 
        sale={savedInvoice} 
        onClose={handleCloseInvoice}
        address={address}
        historyInvoiceColumns={historyInvoiceColumns}
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
