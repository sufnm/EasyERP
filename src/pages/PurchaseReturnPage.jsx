import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { API_ENDPOINTS } from '../config';
import { useCache } from '../context/CacheContext';
import Toolbar from '../components/Toolbar';
import InvoiceHeader from '../components/InvoiceHeader';
import SupplierDetails from '../components/SupplierDetails';
import SalesGrid from '../components/SalesGrid';
import SummaryFooter from '../components/SummaryFooter';
import InvoiceModal from '../components/InvoiceModal';
import { useLanguage } from '../context/LanguageContext';
import PendingReturnsModal from '../components/PendingReturnsModal';

export default function PurchaseReturnPage({ user, params = {}, navigateTo, onBack }) {
  const { t, language } = useLanguage();
  const {
    refreshCache,
    taxIncluded, setTaxIncluded,
    enterToQty, setEnterToQty,
    visibleColumns, setVisibleColumns,
    defaultCurrency,
    cachedAccounts,
    currencies,
    showInvoiceAfterSave, setShowInvoiceAfterSave,
    pendingReturns, addPendingReturn, removePendingReturn, clearPendingReturns
  } = useCache();

  const [pVisibleColumns, setPVisibleColumns] = useState({
    rowNum: true,
    itemCode: true,
    description: true,
    unit: true,
    qty: true,
    purchasePrice: true,
    salePrice: false,
    retailPrice: false,
    vatAmt: true,
    total: true
  });

  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 2, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 3, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 4, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 5, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
  ]);

  const [invoiceNo, setInvoiceNo] = useState('Loading...');
  const [supplier, setSupplier] = useState({ id: '', name: 'SELECT A SUPPLIER' });
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState({
    street: '', city: '', district: '', building: '', pincode: ''
  });
  const [referenceNo, setReferenceNo] = useState('');
  const [totals, setTotals] = useState({ gross: 0, discount: 0, net: 0, vat: 0 });
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashPaid, setCashPaid] = useState(0);
  const [otherPaid, setOtherPaid] = useState(0);
  const [selectedWarehouse, setSelectedWarehouse] = useState('1');
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency.no);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [editingRecNo, setEditingRecNo] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('120101');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseItems, setPurchaseItems] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const fetchNextInvoice = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.PURCHASE_NEXT_INVOICE);
      if (res.ok) {
        const data = await res.json();
        setInvoiceNo(data.nextInvoice);
      }
    } catch (err) {
      console.error("Failed to fetch next invoice:", err);
    }
  };

  useEffect(() => {
    fetchNextInvoice();
    
    // Fetch warehouses
    fetch(API_ENDPOINTS.WAREHOUSE_LIST)
      .then(res => res.json())
      .then(data => setWarehouses(data))
      .catch(err => console.error("Failed to fetch warehouses:", err));

    // Shortcut listener
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleHold();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [supplier, rows, totals, referenceNo, vatNumber, selectedPurchase, purchaseItems]);

  const handlePurchaseSelect = async (purchase) => {
    setSelectedPurchase(purchase);
    if (!purchase) {
      resetPage();
      return;
    }

    setSupplier({ id: purchase.ACCODE, name: purchase.ENAME });
    setVatNumber(purchase.VAT_NUMBER || '');
    setReferenceNo(purchase.INVOICE_NO.toString());
    
    // Fetch items for this purchase
    try {
      const res = await fetch(API_ENDPOINTS.PURCHASE_ITEMS(purchase.REC_NO));
      if (res.ok) {
        const items = await res.json();
        setPurchaseItems(items);
        // Reset rows to empty so user can search or "Add All"
        setRows([
          { id: 1, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
          { id: 2, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
          { id: 3, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
          { id: 4, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
          { id: 5, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch purchase items:", err);
    }
  };

  const handleSave = async () => {
    if (!supplier.id) {
      alert('Please select a supplier or original invoice before saving.');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    if (rows.filter(r => r.itemCode.trim() !== '').length === 0) {
      alert('Please add at least one item before saving.');
      setIsSaving(false);
      return;
    }

    const payload = {
      REC_NO: editingRecNo,
      ACCODE: supplier.id,
      ENAME: supplier.name,
      G_TOTAL: totals.gross,
      DISC_AMT: totals.discount,
      NET_AMOUNT: totals.net,
      VAT_AMOUNT: totals.vat,
      VAT_NUMBER: vatNumber,
      ROWS: rows.filter(r => r.itemCode.trim() !== ''),
      PAYMENT_METHOD: paymentMethod,
      TAX_INCLUDED: taxIncluded,
      CASH_PAID: cashPaid,
      OTHER_PAID: otherPaid,
      USERNAME: user.username,
      WR_CODE: selectedWarehouse,
      CURRENCY: selectedCurrency,
      REF_INV_NO: referenceNo,
      ADDRESS: address,
      // TRN_TYPE: Cash Return = 8, Credit Return = 9
      TRN_TYPE: paymentMethod === 'Cash' ? 8 : 9
    };

    try {
      const res = await fetch(API_ENDPOINTS.PURCHASE_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        
        const invoiceData = {
          REC_NO: result.REC_NO,
          INVOICE_NO: result.INVOICE_NO,
          CURDATE: new Date().toISOString(),
          ENAME: supplier.name,
          ACCODE: supplier.id,
          G_TOTAL: totals.gross,
          DISC_AMT: totals.discount,
          NET_AMOUNT: totals.net,
          VAT_AMOUNT: totals.vat,
          VAT_NUMBER: vatNumber,
          TRN_TYPE: payload.TRN_TYPE,
          REF_NO: referenceNo,
          CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
        };
        
        if (showInvoiceAfterSave) {
          setSavedInvoice(invoiceData);
        } else {
          alert(`Purchase Return saved successfully! Invoice: ${result.INVOICE_NO}`);
        }
        resetPage();
      } else {
        alert('Failed to save purchase return');
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Error saving purchase return');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHold = () => {
    const activeRows = rows.filter(r => r.itemCode.trim() !== '');
    if (activeRows.length === 0 && !supplier.id) return;
    
    const draft = {
      id: Date.now(),
      supplier,
      vatNumber,
      address,
      referenceNo,
      rows: rows,
      totals,
      selectedWarehouse,
      selectedCurrency,
      paymentMethod,
      cashPaid,
      otherPaid,
      selectedPurchase,
      purchaseItems
    };
    
    addPendingReturn(draft);
    resetPage();
  };

  const handleRestore = (draft) => {
    setSupplier(draft.supplier);
    setVatNumber(draft.vatNumber);
    setAddress(draft.address);
    setReferenceNo(draft.referenceNo);
    setRows(draft.rows);
    setTotals(draft.totals);
    setSelectedWarehouse(draft.selectedWarehouse);
    setSelectedCurrency(draft.selectedCurrency);
    setPaymentMethod(draft.paymentMethod);
    setCashPaid(draft.cashPaid);
    setOtherPaid(draft.otherPaid);
    setSelectedPurchase(draft.selectedPurchase);
    setPurchaseItems(draft.purchaseItems);
    
    removePendingReturn(draft.id);
    setShowPendingModal(false);
  };

  const resetPage = () => {
    setRows([
      { id: 1, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 2, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 3, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 4, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 5, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    ]);
    setSupplier({ id: '', name: 'SELECT A SUPPLIER' });
    setVatNumber('');
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setReferenceNo('');
    setCashPaid(0);
    setOtherPaid(0);
    setEditingRecNo(null);
    setSelectedPurchase(null);
    setPurchaseItems(null);
    fetchNextInvoice();
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 h-full relative">
        <div className="flex items-center justify-between mb-6 px-2 shrink-0 gap-4">
          <div className="flex-1">
            <Toolbar 
              visibleColumns={pVisibleColumns} 
              setVisibleColumns={setPVisibleColumns} 
              taxIncluded={taxIncluded} 
              setTaxIncluded={setTaxIncluded} 
              showInvoiceAfterSave={showInvoiceAfterSave}
              setShowInvoiceAfterSave={setShowInvoiceAfterSave}
              onSave={handleSave} 
              onNew={resetPage}
              onPending={() => setShowPendingModal(true)}
              pendingCount={pendingReturns.length}
              onHistory={() => navigateTo('purchase-history')}
              onClear={resetPage}
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              user={user}
              isSaving={isSaving}
              onReturn={() => navigateTo('purchase')}
              isPurchase={true}
              isReturn={true}
            />
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-rose-600 uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0">
              PURCHASE RETURN
            </h2>
          </div>
        </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <InvoiceHeader 
                invoiceNo={invoiceNo}
                referenceNo={referenceNo}
                onReferenceChange={setReferenceNo}
                selectedWarehouse={selectedWarehouse}
                setSelectedWarehouse={setSelectedWarehouse}
                warehouses={warehouses}
                isReturn={true}
                isPurchase={true}
                onInvoiceSelect={handlePurchaseSelect}
                selectedInvoice={selectedPurchase}
              />
            </div>
            <div className="flex-[1.5] min-w-0">
              <SupplierDetails 
                supplier={supplier}
                setSupplier={setSupplier}
                vatNumber={vatNumber}
                setVatNumber={setVatNumber}
                address={address}
                setAddress={setAddress}
                handleAddressChange={(f, v) => setAddress(prev => ({ ...prev, [f]: v }))}
              />
            </div>
          </div>

          <div className="mt-6">
            <SalesGrid 
              rows={rows}
              setRows={setRows}
              visibleColumns={pVisibleColumns}
              taxIncluded={taxIncluded}
              isPurchase={true}
              restrictedItems={purchaseItems}
            />
          </div>

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
            accounts={cachedAccounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            customerId={supplier.id}
            currencyCode="SAR"
            isPurchase={true}
            isSaving={isSaving}
          />
        </div>

      {savedInvoice && (
        <InvoiceModal 
          isOpen={!!savedInvoice}
          onClose={() => {
            setSavedInvoice(null);
            resetPage();
          }}
          sale={savedInvoice}
          isPurchase={true}
        />
      )}

      <PendingReturnsModal 
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingReturns={pendingReturns}
        onSelect={handleRestore}
        onRemove={removePendingReturn}
        onClearAll={clearPendingReturns}
      />
    </div>
  );
}
