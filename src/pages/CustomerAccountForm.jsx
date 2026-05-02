import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Building, Phone, Mail, FileText, Banknote, CreditCard, Hash, MapPin, Globe } from 'lucide-react';
import { API_ENDPOINTS } from '../config';

export default function CustomerAccountForm({ setActivePage, params = {} }) {
  const [loading, setLoading] = useState(false);
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [formData, setFormData] = useState({
    ACC_NO: params.id || '',
    ACC_NAME: '',
    ACC_ANAME: '',
    ACC_TELE_NO: '',
    ACC_MOBILE_NO: '',
    ACC_FAX_NO: '',
    ACC_ADDRESS: '',
    CREDIT_LIMIT: 0,
    CONTACT_PERSON: '',
    ID_NUMBER: '',
    FLAG: 'A',
    EMAIL: '',
    SEND_SMS: false,
    IBAN_NO: '',
    BANK_DET: '',
    VAT_Tinno: '',
    CREDIT_DAYS: 0,
    building_no: '',
    city_subdivision_name: '',
    street_name: '',
    Schema_no: '',
    city_name: '',
    city_aname: '',
    postal_zone: '',
    regsitered_name: '',
    LEDGER_ACC: '',
    IS_PERMINENT: false
  });

  useEffect(() => {
    // Fetch policy & ledger accounts
    fetch(API_ENDPOINTS.CUSTOMER_POLICY)
      .then(res => res.json())
      .then(policy => {
        if (policy.cus_ac_type) {
          return fetch(API_ENDPOINTS.ACCOUNT_LIST_BY_PARENT('3', policy.cus_ac_type));
        }
        return [];
      })
      .then(res => (res.json ? res.json() : res))
      .then(data => {
        setLedgerAccounts(data.map ? data : []);
      })
      .catch(err => console.error("Policy/Ledger fetch error:", err));

    if (params.id) {
      setLoading(true);
      fetch(`${API_ENDPOINTS.CUSTOMER_INFO(params.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setFormData(prev => ({
              ...prev,
              ...data,
              SEND_SMS: data.SEND_SMS === 1 || data.SEND_SMS === true,
              IS_PERMINENT: data.IS_PERMINENT === 1 || data.IS_PERMINENT === true
            }));
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load customer info:", err);
          setLoading(false);
        });
    }
  }, [params.id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    if (!formData.LEDGER_ACC) {
      alert("Ledger Account is mandatory. Please select one.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.CUSTOMER_INFO(formData.ACC_NO)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Customer saved successfully!');
        setActivePage('customers-accounts');
      } else {
        const err = await res.json();
        alert('Error saving customer: ' + (err.error || err.details));
      }
    } catch (err) {
      console.error(err);
      alert('Network error while saving');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1 h-full relative">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setActivePage('customers-accounts')}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter uppercase">
              {params.id ? 'Edit Customer Account' : 'New Customer Account'}
            </h1>
            <p className="text-zinc-500 text-sm font-medium">Fill in the customer information details.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg"
          >
            <Save size={18} strokeWidth={3} />
            {loading ? 'SAVING...' : 'SAVE CUSTOMER'}
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                <User size={16} /> Basic Identity
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Account No *</label>
                <input name="ACC_NO" value={formData.ACC_NO} onChange={handleChange} placeholder="Auto-generated if empty" className="input-class bg-zinc-100 dark:bg-zinc-900 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Customer Name (En) *</label>
                <input name="ACC_NAME" value={formData.ACC_NAME} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Customer Name (Ar)</label>
                <input name="ACC_ANAME" value={formData.ACC_ANAME} onChange={handleChange} dir="rtl" className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-arabic" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-rose-500">Ledger Account *</label>
                <select name="LEDGER_ACC" value={formData.LEDGER_ACC} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-rose-200 dark:border-rose-900/30 rounded-lg px-3 py-2 text-sm focus:ring-rose-500/20">
                  <option value="">-- Select Ledger Account --</option>
                  {ledgerAccounts.map(la => (
                    <option key={la.acc_no || la.ACC_NO} value={la.acc_no || la.ACC_NO}>
                      {la.acc_no || la.ACC_NO} - {la.acc_name || la.ACC_NAME}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Registered Name</label>
                <input name="regsitered_name" value={formData.regsitered_name} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Contact Person</label>
                <input name="CONTACT_PERSON" value={formData.CONTACT_PERSON} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Comm & Meta */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                <Phone size={16} /> Contact & Tax
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Mobile No</label>
                <input name="ACC_MOBILE_NO" value={formData.ACC_MOBILE_NO} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Telephone No</label>
                <input name="ACC_TELE_NO" value={formData.ACC_TELE_NO} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Email</label>
                <input name="EMAIL" type="email" value={formData.EMAIL} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-3 mt-4 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="SEND_SMS" checked={formData.SEND_SMS} onChange={handleChange} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Enable SMS Notifications</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="IS_PERMINENT" checked={formData.IS_PERMINENT} onChange={handleChange} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Is Permanent Account</label>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">VAT TIN No</label>
                <input name="VAT_Tinno" value={formData.VAT_Tinno} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">National ID / CR</label>
                <input name="ID_NUMBER" value={formData.ID_NUMBER} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Financial Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
                <Banknote size={16} /> Financials
              </h3>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Credit Limit</label>
                <input name="CREDIT_LIMIT" type="number" value={formData.CREDIT_LIMIT} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Credit Days</label>
                <input name="CREDIT_DAYS" type="number" value={formData.CREDIT_DAYS} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">IBAN No</label>
                <input name="IBAN_NO" value={formData.IBAN_NO} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-500">Bank Details</label>
                <input name="BANK_DET" value={formData.BANK_DET} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Address Details */}
            <div className="space-y-4 md:col-span-2 lg:col-span-3">
              <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2 mt-4">
                <MapPin size={16} /> National Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-[10px] uppercase font-black text-zinc-500">General Address</label>
                  <input name="ACC_ADDRESS" value={formData.ACC_ADDRESS} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Building No</label>
                  <input name="building_no" value={formData.building_no} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Street Name</label>
                  <input name="street_name" value={formData.street_name} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">District (Subdivision)</label>
                  <input name="city_subdivision_name" value={formData.city_subdivision_name} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">City Name</label>
                  <input name="city_name" value={formData.city_name} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">City Name (Ar)</label>
                  <input name="city_aname" value={formData.city_aname} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm font-arabic" dir="rtl" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Postal Zone</label>
                  <input name="postal_zone" value={formData.postal_zone} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-500">Schema No</label>
                  <input name="Schema_no" value={formData.Schema_no} onChange={handleChange} className="input-class bg-white dark:bg-zinc-800 border border-border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
