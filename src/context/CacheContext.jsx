import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config';

const CacheContext = createContext();

export function CacheProvider({ children }) {
  const [cachedItems, setCachedItems] = useState([]);
  const [cachedCustomers, setCachedCustomers] = useState([]);
  const [cachedSuppliers, setCachedSuppliers] = useState([]);
  const [cachedSales, setCachedSales] = useState([]);
  const [cachedPurchases, setCachedPurchases] = useState([]);
  const [cachedAccounts, setCachedAccounts] = useState([]);
  const [cachedUnits, setCachedUnits] = useState([]);
  const [addressCache, setAddressCache] = useState({}); // { accNo: info }
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState({ code: 'SAR', no: 1 });
  const [pendingSales, setPendingSales] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);

  // Global App Settings (Preserved across page navigation)
  const [taxIncluded, setTaxIncluded] = useState(true);
  const [enterToQty, setEnterToQty] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    itemCode: true, description: true, unit: true, qty: true, 
    price: true, aliasCode: true, vatAmt: true, total: true, stock: true
  });
  const [historyInvoiceColumns, setHistoryInvoiceColumns] = useState({
    barcode: true, description: true, unit: true, qty: true, 
    price: true, vatPercent: true, vatAmt: true, total: true
  });
  const [showInvoiceAfterSave, setShowInvoiceAfterSave] = useState(true);

  const loadCache = useCallback(async () => {
    try {
      console.log('🔄 Prefetching data cache... VERSION: 1.1 (Diagnostics)');
      
      const fetchWithLog = async (name, url) => {
        try {
          console.log(`📡 Starting fetch for ${name}...`);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${name} fetch failed with status ${res.status}`);
          const data = await res.json();
          console.log(`✅ ${name} loaded: ${data.length} records.`);
          return data;
        } catch (err) {
          console.error(`❌ ${name} fetch error:`, err);
          return [];
        }
      };

      const [items, customers, suppliers, sales, purchases, accounts, currencyList, units] = await Promise.all([
        fetchWithLog('Items', API_ENDPOINTS.ITEM_CACHE),
        fetchWithLog('Customers', API_ENDPOINTS.CUSTOMER_CACHE),
        fetchWithLog('Suppliers', API_ENDPOINTS.SUPPLIER_CACHE),
        fetchWithLog('Sales', API_ENDPOINTS.SALES_HISTORY),
        fetchWithLog('Purchases', API_ENDPOINTS.PURCHASE_HISTORY),
        fetchWithLog('Accounts', API_ENDPOINTS.ACCOUNT_CACHE),
        fetchWithLog('Currencies', API_ENDPOINTS.CURRENCY_LIST),
        fetchWithLog('Units', API_ENDPOINTS.UNIT_MASTER)
      ]);

      setCachedItems(items);
      setCachedCustomers(customers);
      setCachedSuppliers(suppliers);
      setCachedSales(sales);
      setCachedPurchases(purchases);
      setCachedAccounts(accounts);
      setCurrencies(currencyList);
      setCachedUnits(units);
      
      // Set default currency if not already set (e.g., from localStorage)
      const savedCurrency = localStorage.getItem('defaultCurrency');
      if (savedCurrency) {
        setDefaultCurrency(JSON.parse(savedCurrency));
      } else if (currencyList.length > 0) {
        const first = currencyList[0];
        const initial = { code: first.Currency_code, no: first.Currency_No };
        setDefaultCurrency(initial);
        localStorage.setItem('defaultCurrency', JSON.stringify(initial));
      }
      setIsReady(true);
      console.log('🚀 Global Cache is READY');
    } catch (err) {
      console.error('❌ Global Cache prefetch failed:', err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadCache();
  }, [loadCache]);

  const searchItems = (query) => {
    if (!query) return [];
    const q = query.toLowerCase();
    return cachedItems
      .filter(item => 
        (item.BARCODE && String(item.BARCODE).toLowerCase().includes(q)) || 
        (item.DESCRIPTION && String(item.DESCRIPTION).toLowerCase().includes(q)) ||
        (item.ITEM_CODE && String(item.ITEM_CODE).toLowerCase().includes(q))
      )
      .slice(0, 15);
  };

  const searchCustomers = (query) => {
    const q = (query || '').toLowerCase();
    return cachedCustomers
      .filter(c => 
        (c.ACC_NO && String(c.ACC_NO).toLowerCase().includes(q)) || 
        (c.ACC_NAME && c.ACC_NAME.toLowerCase().includes(q))
      )
      .slice(0, 15);
  };

  const searchSuppliers = (query) => {
    const q = (query || '').toLowerCase();
    return cachedSuppliers
      .filter(s => 
        (s.ACC_NO && String(s.ACC_NO).toLowerCase().includes(q)) || 
        (s.ACC_NAME && s.ACC_NAME.toLowerCase().includes(q))
      )
      .slice(0, 15);
  };

  const getAddressFromCache = (accNo) => addressCache[accNo] || null;
  
  const updateAddressCache = (accNo, info) => {
    setAddressCache(prev => ({ ...prev, [accNo]: info }));
  };

  return (
    <CacheContext.Provider value={{ 
      cachedItems, 
      cachedCustomers, 
      cachedSales,
      cachedAccounts,
      cachedUnits,
      isReady, 
      error, 
      searchItems, 
      searchCustomers,
      searchSuppliers,
      cachedPurchases,
      getAddressFromCache,
      updateAddressCache,
      taxIncluded,
      setTaxIncluded,
      enterToQty,
      setEnterToQty,
      visibleColumns,
      setVisibleColumns,
      historyInvoiceColumns,
      setHistoryInvoiceColumns,
      showInvoiceAfterSave,
      setShowInvoiceAfterSave,
      currencies,
      defaultCurrency,
      setDefaultCurrency: (curr) => {
        setDefaultCurrency(curr);
        localStorage.setItem('defaultCurrency', JSON.stringify(curr));
      },
      refreshCache: loadCache,
      pendingSales,
      addPendingSale: (sale) => setPendingSales(prev => [sale, ...prev]),
      removePendingSale: (id) => setPendingSales(prev => prev.filter(p => p.id !== id)),
      clearPendingSales: () => setPendingSales([]),
      pendingPurchases,
      addPendingPurchase: (purchase) => setPendingPurchases(prev => [purchase, ...prev]),
      removePendingPurchase: (id) => setPendingPurchases(prev => prev.filter(p => p.id !== id)),
      clearPendingPurchases: () => setPendingPurchases([]),
      pendingReturns,
      addPendingReturn: (ret) => setPendingReturns(prev => [ret, ...prev]),
      removePendingReturn: (id) => setPendingReturns(prev => prev.filter(p => p.id !== id)),
      clearPendingReturns: () => setPendingReturns([])
    }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}
