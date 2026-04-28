import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CacheContext = createContext();

export function CacheProvider({ children }) {
  const [cachedItems, setCachedItems] = useState([]);
  const [cachedCustomers, setCachedCustomers] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const loadCache = useCallback(async () => {
    try {
      console.log('🔄 Prefetching data cache...');
      const [itemsRes, custRes] = await Promise.all([
        fetch('http://localhost:3000/api/items/cache'),
        fetch('http://localhost:3000/api/customers/cache')
      ]);

      if (!itemsRes.ok || !custRes.ok) throw new Error('Failed to fetch cache data');

      const [items, customers] = await Promise.all([
        itemsRes.json(),
        custRes.json()
      ]);

      setCachedItems(items);
      setCachedCustomers(customers);
      setIsReady(true);
      console.log(`✅ Cache ready: ${items.length} items, ${customers.length} customers.`);
    } catch (err) {
      console.error('❌ Cache prefetch failed:', err);
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
        (item.BARCODE && item.BARCODE.toLowerCase().includes(q)) || 
        (item.DESCRIPTION && item.DESCRIPTION.toLowerCase().includes(q))
      )
      .slice(0, 15); // Return top 15 results
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

  return (
    <CacheContext.Provider value={{ 
      cachedItems, 
      cachedCustomers, 
      isReady, 
      error, 
      searchItems, 
      searchCustomers,
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
