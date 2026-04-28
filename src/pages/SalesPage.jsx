import React, { useState, useEffect } from 'react';
import Toolbar from '../components/Toolbar';
import InvoiceHeader from '../components/InvoiceHeader';
import CustomerDetails from '../components/CustomerDetails';
import SalesGrid from '../components/SalesGrid';
import SummaryFooter from '../components/SummaryFooter';

export default function SalesPage() {
  const [salesData, setSalesData] = useState([]);
  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 2, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 3, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 4, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
    { id: 5, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
  ]);

  const [visibleColumns, setVisibleColumns] = useState({
    itemCode: true, description: true, unit: true, qty: true, 
    price: true, aliasCode: true, vatAmt: true, total: true, stock: true
  });
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [enterToQty, setEnterToQty] = useState(false);

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

  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');

  const handleAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const fetchInvoiceNo = () => {
    fetch('http://localhost:3000/api/invoice/next')
      .then(res => res.json())
      .then(data => setInvoiceNo(data.nextInvoice))
      .catch(err => console.error("Failed to fetch next invoice:", err));
  };

  const handleSave = async () => {
    if (invoiceNo === 'Loading...') {
      alert('Invoice number is still loading. Please wait.');
      return;
    }

    if (!customer.id || customer.id === '6000') {
      if (!confirm('Save as Cash Sale?')) return;
    }

    try {
      const payload = {
        INVOICE_NO: String(invoiceNo),
        ACCODE: String(customer.id || ''),
        ENAME: String(customer.name || ''),
        G_TOTAL: totals.gross,
        DISC_AMT: totals.discount,
        NET_AMOUNT: totals.net,
        VAT_AMOUNT: totals.vat,
        VAT_NUMBER: String(vatNumber || ''),
        ROWS: rows.filter(r => r.itemCode.trim() !== '')
      };

      const res = await fetch('http://localhost:3000/api/sales/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Sale saved successfully!');
        fetchInvoiceNo(); // Get next number
        // Reset grid rows (optional but good)
        setRows([
          { id: 1, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: 2, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: 3, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: 4, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
          { id: 5, itemCode: '', description: '', unit: '', qty: '', price: '', aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' },
        ]);
      } else {
        const err = await res.json();
        alert(`Error: ${err.details || 'Save failed'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Connection error');
    }
  };

  useEffect(() => {
    fetchInvoiceNo();
    
    // Fetch Default Cash Customer (6000)
    fetch('http://localhost:3000/api/customers/6000')
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

    fetch('http://localhost:3000/api/sales')
      .then(res => res.json())
      .then(data => setSalesData(data))
      .catch(err => console.error("Failed to fetch database sales:", err));

    fetch('http://localhost:3000/api/accounts/list')
      .then(res => res.json())
      .then(data => {
        setAccounts(data);
        if (data.length > 0) setSelectedAccount(String(data[0].acc_no));
      })
      .catch(err => console.error("Failed to fetch accounts:", err));
  }, []);

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        <div className="flex items-center justify-between mb-6 px-2 shrink-0 gap-4">
           <div className="flex-1">
             <Toolbar visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns} taxIncluded={taxIncluded} setTaxIncluded={setTaxIncluded} enterToQty={enterToQty} setEnterToQty={setEnterToQty} />
           </div>
           
           <h2 className="text-2xl font-black text-rose-500 uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0">
             CREDIT SALES
           </h2>
        </div>

        <div className="flex flex-col flex-1 pb-6 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Left Column: Stacked Invoice & Customer Info */}
            <div className="space-y-4 flex flex-col">
              <InvoiceHeader invoiceNo={invoiceNo} />
              <CustomerDetails 
                customer={customer}
                setCustomer={setCustomer}
                vatNumber={vatNumber} 
                setVatNumber={setVatNumber} 
              />
            </div>

            {/* Right Column: Permanent Address Panel (Equal Height) */}
            <div className="h-full">
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm h-full flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-0.5 w-4 bg-primary rounded-full"></div>
                    <h3 className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">Address Details</h3>
                  </div>
                  {vatNumber.trim() !== '' && (
                    <span className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                      MANDATORY
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-12 gap-x-3 gap-y-2 flex-1">
                  <div className="col-span-3">
                    <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 px-1">Bld #</label>
                    <input 
                      type="text" 
                      value={address.building}
                      onChange={(e) => handleAddressChange('building', e.target.value)}
                      placeholder="#"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:bg-white dark:focus:bg-zinc-800 focus:border-primary outline-none transition-all dark:text-zinc-200"
                    />
                  </div>
                  
                  <div className="col-span-9">
                    <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 px-1">Street</label>
                    <input 
                      type="text" 
                      value={address.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      placeholder="Street Details"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:bg-white dark:focus:bg-zinc-800 focus:border-primary outline-none transition-all dark:text-zinc-200"
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 px-1">District</label>
                    <input 
                      type="text" 
                      value={address.district}
                      onChange={(e) => handleAddressChange('district', e.target.value)}
                      placeholder="District"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:bg-white dark:focus:bg-zinc-800 focus:border-primary outline-none transition-all dark:text-zinc-200"
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 px-1">City</label>
                    <input 
                      type="text" 
                      value={address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="City"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:bg-white dark:focus:bg-zinc-800 focus:border-primary outline-none transition-all dark:text-zinc-200"
                    />
                  </div>

                  <div className="col-span-4">
                    <label className="block text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 px-1">Pincode</label>
                    <input 
                      type="text" 
                      value={address.pincode}
                      onChange={(e) => handleAddressChange('pincode', e.target.value)}
                      placeholder="Pincode"
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded px-2 py-1 text-xs focus:bg-white dark:focus:bg-zinc-800 focus:border-primary outline-none transition-all dark:text-zinc-200"
                    />
                  </div>
                </div>
                
                <div className="mt-2 py-1.5 px-2 bg-zinc-50 dark:bg-zinc-900/50 rounded border border-zinc-100 dark:border-zinc-800">
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {vatNumber.trim() !== '' 
                      ? '⚠️ Customer has VAT number. Address details must be accurate for tax invoicing.' 
                      : 'Optional: Building, Street, District, and City for the customer profile.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <SalesGrid initialData={[]} rows={rows} setRows={setRows} visibleColumns={visibleColumns} enterToQty={enterToQty} taxIncluded={taxIncluded} />
          
          <SummaryFooter 
            rows={rows} 
            taxIncluded={taxIncluded} 
            onTotalsChange={setTotals} 
            onSave={handleSave} 
            paymentMethod={paymentMethod} 
            setPaymentMethod={setPaymentMethod} 
            accounts={accounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
          />
        </div>
      </div>
    </div>
  );
}
