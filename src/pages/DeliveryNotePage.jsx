import React, { useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS } from '../config';
import { useCache } from '../context/CacheContext';
import InvoiceHeader from '../components/InvoiceHeader';
import CustomerDetails from '../components/CustomerDetails';
import Toolbar from '../components/Toolbar';
import InvoiceModal from '../components/InvoiceModal';
import { useLanguage } from '../context/LanguageContext';
import { Trash2, Plus, Minus, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function DeliveryNotePage({ user, params = {}, navigateTo, onBack }) {
  const { t, language } = useLanguage();
  const {
    refreshCache,
    taxIncluded, setTaxIncluded,
    enterToQty, setEnterToQty,
    showInvoiceAfterSave, setShowInvoiceAfterSave,
    currencies,
    defaultCurrency,
    searchItems,
    cachedUnits
  } = useCache();

  // Delivery Note state
  const [invoiceNo, setInvoiceNo] = useState('Loading...');
  const [customer, setCustomer] = useState({ id: '', name: 'Loading...' });
  const [vatNumber, setVatNumber] = useState('');
  const [address, setAddress] = useState({
    street: '', city: '', district: '', building: '', pincode: ''
  });
  const [referenceNo, setReferenceNo] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('1');
  const [isSaving, setIsSaving] = useState(false);
  const [editingRecNo, setEditingRecNo] = useState(null);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [referenceItems, setReferenceItems] = useState([]);

  // Toolbar & columns state
  const [visibleColumns, setVisibleColumns] = useState({
    itemCode: true,
    description: true,
    qty: true
  });
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency?.no || 1);

  // Reference search states
  const [selectedRefSourceDoc, setSelectedRefSourceDoc] = useState(null);

  // Search autocomplete state
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchId, setActiveSearchId] = useState(null);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  const selectReferenceDocument = async (doc, sourceType) => {
    setSelectedRefSourceDoc(doc);
    setReferenceNo(String(doc.INVOICE_NO));
    
    // Load Customer
    if (doc.ACCODE) {
      setCustomer({ id: String(doc.ACCODE), name: doc.ENAME || 'CASH CUSTOMER' });
    }
    const vat = doc.VAT_NUMBER;
    setVatNumber(vat === '0' || vat === 0 || !vat ? '' : String(vat));

    // Load Address
    try {
      const resAddr = await fetch(API_ENDPOINTS.INVOICE_ADDRESS(doc.INVOICE_NO, doc.TRN_TYPE));
      if (resAddr.ok) {
        const addrData = await resAddr.json();
        if (addrData) {
          setAddress({
            street: addrData.STREET || addrData.street || '',
            city: addrData.CITY || addrData.city || '',
            district: addrData.DISTRICT || addrData.district || '',
            building: addrData.BUILDING || addrData.building || '',
            pincode: addrData.PINCODE || addrData.pincode || ''
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch reference address:', e);
    }

    // Load Items and QTYs
    try {
      const resItems = await fetch(API_ENDPOINTS.SALE_ITEMS(doc.REC_NO));
      if (resItems.ok) {
        const items = await resItems.json();
        setReferenceItems(items);
        const mappedRows = items.map((item, idx) => ({
          id: Date.now() + idx,
          itemCode: item.ITEM_CODE || item.BARCODE || '',
          description: item.DESCRIPTION || '',
          qty: Number(item.QTY) || 1,
          unit: getUnitName(item.UNIT),
          unitId: item.UNIT || ''
        }));
        
        // Pad with empty rows to make it at least 5 rows
        const paddingCount = Math.max(0, 5 - mappedRows.length);
        for (let i = 0; i < paddingCount; i++) {
          mappedRows.push({ id: Date.now() + mappedRows.length + i, itemCode: '', description: '', qty: '', unit: '', unitId: '' });
        }
        setRows(mappedRows);
      }
    } catch (e) {
      console.error('Failed to fetch reference items:', e);
    }
  };

  const clearReferenceDocument = () => {
    setSelectedRefSourceDoc(null);
    setReferenceNo('');
    setVatNumber('');
    setReferenceItems([]);
    setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setRows([
      { id: Date.now(), itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 1, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 2, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 3, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 4, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
    ]);
  };

  // Grid Rows (only contains itemCode, description, qty, unit details for DB)
  const [rows, setRows] = useState([
    { id: 1, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
    { id: 2, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
    { id: 3, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
    { id: 4, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
    { id: 5, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
  ]);

  // Click outside to close search dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSearchResults([]);
        setActiveSearchId(null);
        setSearchSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    fetchInvoiceNo();
    setVatNumber('');
    setReferenceItems([]);
    setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
    setValidationErrors([]);
    setAddress({ street: '', city: '', district: '', building: '', pincode: '' });
    setReferenceNo('');
    setSelectedRefSourceDoc(null);
    setRows([
      { id: Date.now(), itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 1, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 2, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 3, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
      { id: Date.now() + 4, itemCode: '', description: '', qty: '', unit: '', unitId: '' },
    ]);
  };

  const handleCloseInvoice = () => {
    setSavedInvoice(null);
    resetPage();
  };

  // Handle Edit Mode from Params
  useEffect(() => {
    if (params && params.editSale) {
      const sale = params.editSale;
      setEditingRecNo(sale.REC_NO);
      setInvoiceNo(sale.INVOICE_NO);
      setCustomer({ id: String(sale.ACCODE || ''), name: sale.ENAME || '' });
      setVatNumber(sale.VAT_NUMBER || '');
      setReferenceNo(sale.REF_NO || '');
      
      // Fetch Sale Items
      fetch(API_ENDPOINTS.SALE_ITEMS(sale.REC_NO))
        .then(res => res.json())
        .then(items => {
          const mappedRows = items.map((item, idx) => ({
            id: idx + 1,
            itemCode: item.BARCODE || item.ITEM_CODE || '',
            description: item.DESCRIPTION || '',
            unit: getUnitName(item.UNIT),
            unitId: item.UNIT || '',
            qty: item.QTY || 1
          }));
          
          // Fill up to at least 5 rows
          while (mappedRows.length < 5) {
            mappedRows.push({ 
              id: Date.now() + mappedRows.length, 
              itemCode: '', description: '', unit: '', qty: '', unitId: ''
            });
          }
          setRows(mappedRows);
        })
        .catch(err => console.error("Failed to fetch edit items:", err));
        
      // Fetch Customer Address if available
      fetch(API_ENDPOINTS.INVOICE_ADDRESS(sale.INVOICE_NO, sale.TRN_TYPE))
        .then(res => res.json())
        .then(addrData => {
          if (addrData) {
            setAddress({
              street: addrData.STREET || addrData.street || '',
              city: addrData.CITY || addrData.city || '',
              district: addrData.DISTRICT || addrData.district || '',
              building: addrData.BUILDING || addrData.building || '',
              pincode: addrData.PINCODE || addrData.pincode || ''
            });
          }
        })
        .catch(err => console.error("Failed to fetch edit address:", err));
    }
  }, [params]);

  const handleConfirmDelivery = async () => {
    const activeRows = rows.filter(r => r.itemCode.trim() !== '');
    if (activeRows.length === 0) {
      alert(language === 'ar' ? 'يرجى إضافة بند واحد على الأقل.' : 'Please add at least one item.');
      return;
    }

    if (invoiceNo === 'Loading...') {
      alert('Delivery Note number is still loading. Please wait.');
      return;
    }

    // Address verification if VAT Tin is provided
    if (vatNumber && vatNumber.trim() !== '') {
      const errors = [];
      if (!address.building?.trim()) errors.push('building');
      if (!address.street?.trim()) errors.push('street');
      if (!address.district?.trim()) errors.push('district');
      if (!address.city?.trim()) errors.push('city');
      if (!address.pincode?.trim()) errors.push('pincode');

      if (errors.length > 0) {
        setValidationErrors(errors);
        alert(language === 'ar' ? 'يرجى إدخال العنوان الكامل لضريبة القيمة المضافة.' : 'VAT Delivery Note requires a complete address.');
        return;
      }
    }
    setValidationErrors([]);

    if (isSaving) return;
    setIsSaving(true);

    try {
      const payload = {
        INVOICE_NO: String(invoiceNo),
        ACCODE: String(customer.id || ''),
        ENAME: String(customer.name || ''),
        G_TOTAL: 0,
        DISC_AMT: 0,
        NET_AMOUNT: 0,
        VAT_AMOUNT: 0,
        CASH_PAID: 0,
        OTHER_PAID: 0,
        VAT_NUMBER: String(vatNumber || ''),
        PAYMENT_METHOD: 'Others',
        TAX_INCLUDED: true,
        USERNAME: user?.username || '',
        WR_CODE: selectedWarehouse,
        REC_NO: editingRecNo,
        CURRENCY: 1, // Default currency
        TRN_TYPE: 16, // Delivery Note
        ADDRESS: address,
        REF_INV_NO: referenceNo,
        ROWS: activeRows.map(r => ({
          itemCode: r.itemCode,
          description: r.description,
          qty: Number(r.qty) || 1,
          unit: r.unit || 'Pcs',
          unitId: r.unitId || '',
          price: 0,
          vatPercent: 0,
          vatAmt: 0,
          total: 0
        }))
      };

      console.log('💎 DELIVERY_NOTE: Saving with payload:', payload);
      const res = await fetch(API_ENDPOINTS.SALES_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        refreshCache();

        if (showInvoiceAfterSave) {
          const invoiceData = {
            REC_NO: result.REC_NO,
            INVOICE_NO: result.INVOICE_NO,
            CURDATE: new Date().toISOString(),
            ENAME: customer.name || 'Cash Customer',
            ACCODE: customer.id,
            G_TOTAL: 0,
            DISC_AMT: 0,
            NET_AMOUNT: 0,
            VAT_AMOUNT: 0,
            VAT_NUMBER: vatNumber,
            TRN_TYPE: 16,
            REF_NO: referenceNo,
            CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
          };
          setSavedInvoice(invoiceData);
        } else {
          alert(language === 'ar' ? 'تم تأكيد التوصيل وحفظ السند بنجاح!' : 'Delivery Note confirmed and saved successfully!');
          resetPage();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.details || 'Save failed'}`);
      }
    } catch (err) {
      console.error('Error saving delivery note:', err);
      alert('Error confirming delivery note');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchInvoiceNo();

    // Fetch default customer (6000)
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
        console.error('Failed to fetch default customer:', err);
        setCustomer({ id: '6000', name: 'CASH CUSTOMER' });
      });

    // Fetch Warehouses
    fetch(API_ENDPOINTS.WAREHOUSE_LIST)
      .then(res => res.json())
      .then(data => {
        setWarehouses(data);
        if (data.length > 0) setSelectedWarehouse(String(data[0].WR_CODE));
      })
      .catch(err => console.error('Failed to fetch warehouses:', err));

    // Fetch Currency list
    fetch(API_ENDPOINTS.CURRENCY_LIST)
      .then(res => res.json())
      .then(data => {
        setCurrencies(data);
        if (data.length > 0) {
          setSelectedCurrency(defaultCurrency?.no || data[0].Currency_No);
        }
      })
      .catch(err => console.error('Failed to fetch currencies:', err));
  }, []);

  // Handle Autocomplete searching
  const handleItemSearch = async (rowId, query, isSelection = false) => {
    if (!query) {
      setSearchResults([]);
      setActiveSearchId(null);
      setSearchSelectedIndex(-1);
      return;
    }

    // Local cached search
    let data = searchItems(query);

    // Fallback to API if not in cache
    if (!data || data.length === 0) {
      try {
        const res = await fetch(`${API_ENDPOINTS.ITEM_SEARCH}?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.error('API search failed:', err);
      }
    }

    if (selectedRefSourceDoc && referenceItems.length > 0) {
      const refCodesAndBarcodes = new Set(
        referenceItems.flatMap(i => [
          String(i.ITEM_CODE || '').toLowerCase().trim(),
          String(i.BARCODE || '').toLowerCase().trim()
        ]).filter(Boolean)
      );
      data = (data || []).filter(item => 
        refCodesAndBarcodes.has(String(item.ITEM_CODE || '').toLowerCase().trim()) ||
        refCodesAndBarcodes.has(String(item.BARCODE || '').toLowerCase().trim())
      );
    }

    if (isSelection) {
      if (data && data.length > 0) {
        selectItem(rowId, data[0]);
      }
      return;
    }

    setSearchResults(data || []);
    setActiveSearchId(rowId);
    setSearchSelectedIndex(data && data.length > 0 ? 0 : -1);
  };

  const getUnitName = (unitId) => {
    if (!unitId) return 'Pcs';
    const unit = cachedUnits.find(u => String(u.Unit_id || u.unit_id || '') === String(unitId));
    return unit ? (unit.Unit_Name || unit.unit_name) : 'Pcs';
  };

  const selectItem = (rowId, item) => {
    // If reference document is selected, block any items not present in referenceItems
    if (selectedRefSourceDoc && referenceItems.length > 0) {
      const existsInRef = referenceItems.some(i => 
        String(i.ITEM_CODE || '').toLowerCase().trim() === String(item.ITEM_CODE || item.BARCODE || '').toLowerCase().trim() ||
        String(i.BARCODE || '').toLowerCase().trim() === String(item.ITEM_CODE || item.BARCODE || '').toLowerCase().trim()
      );
      if (!existsInRef) {
        alert(language === 'ar'
          ? 'هذا البند غير متوفر في السند المرجعي المحدد!'
          : 'This item is not present in the selected reference document!'
        );
        return;
      }
    }

    let nextIdToFocus = null;

    setRows(prevRows => {
      // Check if item already exists in another row
      const existingIdx = prevRows.findIndex(r => r.id !== rowId && r.itemCode === (item.BARCODE || item.ITEM_CODE));
      if (existingIdx !== -1) {
        const updated = prevRows.map((row, idx) => {
          if (idx === existingIdx) {
            let nextQty = Number(row.qty || 0) + 1;
            // Limit quantity if selectedRefSourceDoc is active
            if (selectedRefSourceDoc && referenceItems.length > 0) {
              const originalItem = referenceItems.find(i => 
                String(i.ITEM_CODE || '').toLowerCase().trim() === String(row.itemCode || '').toLowerCase().trim() ||
                String(i.BARCODE || '').toLowerCase().trim() === String(row.itemCode || '').toLowerCase().trim()
              );
              if (originalItem) {
                const maxQty = Number(originalItem.QTY || 0);
                if (nextQty > maxQty) {
                  alert(language === 'ar'
                    ? `الكمية المدخلة تجاوزت الكمية المتاحة في السند المرجعي وهي ${maxQty}`
                    : `Entered quantity exceeds the reference document quantity of ${maxQty}`
                  );
                  nextQty = maxQty;
                }
              }
            }
            return {
              ...row,
              qty: nextQty
            };
          }
          if (row.id === rowId) {
            return {
              id: rowId,
              itemCode: '',
              description: '',
              qty: '',
              unit: '',
              unitId: ''
            };
          }
          return row;
        });
        
        // Focus current itemCode input for next scan
        nextIdToFocus = `itemCode-${rowId}`;
        return updated;
      }

      const isLast = prevRows[prevRows.length - 1].id === rowId;
      const updated = prevRows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            itemCode: item.BARCODE || item.ITEM_CODE || '',
            description: item.DESCRIPTION || '',
            qty: 1,
            unit: getUnitName(item.UNIT),
            unitId: item.UNIT || ''
          };
        }
        return row;
      });

      if (!enterToQty) {
        if (isLast) {
          const nextId = Date.now() + 1;
          updated.push({ id: nextId, itemCode: '', description: '', qty: '', unit: '', unitId: '' });
          nextIdToFocus = `itemCode-${nextId}`;
        } else {
          const idx = prevRows.findIndex(r => r.id === rowId);
          nextIdToFocus = `itemCode-${prevRows[idx + 1].id}`;
        }
      } else {
        nextIdToFocus = `qty-${rowId}`;
      }

      return updated;
    });

    setSearchResults([]);
    setActiveSearchId(null);
    setSearchSelectedIndex(-1);

    // Focus the target input
    setTimeout(() => {
      if (nextIdToFocus) {
        const el = document.getElementById(nextIdToFocus);
        if (el) {
          el.focus();
          if (el.select) el.select();
        }
      }
    }, 50);
  };

  const updateRowField = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        let finalValue = value;
        if (field === 'qty' && selectedRefSourceDoc && referenceItems.length > 0) {
          const originalItem = referenceItems.find(i => 
            String(i.ITEM_CODE || '').toLowerCase().trim() === String(row.itemCode || '').toLowerCase().trim() ||
            String(i.BARCODE || '').toLowerCase().trim() === String(row.itemCode || '').toLowerCase().trim()
          );
          if (originalItem) {
            const maxQty = Number(originalItem.QTY || 0);
            if (Number(value) > maxQty) {
              alert(language === 'ar'
                ? `الكمية المدخلة تجاوزت الكمية المتاحة في السند المرجعي وهي ${maxQty}`
                : `Entered quantity exceeds the reference document quantity of ${maxQty}`
              );
              finalValue = maxQty;
            }
          }
        }
        return { ...row, [field]: finalValue };
      }
      return row;
    }));
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), itemCode: '', description: '', qty: '', unit: '', unitId: '' }]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    } else {
      setRows([{ id: Date.now(), itemCode: '', description: '', qty: '', unit: '', unitId: '' }]);
    }
  };

  const handleKeyDown = (e, row, field) => {
    if (e.key === 'Enter') {
      if (field === 'itemCode') {
        if (activeSearchId === row.id && searchResults.length > 0 && searchSelectedIndex >= 0) {
          e.preventDefault();
          selectItem(row.id, searchResults[searchSelectedIndex]);
        } else if (row.itemCode) {
          handleItemSearch(row.id, row.itemCode, true);
        }
      } else if (field === 'qty') {
        // Find if this is the last row to auto add new row
        const isLast = rows[rows.length - 1].id === row.id;
        if (isLast) {
          const nextId = Date.now();
          setRows([...rows, { id: nextId, itemCode: '', description: '', qty: '', unit: '', unitId: '' }]);
          setTimeout(() => {
            document.getElementById(`itemCode-${nextId}`)?.focus();
          }, 50);
        } else {
          const idx = rows.findIndex(r => r.id === row.id);
          document.getElementById(`itemCode-${rows[idx + 1].id}`)?.focus();
        }
      }
    } else if (e.key === 'ArrowDown' && field === 'itemCode' && activeSearchId === row.id && searchResults.length > 0) {
      e.preventDefault();
      setSearchSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp' && field === 'itemCode' && activeSearchId === row.id && searchResults.length > 0) {
      e.preventDefault();
      setSearchSelectedIndex(prev => Math.max(prev - 1, 0));
    }
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        
        {/* Modern Option Bar & Header */}
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
              onNew={resetPage}
              onPending={null}
              onHistory={() => navigateTo?.('delivery-history')}
              onClear={resetPage}
              pendingCount={0}
              isQuotation={false}
              isDelivery={true}
            />
          </div>

          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-indigo-600 uppercase tracking-widest hidden sm:block drop-shadow-sm shrink-0">
              {language === 'ar' ? 'سند توصيل' : 'DELIVERY INVOICE'}
            </h2>
          </div>
        </div>

        {/* Header Forms */}
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
              isDelivery={true}
              onReferenceSelect={selectReferenceDocument}
              selectedRefSourceDoc={selectedRefSourceDoc}
              onClearRef={clearReferenceDocument}
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

          {/* Simplified Grid */}
          <div className="bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-visible mb-2 transition-all">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-border">
                    <th className="p-3 w-12 text-center font-semibold">#</th>
                    <th className="p-3 font-semibold min-w-[200px]">{language === 'ar' ? 'رمز البند' : 'Item Code'}</th>
                    <th className="p-3 font-semibold min-w-[350px]">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                    <th className="p-3 font-semibold w-32 text-right">{language === 'ar' ? 'الكمية' : 'Quantity'}</th>
                    <th className="p-3 w-14 text-center">{language === 'ar' ? 'إجراء' : 'Act'}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {rows.map((row, index) => (
                    <tr key={row.id} className="border-b border-border hover:bg-indigo-50/5 dark:hover:bg-indigo-500/5 transition-colors group">
                      <td className="p-2 text-center text-zinc-400 dark:text-zinc-500 font-medium">{index + 1}</td>
                      
                      {/* Item Code Input & Autocomplete dropdown */}
                      <td className="p-1 relative">
                        <input
                          id={`itemCode-${row.id}`}
                          type="text"
                          value={row.itemCode}
                          placeholder={language === 'ar' ? 'امسح الرمز أو اكتب للبحث...' : 'Scan barcode or type...'}
                          autoComplete="off"
                          onChange={(e) => {
                            updateRowField(row.id, 'itemCode', e.target.value);
                            handleItemSearch(row.id, e.target.value);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, row, 'itemCode')}
                          className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded dark:text-zinc-200 transition-all text-sm font-medium placeholder-zinc-400/60 dark:placeholder-zinc-500/60"
                        />
                        
                        {activeSearchId === row.id && searchResults.length > 0 && (
                          <div 
                            ref={dropdownRef}
                            className="absolute left-0 right-0 top-full bg-card border border-border shadow-2xl rounded-xl mt-1 overflow-hidden z-[999] animate-in fade-in slide-in-from-top-2 duration-200"
                          >
                            <div className="max-h-60 overflow-y-auto">
                              {searchResults.map((item, idx) => (
                                <div
                                  key={idx}
                                  id={`search-item-${idx}`}
                                  onClick={() => selectItem(row.id, item)}
                                  className={`p-3 cursor-pointer border-b border-border last:border-0 flex justify-between items-center group/item transition-colors ${
                                    idx === searchSelectedIndex ? 'bg-indigo-500/10 text-primary' : 'hover:bg-indigo-500/5'
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-bold text-card-foreground text-sm group-hover/item:text-indigo-600 transition-colors">{item.DESCRIPTION || 'No Description'}</span>
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500">Code: {item.ITEM_CODE || 'N/A'} | Barcode: {item.BARCODE || 'N/A'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Description input */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.description}
                          placeholder={language === 'ar' ? 'الوصف التلقائي للبند' : 'Auto-filled description'}
                          onChange={(e) => updateRowField(row.id, 'description', e.target.value)}
                          className="w-full bg-transparent p-2 outline-none focus:bg-white dark:focus:bg-zinc-800 focus:ring-1 focus:ring-primary rounded dark:text-zinc-100 transition-all font-medium text-sm placeholder-zinc-400/60 dark:placeholder-zinc-500/60"
                        />
                      </td>

                      {/* Quantity input with +/- controls */}
                      <td className="p-1">
                        <div className="flex items-center justify-end gap-1 max-w-[130px] ml-auto">
                          <button
                            type="button"
                            disabled={!row.itemCode}
                            onClick={() => {
                              const newQty = Math.max(1, Number(row.qty || 0) - 1);
                              updateRowField(row.id, 'qty', newQty);
                            }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 border border-border/50 transition-all duration-300 ${
                              !row.itemCode ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'
                            }`}
                            title="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          
                          <input
                            id={`qty-${row.id}`}
                            type="number"
                            value={row.qty}
                            disabled={!row.itemCode}
                            placeholder="0"
                            min="1"
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1);
                              updateRowField(row.id, 'qty', val);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, row, 'qty')}
                            className={`w-10 bg-transparent py-1 px-0.5 outline-none text-center font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-300 ${
                              row.itemCode 
                                ? 'dark:text-zinc-200 text-zinc-800 opacity-100' 
                                : 'text-zinc-300 dark:text-zinc-700 opacity-60'
                            }`}
                          />

                          <button
                            type="button"
                            disabled={!row.itemCode}
                            onClick={() => {
                              const newQty = Number(row.qty || 0) + 1;
                              updateRowField(row.id, 'qty', newQty);
                            }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 border border-border/50 transition-all duration-300 ${
                              !row.itemCode ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'
                            }`}
                            title="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Remove Row button */}
                      <td className="p-1 text-center">
                        <button
                          onClick={() => removeRow(row.id)}
                          className="text-zinc-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row Button at footer of table */}
            <div className="p-2 border-t border-border bg-white dark:bg-zinc-900 flex items-center justify-between">
              <button
                onClick={addRow}
                className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-indigo-500 px-3 py-1.5 rounded hover:bg-primary/10 transition-colors"
              >
                <Plus size={16} />
                {language === 'ar' ? 'إضافة سطر جديد' : 'Add Row'}
              </button>
            </div>
          </div>

          {/* Confirm Delivery Button - Sleek and Elegant at bottom */}
          <div className="mt-auto pt-4 flex justify-end">
            <button
              onClick={handleConfirmDelivery}
              disabled={isSaving}
              className="w-full md:w-auto min-w-[240px] flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{language === 'ar' ? 'جاري التأكيد...' : 'CONFIRMING...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>{language === 'ar' ? 'تأكيد التوصيل' : 'CONFIRM DELIVERY'}</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Final Invoice Modal */}
      <InvoiceModal 
        sale={savedInvoice} 
        onClose={handleCloseInvoice}
        address={address}
      />
    </div>
  );
}
