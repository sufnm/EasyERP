import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config';

const CacheContext = createContext();

export function CacheProvider({ children }) {
  const [cachedItems, setCachedItems] = useState([]);
  const [cachedCustomers, setCachedCustomers] = useState([]);
  const [cachedSales, setCachedSales] = useState([]);
  const [cachedAccounts, setCachedAccounts] = useState([]);
  const [addressCache, setAddressCache] = useState({}); // { accNo: info }
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

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

      const [items, customers, sales, accounts] = await Promise.all([
        fetchWithLog('Items', API_ENDPOINTS.ITEM_CACHE),
        fetchWithLog('Customers', API_ENDPOINTS.CUSTOMER_CACHE),
        fetchWithLog('Sales', API_ENDPOINTS.SALES_HISTORY),
        fetchWithLog('Accounts', API_ENDPOINTS.ACCOUNT_CACHE)
      ]);

      setCachedItems(items);
      setCachedCustomers(customers);
      setCachedSales(sales);
      setCachedAccounts(accounts);
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
        (item.DESCRIPTION && String(item.DESCRIPTION).toLowerCase().includes(q))
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
      isReady, 
      error, 
      searchItems, 
      searchCustomers,
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
      refreshCache: loadCache 
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
