import React, { useState, useEffect } from 'react';
import { 
  Search, Save, FileText, Barcode as BarcodeIcon, Warehouse, 
  DollarSign, MapPin, Layers, Inbox, AlertCircle, RefreshCw, ClipboardList, CheckCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { API_ENDPOINTS } from '../config';

export default function OpeningStockPage() {
  const { language } = useLanguage();
  const isRtl = language === 'ar';

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsList, setItemsList] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItemCode, setSelectedItemCode] = useState(null);

  // Loaded Item Details States
  const [item, setItem] = useState(null);
  const [barcodes, setBarcodes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [unitsList, setUnitsList] = useState([]);
  
  // Custom Form Inputs
  const [invoiceNo, setInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Toast / Status banner state
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Search items list based on user query
  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setItemsList([]);
      return;
    }
    setSearching(true);
    try {
      // Use the newly created opening-stock search endpoint
      const res = await fetch(`${API_ENDPOINTS.OPENING_STOCK_SEARCH}?q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setItemsList(data);
      }
    } catch (err) {
      console.error('Search query failed:', err);
    } finally {
      setSearching(false);
    }
  };

  // Load item details from backend
  const handleSelectItem = async (itemCode) => {
    setLoading(true);
    setSelectedItemCode(itemCode);
    setItemsList([]); // Clear search list dropdown on select
    try {
      const res = await fetch(API_ENDPOINTS.OPENING_STOCK_ITEM(itemCode));
      if (res.ok) {
        const data = await res.json();
        setItem(data.item);
        setBarcodes(data.barcodes || []);
        setWarehouses(data.warehouses || []);
        setUnitsList(data.units || []);
        
        // Populate custom document details
        setInvoiceNo(data.item.DOC_NO || '');
        setRemarks('');
        showToast(isRtl ? 'تم تحميل بيانات المادة بنجاح' : 'Item details loaded successfully!');
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to load details', 'error');
      }
    } catch (err) {
      console.error('Failed to load item detail:', err);
      showToast('Error connecting to backend database', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form Value Change Handlers
  const handleItemCostChange = (val) => {
    setItem(prev => ({
      ...prev,
      COST_PRICE: parseFloat(val) || 0
    }));
  };

  const handleItemDescriptionChange = (val) => {
    setItem(prev => ({
      ...prev,
      DESCRIPTION: val
    }));
  };

  const handleItemUnitChange = (val) => {
    const matchingUnit = unitsList.find(u => String(u.Unit_id) === String(val));
    setItem(prev => ({
      ...prev,
      UNIT_CODE: val,
      Unit_Name: matchingUnit ? matchingUnit.Unit_Name : prev.Unit_Name
    }));
  };

  const handleBarcodePriceChange = (index, field, val) => {
    setBarcodes(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: parseFloat(val) || 0 };
      return copy;
    });
  };

  const handleWarehouseStockChange = (index, field, val) => {
    setWarehouses(prev => {
      const copy = [...prev];
      if (field === 'OP_STOCK') {
        copy[index] = { ...copy[index], [field]: parseFloat(val) || 0 };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  // Save changes to database transaction
  const handleSave = async () => {
    if (!item) {
      showToast(isRtl ? 'يرجى اختيار مادة أولاً' : 'Please select an item first', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        item,
        barcodes,
        warehouses,
        invoiceNo: invoiceNo || item.DOC_NO || 'OS-UPD',
        remarks
      };

      const res = await fetch(API_ENDPOINTS.OPENING_STOCK_SAVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(isRtl ? 'تم حفظ التحديثات ورصيد المستودع بنجاح!' : 'Opening stock and prices updated successfully!');
        // Reload details to get clean fresh state
        handleSelectItem(item.ITEM_CODE);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Save failed:', err);
      showToast(err.message || 'Error occurred during database save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Aggregated indicators
  const totalStock = warehouses.reduce((acc, wh) => acc + (wh.STOCK || 0), 0);
  const totalNewOpStock = warehouses.reduce((acc, wh) => acc + (parseFloat(wh.OP_STOCK) || 0), 0);

  return (
    <div className={`p-3 lg:p-4 space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${notification.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="text-xs font-black">{notification.message}</span>
        </div>
      )}

      {/* Title Header Action Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-card border border-border p-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 shrink-0">
            <ClipboardList size={22} />
          </div>
          <div>
            <h1 className="text-base lg:text-lg font-black tracking-tight text-foreground">
              {isRtl ? 'رصيد أول المدة وتحديث الأسعار' : 'Opening Stock & Price Update'}
            </h1>
            <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground">
              {isRtl 
                ? 'البحث عن مادة لتعديل تكلفة الشراء، أسعار البيع للباركودات، وأرصدة ومواقع المستودعات' 
                : 'Lookup items to adjust cost pricing, barcode selling rates, and warehouse stocks/locations'}
            </p>
          </div>
        </div>

        {item && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
            {isRtl ? 'حفظ التغييرات' : 'Save Updates'}
          </button>
        )}
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* Sidebar Panel: Item Search & Selection (col-span-1) */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-foreground tracking-wider block">
                {isRtl ? 'البحث السريع عن المادة' : 'Fast Item Search'}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder={isRtl ? 'أدخل اسم المادة، الكود، أو الباركود...' : 'Search by description, code, or barcode...'}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                />
                {searching && (
                  <RefreshCw className="absolute right-3 top-2.5 text-indigo-500 animate-spin" size={16} />
                )}
              </div>
            </div>

            {/* Live Dropdown / List Results */}
            {itemsList.length > 0 && (
              <div className="border border-border/60 bg-muted/50 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto divide-y divide-border">
                {itemsList.map((itm) => (
                  <button
                    key={itm.ITEM_CODE}
                    onClick={() => handleSelectItem(itm.ITEM_CODE)}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-foreground hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors flex flex-col gap-0.5"
                  >
                    <span className="font-extrabold">{itm.DESCRIPTION}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 font-semibold text-left">
                      <span>Code: {itm.ITEM_CODE}</span>
                      {itm.BARCODE && <span>• BC: {itm.BARCODE}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.trim() !== '' && itemsList.length === 0 && !searching && (
              <div className="text-center py-4 bg-muted/20 border border-dashed border-border rounded-xl">
                <AlertCircle size={20} className="mx-auto text-muted-foreground mb-1" />
                <p className="text-[10px] font-bold text-muted-foreground">{isRtl ? 'لا يوجد نتائج مطابقة' : 'No matching items found'}</p>
              </div>
            )}
          </div>

          {/* Quick Stats Panel (Shows when item is active) */}
          {item && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4 animate-in zoom-in-95 duration-200">
              <h2 className="text-xs font-black uppercase text-foreground tracking-wider pb-2 border-b border-border flex items-center gap-2">
                <Layers size={14} className="text-indigo-500" />
                {isRtl ? 'ملخص الكميات الحالية' : 'Current stock Summary'}
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {isRtl ? 'إجمالي المخزون الحالي' : 'Global Stock'}
                  </span>
                  <span className="text-lg font-black text-indigo-500 block mt-0.5">{totalStock}</span>
                </div>
                
                <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 text-center">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                    {isRtl ? 'إجمالي رصيد أول المدة' : 'New Opening Stock'}
                  </span>
                  <span className="text-lg font-black text-emerald-500 block mt-0.5">{totalNewOpStock}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail Sheet Section (col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 bg-card border border-border rounded-2xl shadow-sm h-[400px]">
              <RefreshCw className="animate-spin text-indigo-500 mb-3" size={32} />
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
                {isRtl ? 'جاري استدعاء السجلات من قاعدة البيانات...' : 'Fetching database registers...'}
              </p>
            </div>
          ) : !item ? (
            // Premium Placeholder state when no item loaded
            <div className="flex flex-col items-center justify-center p-12 bg-card border border-dashed border-border rounded-2xl shadow-sm text-center h-[400px]">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4 shadow-inner animate-pulse">
                <Inbox size={28} />
              </div>
              <h2 className="text-base font-black text-foreground mb-1">{isRtl ? 'لم يتم اختيار أي مادة' : 'No Item Selected'}</h2>
              <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">
                {isRtl 
                  ? 'يرجى البحث واختيار مادة من القائمة الجانبية لبدء تحديث رصيد أول المدة والتكلفة وتفاصيل الأسعار' 
                  : 'Search or choose an item from the side panel to update its purchase costs, barcode rates, and warehouse opening stocks'}
              </p>
            </div>
          ) : (
            // Full Detailed Dashboard Sheet
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Card 1: General Info & Cost adjustment */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <FileText className="text-indigo-500" size={16} />
                  <h2 className="text-xs font-black uppercase text-foreground tracking-wider">
                    {isRtl ? 'المعلومات العامة وتعديل التكلفة' : 'General Info & Cost Adjustments'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{isRtl ? 'كود المادة' : 'Item Code'}</span>
                    <div className="p-2 bg-muted rounded-lg text-xs font-extrabold text-foreground border border-border/40 select-all">
                      {item.ITEM_CODE}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-indigo-500 uppercase">{isRtl ? 'الوصف (قابل للتعديل)' : 'Description (Editable)'}</span>
                    <input
                      type="text"
                      value={item.DESCRIPTION ?? ''}
                      onChange={(e) => handleItemDescriptionChange(e.target.value)}
                      className="w-full p-2 bg-card border-2 border-indigo-500/40 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{isRtl ? 'التصنيف' : 'Category'}</span>
                    <div className="p-2 bg-muted rounded-lg text-xs font-extrabold text-foreground border border-border/40 truncate">
                      {item.ITM_CAT_NAME}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-indigo-500 uppercase">{isRtl ? 'الوحدة الرئيسية (قابل للتعديل)' : 'Primary Unit (Editable)'}</span>
                    <select
                      value={item.UNIT_CODE ?? ''}
                      onChange={(e) => handleItemUnitChange(e.target.value)}
                      className="w-full p-2 bg-card border-2 border-indigo-500/40 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground transition-all animate-in fade-in"
                    >
                      {unitsList.map(u => (
                        <option key={u.Unit_id} value={u.Unit_id}>
                          {isRtl ? (u.Unit_AName || u.Unit_Name) : u.Unit_Name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{isRtl ? 'النسبة الضريبية %' : 'VAT Percent %'}</span>
                    <div className="p-2 bg-muted rounded-lg text-xs font-extrabold text-foreground border border-border/40">
                      {item.VAT_PERCENT}% {item.PRICE_INCLUDE_VAT ? '(Inc. VAT)' : '(Ex. VAT)'}
                    </div>
                  </div>

                  {/* EDITABLE FIELD: COST PRICE */}
                  <div className="space-y-1 group">
                    <span className="text-[10px] font-extrabold text-indigo-500 uppercase flex items-center gap-1">
                      <DollarSign size={10} />
                      {isRtl ? 'سعر التكلفة (قابل للتعديل)' : 'Cost Price (Editable)'}
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={item.COST_PRICE ?? 0}
                        onChange={(e) => handleItemCostChange(e.target.value)}
                        className="w-full p-2 bg-card border-2 border-indigo-500/40 rounded-lg text-xs font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-foreground transition-all"
                      />
                    </div>
                  </div>

                  {/* EDITABLE FIELD: INVOICE NO / DOC NO */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{isRtl ? 'رقم المستند / الفاتورة' : 'Invoice No / Doc No'}</span>
                    <input
                      type="text"
                      placeholder="OS-UPD"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="w-full p-2 bg-muted border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    />
                  </div>

                  {/* EDITABLE FIELD: REMARKS */}
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{isRtl ? 'الملاحظات' : 'Remarks'}</span>
                    <input
                      type="text"
                      placeholder={isRtl ? 'أدخل ملاحظات حول تسوية الأسعار والكميات...' : 'Enter adjustments or update remarks...'}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full p-2 bg-muted border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Barcode Pricing configurations (SALE_PRICE and RETAIL_PRICE are editable) */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <BarcodeIcon className="text-indigo-500" size={16} />
                  <h2 className="text-xs font-black uppercase text-foreground tracking-wider">
                    {isRtl ? 'تسعير الباركودات المرتبطة' : 'Barcode Pricing Configurations'}
                  </h2>
                </div>

                {barcodes.length === 0 ? (
                  <div className="text-center py-6 bg-muted/20 border border-dashed border-border rounded-xl">
                    <p className="text-xs font-bold text-muted-foreground">{isRtl ? 'لا يوجد باركودات مضافة لهذه المادة' : 'No barcodes defined for this item'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full border-collapse text-left text-xs font-bold">
                      <thead>
                        <tr className="bg-muted text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider">
                          <th className="p-2.5 text-center">{isRtl ? 'الباركود' : 'Barcode'}</th>
                          <th className="p-2.5">{isRtl ? 'الوحدة' : 'Unit'}</th>
                          <th className="p-2.5 text-center">{isRtl ? 'معامل التعبئة' : 'Fraction'}</th>
                          <th className="p-2.5 text-indigo-500">{isRtl ? 'سعر الجملة / البيع (قابل للتعديل)' : 'Sale Price (Editable)'}</th>
                          <th className="p-2.5 text-indigo-500">{isRtl ? 'سعر التجزئة (قابل للتعديل)' : 'Retail Price (Editable)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card text-foreground">
                        {barcodes.map((bc, index) => (
                          <tr key={bc.BARCODE} className="hover:bg-muted/30 transition-colors">
                            <td className="p-2.5 text-center font-black text-indigo-500 font-mono select-all">{bc.BARCODE}</td>
                            <td className="p-2.5">{bc.UNIT}</td>
                            <td className="p-2.5 text-center">{bc.FRACTION}</td>
                            
                            {/* SALE_PRICE EDITABLE INPUT */}
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={bc.SALE_PRICE ?? 0}
                                onChange={(e) => handleBarcodePriceChange(index, 'SALE_PRICE', e.target.value)}
                                className="w-full px-2 py-1 bg-card border border-indigo-500/30 hover:border-indigo-500 rounded text-center text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>

                            {/* RETAIL_PRICE EDITABLE INPUT */}
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={bc.RETAIL_PRICE ?? 0}
                                onChange={(e) => handleBarcodePriceChange(index, 'RETAIL_PRICE', e.target.value)}
                                className="w-full px-2 py-1 bg-card border border-indigo-500/30 hover:border-indigo-500 rounded text-center text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Card 3: Warehouses & Stocks (OP_STOCK and LOCATION are editable) */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <Warehouse className="text-indigo-500" size={16} />
                  <h2 className="text-xs font-black uppercase text-foreground tracking-wider">
                    {isRtl ? 'أرصدة ومواقع المستودعات' : 'Warehouse Inventory Stocks & Locations'}
                  </h2>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full border-collapse text-left text-xs font-bold">
                    <thead>
                      <tr className="bg-muted text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider">
                        <th className="p-2.5 text-center">{isRtl ? 'كود المستودع' : 'WR Code'}</th>
                        <th className="p-2.5">{isRtl ? 'اسم المستودع' : 'Warehouse Name'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'المخزون الفعلي الحالي' : 'Live Physical Stock'}</th>
                        <th className="p-2.5 text-indigo-500">{isRtl ? 'رصيد أول المدة (قابل للتعديل)' : 'Opening Stock (Editable)'}</th>
                        <th className="p-2.5 text-indigo-500">{isRtl ? 'موقع الرف (قابل للتعديل)' : 'Shelf Location (Editable)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card text-foreground">
                      {warehouses.map((wh, index) => (
                        <tr key={wh.WR_CODE} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 text-center font-mono">{wh.WR_CODE}</td>
                          <td className="p-2.5 text-foreground font-black">{wh.WR_NAME}</td>
                          <td className="p-2.5 text-center text-muted-foreground font-extrabold">{wh.STOCK}</td>
                          
                          {/* OP_STOCK EDITABLE INPUT */}
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={wh.OP_STOCK ?? 0}
                              onChange={(e) => handleWarehouseStockChange(index, 'OP_STOCK', e.target.value)}
                              className="w-full px-2 py-1 bg-card border border-indigo-500/30 hover:border-indigo-500 rounded text-center text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          {/* LOCATION EDITABLE INPUT */}
                          <td className="p-2">
                            <div className="relative">
                              <MapPin className="absolute left-1.5 top-2 text-indigo-500/50" size={12} />
                              <input
                                type="text"
                                placeholder={isRtl ? 'أدخل الموقع (مثال A-12)' : 'Shelf position (e.g. A-12)'}
                                value={wh.LOCATION ?? ''}
                                onChange={(e) => handleWarehouseStockChange(index, 'LOCATION', e.target.value)}
                                className="w-full pl-6 pr-2 py-1 bg-card border border-indigo-500/30 hover:border-indigo-500 rounded text-xs font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
