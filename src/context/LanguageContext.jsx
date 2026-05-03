import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { translations as defaultTranslations } from '../translations';
import { API_ENDPOINTS } from '../config';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });
  
  const [customTranslations, setCustomTranslations] = useState({ en: {}, ar: {} });

  const fetchCustomTranslations = useCallback(async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/translations`);
      if (response.ok) {
        const data = await response.json();
        const custom = { en: {}, ar: {} };
        data.forEach(item => {
          if (item.EN_VALUE) custom.en[item.TRANSLATION_KEY] = item.EN_VALUE;
          if (item.AR_VALUE) custom.ar[item.TRANSLATION_KEY] = item.AR_VALUE;
        });
        setCustomTranslations(custom);
      }
    } catch (err) {
      console.error("Failed to fetch custom translations:", err);
    }
  }, []);

  useEffect(() => {
    fetchCustomTranslations();
  }, [fetchCustomTranslations]);

  useEffect(() => {
    localStorage.setItem('language', language);
    // Handle RTL
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
      document.body.classList.add('rtl');
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
      document.body.classList.remove('rtl');
    }
  }, [language]);

  const t = (key) => {
    // Check custom first, then default
    return customTranslations[language][key] || defaultTranslations[language][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ar' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage, fetchCustomTranslations, defaultTranslations, customTranslations }}>
      <div className={language === 'ar' ? 'rtl-context' : 'ltr-context'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
