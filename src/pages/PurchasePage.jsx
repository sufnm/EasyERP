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

export default function PurchasePage({ user, params = {}, navigateTo, onBack }) {
  const { t, language } = useLanguage();
  const {
    refreshCache,
    taxIncluded, setTaxIncluded,
    enterToQty, setEnterToQty,
    visibleColumns, setVisibleColumns,
    defaultCurrency,
    cachedAccounts
  } = useCache();

  const purchaseVisibleColumns = {
    rowNum: true,
    itemCode: true,
    description: true,
    unit: true,
    qty: true,
    purchasePrice: true,
    salePrice: true,
    retailPrice: true,
    total: true
  };

  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
    { id: 2, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
    { id: 3, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
    { id: 4, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
    { id: 5, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
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
  const [editingRecNo, setEditingRecNo] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('120101');

  useEffect(() => {
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
    fetchNextInvoice();
  }, []);

  useEffect(() => {
    const g = rows.reduce((acc, row) => acc + (Number(row.qty || 0) * Number(row.purchasePrice || 0)), 0);
    const v = rows.reduce((acc, row) => {
      const rowTotal = Number(row.qty || 0) * Number(row.purchasePrice || 0);
      const rowVat = taxIncluded 
        ? (rowTotal - (rowTotal / (1 + (Number(row.vatPercent || 0) / 100))))
        : (rowTotal * (Number(row.vatPercent || 0) / 100));
      return acc + rowVat;
    }, 0);
    
    setTotals({
      gross: g,
      discount: 0,
      vat: v,
      net: taxIncluded ? g : (g + v)
    });
  }, [rows, taxIncluded]);

  const handleSave = async () => {
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
        alert(`Purchase saved successfully! Invoice: ${result.INVOICE_NO}`);
        resetPage();
      } else {
        alert('Failed to save purchase');
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Error saving purchase');
    }
  };

  const resetPage = () => {
    setRows([
      { id: 1, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
      { id: 2, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
      { id: 3, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
      { id: 4, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
      { id: 5, itemCode: '', description: '', unit: '', qty: '', purchasePrice: '', salePrice: '', retailPrice: '', total: '', vatPercent: 0 },
    ]);
    setSupplier({ id: '', name: 'CASH PURCHASE' });
    setVatNumber('');
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setReferenceNo('');
    setCashPaid(0);
    setOtherPaid(0);
    setEditingRecNo(null);
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 h-full relative">
        <div className="flex items-center justify-between mb-6 px-2 shrink-0 gap-4">
          <div className="flex-1">
            <Toolbar 
              visibleColumns={visibleColumns} 
              setVisibleColumns={setVisibleColumns} 
              taxIncluded={taxIncluded} 
              setTaxIncluded={setTaxIncluded} 
              enterToQty={enterToQty} 
              setEnterToQty={setEnterToQty}
              onSave={handleSave} 
              onNew={resetPage}
              onHistory={() => navigateTo('purchase-history')}
              onReturn={() => navigateTo('purchase-return')}
              onClear={resetPage}
              user={user}
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
                warehouse={selectedWarehouse}
                setWarehouse={setSelectedWarehouse}
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
              />
            </div>
          </div>

          <div className="mt-6">
            <SalesGrid 
              rows={rows}
              setRows={setRows}
              visibleColumns={purchaseVisibleColumns}
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
          />
        </div>

      {savedInvoice && (
        <InvoiceModal 
          isOpen={!!savedInvoice}
          onClose={() => setSavedInvoice(null)}
          invoice={savedInvoice}
        />
      )}
    </div>
  );
}
