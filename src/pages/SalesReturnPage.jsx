import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, FileSearch } from 'lucide-react';
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

export default function SalesReturnPage({ user, params = {}, navigateTo, onBack }) {
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
  const [selectedCurrencyRate, setSelectedCurrencyRate] = useState(1);
  const prevRateRef = React.useRef(selectedCurrencyRate);
  const [isZatcaEnabled, setIsZatcaEnabled] = useState(false);
  const [isPrintEnabled, setIsPrintEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);
  
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  // RETURN RESTRICTION STATE
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState(null);
  const [manualReferenceNo, setManualReferenceNo] = useState('');

  const loadUserOptions = async () => {
    if (!user?.userid) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.USER_ENTRY_OPTIONS}?userId=${user.userid}&trnType=3`);
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
    
    const keys = ['itemCode', 'description', 'unit', 'qty', 'price', 'aliasCode', 'vatAmt', 'total', 'stock'];
    const gridStr = keys.map(k => (visibleColumns[k] ? '1' : '0')).join('').padEnd(10, '1');

    try {
      await fetch(API_ENDPOINTS.USER_ENTRY_OPTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userid,
          trnType: 3,
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

      // Convert paid amounts
      setCashPaid(prev => (prev * oldRate) / newRate);
      setOtherPaid(prev => (prev * oldRate) / newRate);

      prevRateRef.current = newRate;
    }
  }, [selectedCurrencyRate]);

  useEffect(() => {
    if (user?.userid) {
      saveUserOptions();
    }
  }, [autoPrint, defaultPrintPaper, showInvoiceAfterSave, enterToQty, visibleColumns, crystalPrint]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleHoldAndNew();
      } else if (e.key === 'F3') {
        e.preventDefault();
        const hasItems = rows.some(r => r.itemCode && r.itemCode.trim() !== '');
        if (!hasItems) {
          alert("Please add at least one item before proceeding.");
          return;
        }
        handleSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, customer, totals, vatNumber, address, manualReferenceNo, paymentMethod, cashPaid, otherPaid, selectedWarehouse, selectedCurrency, selectedCurrencyRate, editingRecNo, isSaving, selectedInvoice, invoiceItems]);

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
    setSelectedCurrencyRate(sale.selectedCurrencyRate || 1);
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
    setIsZatcaEnabled(false);
    setIsPrintEnabled(false);
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

  const handlePdfScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch(`${API_ENDPOINTS.BASE_URL}/api/scan-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to scan PDF');
      }

      const data = await res.json();
      console.log('📄 Scanned Data:', data);

      if (data.customer) {
        if (data.customer.accNo) {
          setCustomer(prev => ({ ...prev, id: data.customer.accNo }));
          if (data.customer.vatNumber) setVatNumber(data.customer.vatNumber);
          
          fetch(API_ENDPOINTS.CUSTOMER_INFO(data.customer.accNo))
            .then(res => res.json())
            .then(info => {
              if (info) {
                setAddress({
                  building: info.building_no || '',
                  street: info.street_name || '',
                  district: info.city_subdivision_name || '',
                  city: info.city_name || '',
                  pincode: info.postal_zone || ''
                });
                if (info.VAT_Tinno) setVatNumber(info.VAT_Tinno);
              }
            })
            .catch(err => console.error("Failed to fetch matched customer info:", err));
        } else {
          setCustomer(prev => ({ ...prev, id: '999' }));
          if (data.customer.vatNumber) setVatNumber(data.customer.vatNumber);
        }
      }

      if (data.items && Array.isArray(data.items)) {
        const newRows = data.items.map((item, idx) => ({
          id: Date.now() + idx,
          itemCode: item.itemCode || '999',
          description: item.officialDescription || item.description || '',
          unit: item.unit || 'Pcs',
          qty: item.qty || 1,
          price: (item.dbPrice || item.price || 0) / selectedCurrencyRate,
          vatPercent: item.vatPercent || 15,
          vatAmt: 0,
          total: 0,
          aliasCode: '',
          stock: ''
        }));

        while (newRows.length < 5) {
          newRows.push({ 
            id: Date.now() + newRows.length, 
            itemCode: '', description: '', unit: '', qty: '', price: '', 
            aliasCode: '', vatAmt: '', vatPercent: 0, total: '', stock: '' 
          });
        }
        setRows(newRows);
      }
    } catch (error) {
      console.error("PDF Scan Error:", error);
      alert(error.message);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      const finalPaymentMethod = isQuickSave ? 'Cash' : paymentMethod;
      const finalCashPaid = isQuickSave ? totals.net : cashPaid;
      const finalOtherPaid = isQuickSave ? 0 : otherPaid;

      const payload = {
        INVOICE_NO: String(invoiceNo),
        ACCODE: String(customer.id || ''),
        ENAME: String(customer.name || ''),
        G_TOTAL: totals.gross * selectedCurrencyRate,
        DISC_AMT: totals.discount * selectedCurrencyRate,
        NET_AMOUNT: totals.net * selectedCurrencyRate,
        VAT_AMOUNT: totals.vat * selectedCurrencyRate,
        TAXABLE_AMOUNT: (totals.gross - totals.discount) * selectedCurrencyRate,
        FRN_AMOUNT: totals.net,
        CASH_PAID: finalCashPaid * selectedCurrencyRate,
        OTHER_PAID: finalOtherPaid * selectedCurrencyRate,
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
        CRATE: selectedCurrencyRate,
        CURRENCY_RATE: selectedCurrencyRate,
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

      console.log('🔄 SALES_RETURN_PAGE: Sending payload:', payload);
      const res = await fetch(API_ENDPOINTS.SALES_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        
        refreshCache();
        
        if (autoPrint || showInvoiceAfterSave) {
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
            TRN_TYPE: finalPaymentMethod === 'Cash' ? 3 : 4,
            REF_NO: selectedInvoice?.INVOICE_NO || manualReferenceNo || null,
            CASH_PAID: finalCashPaid * selectedCurrencyRate,
            OTHER_PAID: finalOtherPaid * selectedCurrencyRate,
            CRATE: selectedCurrencyRate,
            CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
          };
          setSavedInvoice(invoiceData);
        } else {
          alert(`Return sale saved successfully! Invoice No: ${result.INVOICE_NO}`);
          // Reset page for new transaction
          resetPage();
        }
      } else {
        const err = await res.json();
        alert(`Error: ${err.details || 'Save failed'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert('Connection error');
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
      G_TOTAL: totals.gross * selectedCurrencyRate,
      DISC_AMT: totals.discount * selectedCurrencyRate,
      NET_AMOUNT: totals.net * selectedCurrencyRate,
      VAT_AMOUNT: totals.vat * selectedCurrencyRate,
      VAT_NUMBER: vatNumber,
      TRN_TYPE: paymentMethod === 'Cash' ? 3 : 4,
      REF_NO: selectedInvoice?.INVOICE_NO || manualReferenceNo || null,
      CASH_PAID: cashPaid * selectedCurrencyRate,
      OTHER_PAID: otherPaid * selectedCurrencyRate,
      CRATE: selectedCurrencyRate,
      CURRENCY_CODE: currencies.find(c => c.Currency_No === selectedCurrency)?.Currency_code || 'SAR'
    };
    setSavedInvoice(invoiceData);
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
    const curr = currencies.find(c => c.Currency_No === selectedCurrency);
    if (curr) {
      setSelectedCurrencyRate(curr.Currency_Rate || 1);
    }
  }, [selectedCurrency, currencies]);

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
      setPaymentMethod(sale.TRN_TYPE === 3 ? 'Cash' : 'Others');
      setManualReferenceNo(sale.REF_NO || '');
      setSelectedCurrencyRate(sale.CRATE || 1);
      
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

  const handleZatcaSubmit = async (invoiceData) => {
    try {
      const targetInvoiceNo = invoiceData?.INVOICE_NO || invoiceNo;
      const targetTrnType = invoiceData?.TRN_TYPE || (paymentMethod === 'Cash' ? 3 : 4);

      alert(`ZATCA: Submitting Return Sales Invoice #${targetInvoiceNo} (Type: ${targetTrnType === 3 ? 'Cash Return' : 'Credit Return'}) to ZATCA server...`);
      const res = await fetch(API_ENDPOINTS.ZATCA_SUBMIT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNo: String(targetInvoiceNo),
          trnType: targetTrnType
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ ZATCA SUCCESS: Return Invoice #${targetInvoiceNo} processed and submitted successfully!\n${data.message || ''}`);
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
              selectedCurrencyRate={selectedCurrencyRate}
              setSelectedCurrencyRate={setSelectedCurrencyRate}
              onNew={handleHoldAndNew}
              onPending={() => setIsPendingModalOpen(true)}
              onHistory={() => navigateTo?.('sales-history')}
              onReturn={() => navigateTo?.('sales')}
              isReturn={true}
              onClear={resetPage}
              onScanPdf={() => fileInputRef.current?.click()}
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
              setSelectedCurrency={setSelectedCurrency}
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
            selectedCurrencyRate={selectedCurrencyRate}
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
            autoPrint={autoPrint}
            setAutoPrint={setAutoPrint}
            selectedCurrencyRate={selectedCurrencyRate}
          />
        </div>
      </div>

      {/* Final Invoice Modal */}
      <InvoiceModal 
        sale={savedInvoice} 
        onClose={handleCloseInvoice}
        address={address}
        onZatcaSubmit={handleZatcaSubmit}
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

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePdfScan} 
        accept=".pdf" 
        className="hidden" 
      />

      {isScanning && (
        <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card p-8 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-6 max-w-sm w-full mx-4">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FileSearch className="text-indigo-500 animate-pulse" size={32} />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest mb-2">Scanning PDF</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Extracting details using AI...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
