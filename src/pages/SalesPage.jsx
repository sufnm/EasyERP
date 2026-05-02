import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config';
import { useCache } from '../context/CacheContext';
import Toolbar from '../components/Toolbar';
import InvoiceHeader from '../components/InvoiceHeader';
import CustomerDetails from '../components/CustomerDetails';
import SalesGrid from '../components/SalesGrid';
import SummaryFooter from '../components/SummaryFooter';
import InvoiceModal from '../components/InvoiceModal';

export default function SalesPage({ user }) {
  const {
    refreshCache,
    cachedAccounts,
    taxIncluded, setTaxIncluded,
    enterToQty, setEnterToQty,
    visibleColumns, setVisibleColumns,
    historyInvoiceColumns,
    showInvoiceAfterSave, setShowInvoiceAfterSave
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

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const fetchInvoiceNo = () => {
    fetch(API_ENDPOINTS.INVOICE_NEXT)
      .then(res => res.json())
      .then(data => setInvoiceNo(data.nextInvoice))
      .catch(err => console.error("Failed to fetch next invoice:", err));
  };

  const resetPage = () => {
    fetchInvoiceNo();
    // Complete Reset
    setVatNumber('');
    setPaymentMethod('');
    setCashPaid(0);
    setOtherPaid(0);
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setRows([
      { id: Date.now(), itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 2, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 3, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
      { id: Date.now() + 4, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    ]);
  };

  const handleSave = async () => {
    if (invoiceNo === 'Loading...') {
      alert('Invoice number is still loading. Please wait.');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method before saving.');
      return;
    }

    if (!customer.id || customer.id === '6000') {
      if (!confirm('Save as Cash Sale?')) return;
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
      const payload = {
        INVOICE_NO: String(invoiceNo),
        ACCODE: String(customer.id || ''),
        ENAME: String(customer.name || ''),
        G_TOTAL: totals.gross,
        DISC_AMT: totals.discount,
        NET_AMOUNT: totals.net,
        VAT_AMOUNT: totals.vat,
        CASH_PAID: cashPaid,
        OTHER_PAID: otherPaid,
        VAT_NUMBER: String(vatNumber || ''),
        PAYMENT_METHOD: paymentMethod,
        TAX_INCLUDED: taxIncluded,
        USERNAME: user?.username || '',
        WR_CODE: selectedWarehouse,
        ROWS: rows.filter(r => r.itemCode.trim() !== '')
      };

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
            G_TOTAL: totals.gross,
            DISC_AMT: totals.discount,
            NET_AMOUNT: totals.net,
            VAT_AMOUNT: totals.vat,
            VAT_NUMBER: vatNumber,
            TRN_TYPE: paymentMethod === 'Cash' ? 6 : 7
          };
          setSavedInvoice(invoiceData);
        } else {
          alert('Sale saved successfully!');
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
    fetchInvoiceNo();

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
  }, []);

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
            />
          </div>

          <h2 className="text-2xl font-black text-rose-500 uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0">
            CREDIT SALES
          </h2>
        </div>

        <div className="flex flex-col flex-1 pb-6 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch shrink-0">
            <InvoiceHeader 
              invoiceNo={invoiceNo} 
              warehouses={warehouses}
              selectedWarehouse={selectedWarehouse}
              setSelectedWarehouse={setSelectedWarehouse}
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
    </div>
  );
}
