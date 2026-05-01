const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/api/health`,
  ITEM_SEARCH: `${API_BASE_URL}/api/items/search`,
  ITEM_CACHE: `${API_BASE_URL}/api/items/cache`,
  CUSTOMER_SEARCH: `${API_BASE_URL}/api/customers/search`,
  CUSTOMER_CACHE: `${API_BASE_URL}/api/customers/cache`,
  CUSTOMER_BY_ID: (id) => `${API_BASE_URL}/api/customers/${id}`,
  CUSTOMER_INFO: (accNo) => `${API_BASE_URL}/api/customers/${accNo}/info`,
  ACCOUNT_CACHE: `${API_BASE_URL}/api/accounts/cache`,
  ACCOUNT_LIST: `${API_BASE_URL}/api/accounts/list`,
  ACCOUNT_ALL: `${API_BASE_URL}/api/accounts/all`,
  ACCOUNT_CLASSES: `${API_BASE_URL}/api/accounts/classes`,
  ACCOUNT_SUBCLASSES: (classCode) => `${API_BASE_URL}/api/accounts/subclasses?classCode=${classCode}`,
  ACCOUNT_CREATE: `${API_BASE_URL}/api/accounts/create`,
  INVOICE_NEXT: `${API_BASE_URL}/api/invoice/next`,
  SALES_SAVE: `${API_BASE_URL}/api/sales/save`,
  SALES_HISTORY: `${API_BASE_URL}/api/sales`,
  SALE_ITEMS: (recNo) => `${API_BASE_URL}/api/sales/${recNo}/items`,
  WAREHOUSE_LIST: `${API_BASE_URL}/api/warehouses/list`,
};

export default API_BASE_URL;
