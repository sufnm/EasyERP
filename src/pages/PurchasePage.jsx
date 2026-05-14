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
import PendingPurchasesModal from '../components/PendingPurchasesModal';

export default function PurchasePage({ user, params = {}, navigateTo, onBack }) {
  const { t, language } = useLanguage();
  const {
    refreshCache,
    taxIncluded, setTaxIncluded,
    defaultCurrency,
    cachedAccounts,
    currencies,
    pendingPurchases, addPendingPurchase, removePendingPurchase, clearPendingPurchases
  } = useCache();

  // Database-synced User Entry Options States
  const [autoPrint, setAutoPrint] = useState(false);
  const [defaultPrintPaper, setDefaultPrintPaper] = useState('Thermal');
  const [showInvoiceAfterSave, setShowInvoiceAfterSave] = useState(true);
  const [enterToQty, setEnterToQty] = useState(false);
  const [crystalPrint, setCrystalPrint] = useState(false);

  const [pVisibleColumns, setPVisibleColumns] = useState({
    rowNum: true,
    itemCode: true,
    description: true,
    unit: true,
    qty: true,
    purchasePrice: true,
    salePrice: true,
    retailPrice: true,
    vatAmt: true,
    total: true
  });

  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 2, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 3, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 4, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    { id: 5, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
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
  const [isZatcaEnabled, setIsZatcaEnabled] = useState(false);
  const [isPrintEnabled, setIsPrintEnabled] = useState(false);
  const loadUserOptions = async () => {
    if (!user?.userid) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.USER_ENTRY_OPTIONS}?userId=${user.userid}&trnType=1`);
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
            const keys = ['rowNum', 'itemCode', 'description', 'unit', 'qty', 'purchasePrice', 'salePrice', 'retailPrice', 'vatAmt', 'total'];
            const newCols = {};
            keys.forEach((k, idx) => {
              newCols[k] = opts.grid_coolums[idx] === '1';
            });
            setPVisibleColumns(newCols);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user entry options:", err);
    }
  };

  const saveUserOptions = async () => {
    if (!user?.userid) return;
    
    const keys = ['rowNum', 'itemCode', 'description', 'unit', 'qty', 'purchasePrice', 'salePrice', 'retailPrice', 'vatAmt', 'total'];
    const gridStr = keys.map(k => (pVisibleColumns[k] ? '1' : '0')).join('').padEnd(10, '1');

    try {
      await fetch(API_ENDPOINTS.USER_ENTRY_OPTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userid,
          trnType: 1,
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

  useEffect(() => {
    if (user?.userid) {
      saveUserOptions();
    }
  }, [autoPrint, defaultPrintPaper, showInvoiceAfterSave, enterToQty, pVisibleColumns, crystalPrint]);

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
  }, [supplier, rows, totals, referenceNo, vatNumber]);


  const handleSave = async () => {
    if (!supplier.id) {
      alert('Please select a supplier before saving.');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    if (rows.filter(r => r.itemCode.trim() !== '').length === 0) {
      alert('Please add at least one item before saving.');
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
      ADDRESS: address
    };

    try {
      const res = await fetch(API_ENDPOINTS.PURCHASE_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        setIsZatcaEnabled(true);
        setIsPrintEnabled(true);
        setInvoiceNo(result.INVOICE_NO);
        setEditingRecNo(result.REC_NO);
        
        // Prepare invoice data for modal
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
          TRN_TYPE: paymentMethod === 'Cash' ? 1 : 2,
          REF_NO: referenceNo,
          CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR',
          CASH_PAID: cashPaid,
          OTHER_PAID: otherPaid
        };
        
        if (autoPrint || showInvoiceAfterSave) {
          setSavedInvoice(invoiceData);
        } else {
          alert(`Purchase saved successfully! Invoice: ${result.INVOICE_NO}`);
        }
      } else {
        alert('Failed to save purchase');
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Error saving purchase');
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
      ENAME: supplier.name,
      ACCODE: supplier.id,
      G_TOTAL: totals.gross,
      DISC_AMT: totals.discount,
      NET_AMOUNT: totals.net,
      VAT_AMOUNT: totals.vat,
      VAT_NUMBER: vatNumber,
      TRN_TYPE: paymentMethod === 'Cash' ? 1 : 2,
      REF_NO: referenceNo,
      CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
    };
    setSavedInvoice(invoiceData);
  };

  const handleCloseInvoice = () => {
    setSavedInvoice(null);
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
      otherPaid
    };
    
    addPendingPurchase(draft);
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
    
    removePendingPurchase(draft.id);
    setShowPendingModal(false);
  };

  const resetPage = () => {
    setRows([
      { id: 1, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 2, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 3, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 4, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
      { id: 5, itemCode: '', description: '', unit: '', unitId: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 15, vatAmt: '' },
    ]);
    setSupplier({ id: '', name: 'SELECT A SUPPLIER' });
    setVatNumber('');
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setReferenceNo('');
    setCashPaid(0);
    setOtherPaid(0);
    setEditingRecNo(null);
    setIsZatcaEnabled(false);
    setIsPrintEnabled(false);
    fetchNextInvoice();
  };

  useEffect(() => {
    if (editingRecNo) {
      setIsZatcaEnabled(true);
      setIsPrintEnabled(true);
    }
  }, [editingRecNo]);

  const handleZatcaSubmit = async () => {
    try {
      const trnType = paymentMethod === 'Cash' ? 1 : 2;
      alert(`ZATCA: Submitting Purchase Invoice #${invoiceNo} (Type: ${trnType === 1 ? 'Cash Purchase' : 'Credit Purchase'}) to ZATCA server...`);
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
        alert(`✅ ZATCA SUCCESS: Purchase Invoice #${invoiceNo} processed and submitted successfully!\n${data.message || ''}`);
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
      <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 h-full relative">
        <div className="flex items-center justify-between mb-6 px-2 shrink-0 gap-4">
          <div className="flex-1">
            <Toolbar 
              visibleColumns={pVisibleColumns} 
              setVisibleColumns={setPVisibleColumns} 
              taxIncluded={taxIncluded} 
              setTaxIncluded={setTaxIncluded} 
              enterToQty={enterToQty} 
              setEnterToQty={setEnterToQty}
              showInvoiceAfterSave={showInvoiceAfterSave}
              setShowInvoiceAfterSave={setShowInvoiceAfterSave}
              onSave={handleSave} 
              onNew={resetPage}
              onPending={() => setShowPendingModal(true)}
              pendingCount={pendingPurchases.length}
              onHistory={() => navigateTo('purchase-history')}
              onReturn={() => navigateTo('purchase-return')}
              onClear={resetPage}
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
              user={user}
              isSaving={isSaving}
              isPurchase={true}
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
            <h2 className="text-2xl font-black text-indigo-600 uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0">
              PURCHASE
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
                hideInvoiceNo={true}
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
                setSelectedCurrency={setSelectedCurrency}
              />
            </div>
          </div>

          <div className="mt-6">
            <SalesGrid 
              rows={rows}
              setRows={setRows}
              visibleColumns={pVisibleColumns}
              taxIncluded={taxIncluded}
              enterToQty={enterToQty}
              isPurchase={true}
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
            isZatcaEnabled={isZatcaEnabled}
            onZatcaSubmit={handleZatcaSubmit}
            isPrintEnabled={isPrintEnabled}
            onPrint={handlePrint}
            autoPrint={autoPrint}
            setAutoPrint={setAutoPrint}
          />
        </div>

      {savedInvoice && (
        <InvoiceModal 
          isOpen={!!savedInvoice}
          onClose={handleCloseInvoice}
          sale={savedInvoice}
          isPurchase={true}
          autoPrint={autoPrint}
          crystalPrint={crystalPrint}
          defaultPrintPaper={defaultPrintPaper}
        />
      )}

      <PendingPurchasesModal 
        isOpen={showPendingModal}
        onClose={() => setShowPendingModal(false)}
        pendingPurchases={pendingPurchases}
        onSelect={handleRestore}
        onRemove={removePendingPurchase}
        onClearAll={clearPendingPurchases}
      />
    </div>
  );
}
