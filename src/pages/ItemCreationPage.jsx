import React, { useState, useEffect } from 'react';
import { 
  Plus, Save, Search, FileText, Image as ImageIcon, Barcode as BarcodeIcon, 
  Warehouse, DollarSign, List, Shield, HelpCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { API_ENDPOINTS } from '../config';

export default function ItemCreationPage() {
  const { language, t } = useLanguage();
  const isRtl = language === 'ar';

  // State Lists / Dropdowns
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [warehousesList, setWarehousesList] = useState([]);

  // Search & Navigation Lists
  const [itemsList, setItemsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemCode, setSelectedItemCode] = useState(null);

  // Form State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('barcodes'); // barcodes, warehouses, costs

  // Form Objects
  const [item, setItem] = useState({
    ITEM_CODE: '',
    ITEM_NAME: '',
    ITEM_ANAME: '',
    ITM_CAT_CODE: '',
    Unit_ID: '',
    QTY_IN_UNIT: 1,
    PART_NO: '',
    BRAND: '',
    ALIAS_NAME: '',
    VAT_PERCENT: 15,
    BARCODE: '',
    PRICE_INCLUDE_VAT: false,
    TAX_CATAGORY: '',
    non_stock_itm: false,
    ITEM_type: '',
    Remarks: ''
  });

  const [barcodes, setBarcodes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stockMaster, setStockMaster] = useState({
    LAST_PUR_PRICE: 0,
    AVG_PUR_PRICE: 0,
    AVG_EXPENSE_AMT: 0,
    PROFIT: 0,
    R_MIN_PROFIT: 0,
    W_MIN_PROFIT: 0,
    W_MIN_PC: 0,
    SALES_PROFIT_PCNT: 0
  });
  const [photo, setPhoto] = useState(null); // base64 representation
  const [photoPreview, setPhotoPreview] = useState(null);

  const [notification, setNotification] = useState(null);

  // Show Toast Notification
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Dependencies & Items List
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { 'Accept': 'application/json' };
      
      // Fetch Dependencies
      const depRes = await fetch(API_ENDPOINTS.ITEMS_DEPENDENCIES, { headers });
      const depData = await depRes.json();
      if (depRes.ok) {
        setCategories(depData.categories || []);
        setUnits(depData.units || []);
        setItemTypes(depData.itemTypes || []);
        setWarehousesList(depData.warehouses || []);
      }

      // Fetch Items list
      const itemsRes = await fetch(API_ENDPOINTS.ITEMS_LIST, { headers });
      const itemsData = await itemsRes.json();
      if (itemsRes.ok) {
        setItemsList(itemsData || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading page data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Set default state for a NEW Item
  const handleNewItem = () => {
    setSelectedItemCode(null);
    const defaultUnitId = units.length > 0 ? units[0].Unit_id : '';
    const defaultUnitQty = units.length > 0 ? units[0].QTY : 1;
    
    setItem({
      ITEM_CODE: '',
      ITEM_NAME: '',
      ITEM_ANAME: '',
      ITM_CAT_CODE: categories.length > 0 ? categories[0].ITM_CAT_CODE : '',
      Unit_ID: defaultUnitId,
      QTY_IN_UNIT: defaultUnitQty,
      PART_NO: '',
      BRAND: '',
      ALIAS_NAME: '',
      VAT_PERCENT: categories.length > 0 ? (categories[0].VAT_PERCENT || 15) : 15,
      BARCODE: '',
      PRICE_INCLUDE_VAT: false,
      TAX_CATAGORY: '',
      non_stock_itm: false,
      ITEM_type: itemTypes.length > 0 ? itemTypes[0].ITM_TYPE_CODE : '',
      Remarks: ''
    });

    setBarcodes([]);
    
    // Initialize Warehouse List
    const defaultWarehouses = warehousesList.map(wh => ({
      WR_CODE: wh.WR_CODE,
      WAREHOUSE_NAME: wh.WAREHOUSE_NAME,
      WAREHOUSE_ANAME: wh.WAREHOUSE_ANAME,
      OP_STOCK: 0,
      STOCK: 0,
      LOCATION: ''
    }));
    setWarehouses(defaultWarehouses);

    setStockMaster({
      LAST_PUR_PRICE: 0,
      AVG_PUR_PRICE: 0,
      AVG_EXPENSE_AMT: 0,
      PROFIT: 0,
      R_MIN_PROFIT: 0,
      W_MIN_PROFIT: 0,
      W_MIN_PC: 0,
      SALES_PROFIT_PCNT: 0
    });
    setPhoto(null);
    setPhotoPreview(null);
  };

  // Trigger default setup when dropdown lists load
  useEffect(() => {
    if (!selectedItemCode && (categories.length > 0 || units.length > 0 || warehousesList.length > 0)) {
      handleNewItem();
    }
  }, [categories, units, warehousesList]);

  // Load Single Selected Item Details
  const handleSelectItem = async (itemCode) => {
    setLoading(true);
    setSelectedItemCode(itemCode);
    try {
      const res = await fetch(API_ENDPOINTS.ITEMS_DETAIL(itemCode));
      if (!res.ok) throw new Error('Item details not found');
      const data = await res.json();
      
      // Load general
      setItem({
        ITEM_CODE: data.item.ITEM_CODE,
        ITEM_NAME: data.item.ITEM_NAME,
        ITEM_ANAME: data.item.ITEM_ANAME || '',
        ITM_CAT_CODE: data.item.ITM_CAT_CODE || '',
        Unit_ID: data.item.Unit_ID || '',
        QTY_IN_UNIT: data.item.QTY_IN_UNIT || 1,
        PART_NO: data.item.PART_NO || '',
        BRAND: data.item.BRAND || '',
        ALIAS_NAME: data.item.ALIAS_NAME || '',
        VAT_PERCENT: data.item.VAT_PERCENT !== null ? data.item.VAT_PERCENT : 15,
        BARCODE: data.item.BARCODE || '',
        PRICE_INCLUDE_VAT: !!data.item.PRICE_INCLUDE_VAT,
        TAX_CATAGORY: data.item.TAX_CATAGORY || '',
        non_stock_itm: !!data.item.non_stock_itm,
        ITEM_type: data.item.ITEM_type || '',
        Remarks: data.item.Remarks || ''
      });

      // Load barcodes list
      setBarcodes(data.barcodes || []);

      // Load warehouse list
      const loadedWHIds = (data.warehouses || []).map(w => w.WR_CODE);
      const remainingWH = warehousesList
        .filter(w => !loadedWHIds.includes(w.WR_CODE))
        .map(w => ({
          WR_CODE: w.WR_CODE,
          WAREHOUSE_NAME: w.WAREHOUSE_NAME,
          WAREHOUSE_ANAME: w.WAREHOUSE_ANAME,
          OP_STOCK: 0,
          STOCK: 0,
          LOCATION: ''
        }));
      setWarehouses([...(data.warehouses || []), ...remainingWH]);

      // Load cost section
      if (data.stockMaster) {
        setStockMaster(data.stockMaster);
      } else {
        setStockMaster({
          LAST_PUR_PRICE: 0,
          AVG_PUR_PRICE: 0,
          AVG_EXPENSE_AMT: 0,
          PROFIT: 0,
          R_MIN_PROFIT: 0,
          W_MIN_PROFIT: 0,
          W_MIN_PC: 0,
          SALES_PROFIT_PCNT: 0
        });
      }

      // Load Image representation
      if (data.photo) {
        setPhoto(data.photo);
        setPhotoPreview(`data:image/jpeg;base64,${data.photo}`);
      } else {
        setPhoto(null);
        setPhotoPreview(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Error fetching item detail', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Change Field Handler
  const handleItemFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setItem(prev => {
      const updated = { ...prev, [name]: val };
      
      // Auto-set VAT when Category changes
      if (name === 'ITM_CAT_CODE') {
        const cat = categories.find(c => String(c.ITM_CAT_CODE) === String(value));
        if (cat) {
          updated.VAT_PERCENT = cat.VAT_PERCENT !== null ? cat.VAT_PERCENT : 15;
        }
      }

      // Auto-set Fraction when Unit ID changes
      if (name === 'Unit_ID') {
        const unit = units.find(u => String(u.Unit_id) === String(value));
        if (unit) {
          updated.QTY_IN_UNIT = unit.QTY !== null ? unit.QTY : 1;
        }
      }

      return updated;
    });
  };

  // Multiple Barcodes Handler
  const handleAddBarcodeRow = () => {
    // By default, choose second unit record if available
    let defaultUnitId = '';
    let defaultQty = 1;
    if (units.length > 1) {
      defaultUnitId = units[1].Unit_id;
      defaultQty = units[1].QTY;
    } else if (units.length > 0) {
      defaultUnitId = units[0].Unit_id;
      defaultQty = units[0].QTY;
    }

    setBarcodes(prev => [
      ...prev,
      {
        BARCODE: '',
        Unit_Id: defaultUnitId,
        QTY_IN_UNIT: defaultQty,
        WHOLESALE_PRICE: 0,
        RETAIL_PRICE: 0,
        MAIN_ID: false,
        ITEM_NAME: item.ITEM_NAME,
        ITEM_ANAME: item.ITEM_ANAME
      }
    ]);
  };

  const handleBarcodeFieldChange = (index, name, value) => {
    setBarcodes(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      
      // Update QTY_IN_UNIT when Unit_Id changes
      if (name === 'Unit_Id') {
        const selectedUnit = units.find(u => String(u.Unit_id) === String(value));
        if (selectedUnit) {
          copy[index].QTY_IN_UNIT = selectedUnit.QTY || 1;
        }
      }
      return copy;
    });
  };

  const handleDeleteBarcodeRow = (index) => {
    setBarcodes(prev => prev.filter((_, i) => i !== index));
  };

  // Warehouse Stocks Handler
  const handleWarehouseFieldChange = (index, name, value) => {
    setWarehouses(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [name]: value };
      return copy;
    });
  };

  // Stock Master Costs Fields Handler
  const handleCostFieldChange = (e) => {
    const { name, value } = e.target;
    setStockMaster(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  // Live Aggregates
  const totalOpStock = warehouses.reduce((acc, wh) => acc + (parseFloat(wh.OP_STOCK) || 0), 0);
  const totalStockVal = warehouses.reduce((acc, wh) => acc + (parseFloat(wh.STOCK) || 0), 0);

  // Image Upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setPhoto(base64String);
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  // POST Form Save Transaction Handler
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!item.ITEM_CODE.trim()) {
      showToast('Item Code is required', 'error');
      return;
    }
    if (!item.ITEM_NAME.trim()) {
      showToast('Description is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        item,
        barcodes,
        warehouses,
        stockMaster: {
          ...stockMaster,
          OP_STOCK: totalOpStock,
          STOCK: totalStockVal
        },
        photo: photo || null
      };

      const res = await fetch(API_ENDPOINTS.ITEMS_SAVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.ok) {
        showToast('Item transaction saved successfully!');
        fetchAllData(); // refresh list
        setSelectedItemCode(item.ITEM_CODE);
      } else {
        throw new Error(resData.details || resData.error || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      showToast(`Save Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter Items Search list
  const filteredItems = itemsList.filter(itm => 
    String(itm.ITEM_CODE).toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(itm.ITEM_NAME).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (itm.ITEM_ANAME && String(itm.ITEM_ANAME).toLowerCase().includes(searchQuery.toLowerCase())) ||
    (itm.BARCODE && String(itm.BARCODE).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`p-2 lg:p-3.5 space-y-3.5 ${isRtl ? 'text-right' : 'text-left'}`}>
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          <AlertCircle size={20} />
          <span className="text-xs font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-foreground">{selectedItemCode ? 'Edit Item / تعديل مادة' : 'New Item Master Setup / كرت مادة جديد'}</h1>
            <p className="text-[10px] font-semibold text-muted-foreground">Manage centralized inventory masters, multi-barcodes, and warehouse operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleNewItem}
            className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white px-3.5 py-1.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider"
          >
            <Plus size={14} />
            {isRtl ? 'مادة جديدة' : 'New Item'}
          </button>
          <button
            onClick={handleSaveItem}
            disabled={saving}
            className="flex items-center gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 px-4 py-1.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider shadow-md shadow-indigo-600/10"
          >
            {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            {isRtl ? 'حفظ التعديلات' : 'Save Transaction'}
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3.5">
        
        {/* Sidebar Browser Selection (Left 1 Col) */}
        <div className="xl:col-span-1 bg-card border border-border rounded-2xl p-2.5 flex flex-col h-[600px] shadow-sm">
          <div className="relative mb-2.5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder={isRtl ? 'بحث في المواد...' : 'Search items master...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
                <RefreshCw className="animate-spin" size={20} />
                <span className="text-xs font-bold">Querying items database...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-xs font-bold">No master items found</p>
              </div>
            ) : (
              filteredItems.map((itm) => (
                <button
                  key={itm.ITEM_CODE}
                  onClick={() => handleSelectItem(itm.ITEM_CODE)}
                  className={`w-full text-left p-2 rounded-xl border transition-all flex flex-col gap-0.5 ${selectedItemCode === itm.ITEM_CODE ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15' : 'bg-muted/50 border-border hover:bg-muted text-foreground'}`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-black tracking-mono uppercase">{itm.ITEM_CODE}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedItemCode === itm.ITEM_CODE ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                      VAT {itm.VAT_PERCENT}%
                    </span>
                  </div>
                  <span className="text-xs font-black truncate">{isRtl && itm.ITEM_ANAME ? itm.ITEM_ANAME : itm.ITEM_NAME}</span>
                  {itm.BARCODE && (
                    <span className={`text-[9px] font-bold tracking-tight truncate ${selectedItemCode === itm.ITEM_CODE ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                      Barcode: {itm.BARCODE}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Master Form Entry Panel (Right 3 Cols) */}
        <div className="xl:col-span-3 space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5">

            {/* General Information Form (Left 3 sub-cols) */}
            <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-3.5 space-y-3 shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border pb-2">
                <FileText className="text-indigo-500" size={16} />
                <h2 className="text-xs font-black uppercase tracking-wider text-foreground">{isRtl ? 'المعلومات العامة للمادة' : 'General Product Information'}</h2>
              </div>

              <div className="grid grid-cols-6 gap-2.5">
                
                {/* Item Code */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Item Code / رمز المادة</label>
                  <input
                    type="text"
                    name="ITEM_CODE"
                    value={item.ITEM_CODE}
                    disabled={!!selectedItemCode}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 text-foreground"
                    placeholder="E.g., ITM-101"
                  />
                </div>

                {/* Primary Barcode */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Primary Barcode / الباركود الأساسي</label>
                  <input
                    type="text"
                    name="BARCODE"
                    value={item.BARCODE}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="Enter main barcode"
                  />
                </div>

                {/* Category Dropdown */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Category / المجموعة</label>
                  <select
                    name="ITM_CAT_CODE"
                    value={item.ITM_CAT_CODE}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.ITM_CAT_CODE} value={cat.ITM_CAT_CODE}>
                        {isRtl && cat.ITM_CAT_ANAME ? cat.ITM_CAT_ANAME : cat.ITM_CAT_NAME}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description (EN) */}
                <div className="col-span-6 md:col-span-3 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description / الوصف</label>
                  <input
                    type="text"
                    name="ITEM_NAME"
                    value={item.ITEM_NAME}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="Enter product description"
                  />
                </div>

                {/* Arabic Description */}
                <div className="col-span-6 md:col-span-3 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Arabic Description / الوصف العربي</label>
                  <input
                    type="text"
                    name="ITEM_ANAME"
                    value={item.ITEM_ANAME}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground text-right"
                    placeholder="أدخل الوصف باللغة العربية"
                  />
                </div>

                {/* Base Unit Dropdown */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Base Unit / الوحدة الأساسية</label>
                  <select
                    name="Unit_ID"
                    value={item.Unit_ID}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    <option value="">Select Unit</option>
                    {units.map(u => (
                      <option key={u.Unit_id} value={u.Unit_id}>
                        {isRtl && u.Unit_AName ? u.Unit_AName : u.Unit_Name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Item Type Dropdown */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Item Type / نوع المادة</label>
                  <select
                    name="ITEM_type"
                    value={item.ITEM_type}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  >
                    <option value="">Select Type</option>
                    {itemTypes.map(t => (
                      <option key={t.ITM_TYPE_CODE} value={t.ITM_TYPE_CODE}>
                        {isRtl && t.ITM_TYPE_ANAME ? t.ITM_TYPE_ANAME : t.ITM_TYPE_NAME}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Qty in Unit (Fraction) */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Fraction (Qty In Unit) / التعبئة</label>
                  <input
                    type="number"
                    step="any"
                    name="QTY_IN_UNIT"
                    value={item.QTY_IN_UNIT}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  />
                </div>

                {/* Brand */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Brand / الماركة</label>
                  <input
                    type="text"
                    name="BRAND"
                    value={item.BRAND}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="E.g., Samsung"
                  />
                </div>

                {/* Part No */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Part No / رقم القطعة</label>
                  <input
                    type="text"
                    name="PART_NO"
                    value={item.PART_NO}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="Enter part number"
                  />
                </div>

                {/* Alias Name */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Alias Name / الاسم الرديف</label>
                  <input
                    type="text"
                    name="ALIAS_NAME"
                    value={item.ALIAS_NAME}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="Alternative name"
                  />
                </div>

                {/* VAT Percent */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">VAT % / نسبة الضريبة</label>
                  <input
                    type="number"
                    step="any"
                    name="VAT_PERCENT"
                    value={item.VAT_PERCENT}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                  />
                </div>

                {/* Tax Category */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tax Category / فئة الضريبة</label>
                  <input
                    type="number"
                    name="TAX_CATAGORY"
                    value={item.TAX_CATAGORY}
                    onChange={handleItemFieldChange}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="Tax group param"
                  />
                </div>

                {/* Flags Checkbox Panel */}
                <div className="col-span-6 sm:col-span-3 md:col-span-2 flex flex-col gap-1.5 justify-center pt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="PRICE_INCLUDE_VAT"
                      checked={item.PRICE_INCLUDE_VAT}
                      onChange={handleItemFieldChange}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500/20 w-4 h-4"
                    />
                    <span className="text-[11px] font-bold text-foreground">Price Includes VAT / شامل الضريبة</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="non_stock_itm"
                      checked={item.non_stock_itm}
                      onChange={handleItemFieldChange}
                      className="rounded border-border text-indigo-600 focus:ring-indigo-500/20 w-4 h-4"
                    />
                    <span className="text-[11px] font-bold text-foreground">Non Stock / مادة خدمية غير مخزنية</span>
                  </label>
                </div>

                {/* Remarks */}
                <div className="col-span-6 space-y-0.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Remarks / الملاحظات</label>
                  <textarea
                    name="Remarks"
                    value={item.Remarks}
                    onChange={handleItemFieldChange}
                    rows="1"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    placeholder="Enter additional description details..."
                  />
                </div>

              </div>
            </div>

            {/* Item Image Panel (Right 1 sub-col) */}
            <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-3 flex flex-col items-center justify-between space-y-2.5 shadow-sm h-full">
              <div className="w-full flex items-center gap-1.5 border-b border-border pb-2">
                <ImageIcon className="text-indigo-500" size={16} />
                <h2 className="text-xs font-black uppercase tracking-wider text-foreground">{isRtl ? 'صورة المادة' : 'Product Photo'}</h2>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-border rounded-xl p-2 bg-muted/30 relative">
                {photoPreview ? (
                  <>
                    <img 
                      src={photoPreview} 
                      alt="Item master graphic" 
                      className="max-h-[110px] w-auto object-contain rounded-lg"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-1.5 right-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-[9px] font-black px-2 py-0.5 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <div className="text-center space-y-1">
                    <ImageIcon className="mx-auto text-muted-foreground opacity-40" size={32} />
                    <p className="text-[10px] font-bold text-muted-foreground">No image</p>
                  </div>
                )}
              </div>

              <div className="w-full text-center">
                <label className="inline-block bg-indigo-500/10 text-indigo-500 hover:bg-indigo-50 cursor-pointer px-3 py-1.5 rounded-xl text-[10px] font-black transition-colors uppercase tracking-wider w-full text-center">
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[9px] font-bold text-muted-foreground mt-1">PNG/JPG. Max 2MB</p>
              </div>
            </div>

          </div>

          {/* Sub Tables / Information Tabs Section */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            
            {/* Tabs Header */}
            <div className="flex border-b border-border bg-muted/35">
              <button
                type="button"
                onClick={() => setActiveTab('barcodes')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'barcodes' ? 'border-indigo-600 text-indigo-600 bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <BarcodeIcon size={14} />
                {isRtl ? 'متعدد الباركود' : 'Multi Barcodes'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('warehouses')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'warehouses' ? 'border-indigo-600 text-indigo-600 bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <Warehouse size={14} />
                {isRtl ? 'مخزون المستودعات' : 'Warehouses Stock'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('costs')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'costs' ? 'border-indigo-600 text-indigo-600 bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                <DollarSign size={14} />
                {isRtl ? 'الأرباح والتكاليف الإجمالية' : 'Totals & Cost Margins'}
              </button>
            </div>

            {/* Tab Panels */}
            <div className="p-3.5">

              {/* 1. Barcodes Tab */}
              {activeTab === 'barcodes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BarcodeIcon className="text-indigo-500" size={16} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Multiple barcodes distribution with packing factors</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBarcodeRow}
                      className="flex items-center gap-1 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white px-2.5 py-1 rounded-lg font-black text-[9px] transition-all uppercase tracking-wider"
                    >
                      <Plus size={10} />
                      Add Row
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-black uppercase text-[9px]">
                        <tr>
                          <th className="p-2">Barcode</th>
                          <th className="p-2">Unit Name</th>
                          <th className="p-2 text-center">Packing Qty</th>
                          <th className="p-2">Wholesale Price</th>
                          <th className="p-2">Retail Price</th>
                          <th className="p-2 text-center">Is Main</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-bold">
                        {barcodes.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-6 text-muted-foreground font-bold">
                              No alternative barcodes configured
                            </td>
                          </tr>
                        ) : (
                          barcodes.map((bc, index) => (
                            <tr key={index} className="hover:bg-muted/30">
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={bc.BARCODE}
                                  onChange={(e) => handleBarcodeFieldChange(index, 'BARCODE', e.target.value)}
                                  className="w-full px-2 py-1 rounded-md bg-muted border border-border text-xs font-black text-foreground"
                                  placeholder="E.g., 62810..."
                                />
                              </td>
                              <td className="p-1.5 w-40">
                                <select
                                  value={bc.Unit_Id}
                                  onChange={(e) => handleBarcodeFieldChange(index, 'Unit_Id', e.target.value)}
                                  className="w-full px-2 py-1 rounded-md bg-muted border border-border text-xs font-bold text-foreground"
                                >
                                  {units.map(u => (
                                    <option key={u.Unit_id} value={u.Unit_id}>
                                      {isRtl && u.Unit_AName ? u.Unit_AName : u.Unit_Name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5 text-center w-24 font-black">
                                {bc.QTY_IN_UNIT}
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={bc.WHOLESALE_PRICE}
                                  onChange={(e) => handleBarcodeFieldChange(index, 'WHOLESALE_PRICE', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 rounded-md bg-muted border border-border text-xs font-black text-foreground"
                                />
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  value={bc.RETAIL_PRICE}
                                  onChange={(e) => handleBarcodeFieldChange(index, 'RETAIL_PRICE', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 rounded-md bg-muted border border-border text-xs font-black text-foreground"
                                />
                              </td>
                              <td className="p-1.5 text-center w-16">
                                <input
                                  type="checkbox"
                                  checked={!!bc.MAIN_ID}
                                  onChange={(e) => handleBarcodeFieldChange(index, 'MAIN_ID', e.target.checked)}
                                  className="rounded border-border text-indigo-600 w-3.5 h-3.5"
                                />
                              </td>
                              <td className="p-1.5 text-center w-16">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBarcodeRow(index)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 px-2 py-1 rounded-md transition-all text-[10px]"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Warehouses Stock Tab */}
              {activeTab === 'warehouses' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Warehouse className="text-indigo-500" size={16} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Stock distribution and location indices per warehouse branch</span>
                  </div>

                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted text-muted-foreground font-black uppercase text-[9px]">
                        <tr>
                          <th className="p-2.5">Warehouse Name / اسم المستودع</th>
                          <th className="p-2.5">Location / الرف - الموضع</th>
                          <th className="p-2.5 text-right">Opening Stock / الرصيد الافتتاحي</th>
                          <th className="p-2.5 text-right">Current Live Stock / الرصيد الحالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-bold">
                        {warehouses.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-6 text-muted-foreground font-bold">
                              No warehouse configurations available
                            </td>
                          </tr>
                        ) : (
                          warehouses.map((wh, index) => (
                            <tr key={wh.WR_CODE} className="hover:bg-muted/30">
                              <td className="p-2 font-black text-foreground">
                                {isRtl && wh.WAREHOUSE_ANAME ? wh.WAREHOUSE_ANAME : wh.WAREHOUSE_NAME}
                              </td>
                              <td className="p-1.5">
                                <input
                                  type="text"
                                  value={wh.LOCATION || ''}
                                  onChange={(e) => handleWarehouseFieldChange(index, 'LOCATION', e.target.value)}
                                  className="w-full px-2 py-1 rounded-md bg-muted border border-border text-xs font-black text-foreground"
                                  placeholder="E.g., Shelf 4-A"
                                />
                              </td>
                              <td className="p-1.5 w-40 text-right">
                                <input
                                  type="number"
                                  step="any"
                                  value={wh.OP_STOCK}
                                  onChange={(e) => handleWarehouseFieldChange(index, 'OP_STOCK', parseFloat(e.target.value) || 0)}
                                  className="w-28 px-2 py-1 rounded-md bg-muted border border-border text-xs font-black text-foreground text-right"
                                />
                              </td>
                              <td className="p-2 text-right w-40 font-black text-indigo-500 bg-indigo-500/5">
                                {wh.STOCK || 0}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Totals & Cost margins Tab */}
              {activeTab === 'costs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    
                    {/* Stock Aggregates Read-only box */}
                    <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 border border-border p-3 rounded-xl">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Aggregated Opening Stock (Sum) / مجموع الرصيد الافتتاحي</span>
                        <div className="px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black text-foreground">
                          {totalOpStock}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Aggregated Current Stock (Sum) / مجموع الرصيد الحالي</span>
                        <div className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-500">
                          {totalStockVal}
                        </div>
                      </div>
                    </div>

                    {/* Cost Prices Inputs */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Last Purchase / آخر سعر شراء</label>
                      <input
                        type="number"
                        step="any"
                        name="LAST_PUR_PRICE"
                        value={stockMaster.LAST_PUR_PRICE}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Average Purchase / متوسط سعر الشراء</label>
                      <input
                        type="number"
                        step="any"
                        name="AVG_PUR_PRICE"
                        value={stockMaster.AVG_PUR_PRICE}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Average Expense / متوسط المصاريف مضافة</label>
                      <input
                        type="number"
                        step="any"
                        name="AVG_EXPENSE_AMT"
                        value={stockMaster.AVG_EXPENSE_AMT}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    {/* Margins Profit Inputs */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Profit Value / قيمة الربح</label>
                      <input
                        type="number"
                        step="any"
                        name="PROFIT"
                        value={stockMaster.PROFIT}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Retail Min Profit / أدنى ربح تجزئة</label>
                      <input
                        type="number"
                        step="any"
                        name="R_MIN_PROFIT"
                        value={stockMaster.R_MIN_PROFIT}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Wholesale Min Profit / أدنى ربح جملة</label>
                      <input
                        type="number"
                        step="any"
                        name="W_MIN_PROFIT"
                        value={stockMaster.W_MIN_PROFIT}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Wholesale Min % / أدنى ربح جملة %</label>
                      <input
                        type="number"
                        step="any"
                        name="W_MIN_PC"
                        value={stockMaster.W_MIN_PC}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Sales Profit % / نسبة ربح المبيعات %</label>
                      <input
                        type="number"
                        step="any"
                        name="SALES_PROFIT_PCNT"
                        value={stockMaster.SALES_PROFIT_PCNT}
                        onChange={handleCostFieldChange}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-muted border border-border text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                      />
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
