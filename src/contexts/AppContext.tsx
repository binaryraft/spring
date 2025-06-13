
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Settings, Valuable, Bill, BillItem, BillType, CurrencyDefinition, PdfLogoPosition } from '@/types';
import { DEFAULT_SETTINGS, AVAILABLE_CURRENCIES } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateValuablePrice: (valuableId: string, newPrice: number) => void;
  toggleValuableInHeader: (valuableId: string) => void;
  
  addValuable: (newValuableData: Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'>) => Valuable | null;
  updateValuableData: (valuableId: string, updatedData: Partial<Omit<Valuable, 'id' | 'isDefault'>>) => void;
  removeValuable: (valuableId: string) => void;

  addProductName: (name: string) => void;
  removeProductName: (name: string) => void;
  bills: Bill[];
  addBill: (bill: Omit<Bill, 'id' | 'date' | 'billNumber' | 'companyGstin'>) => Bill;
  updateBill: (updatedBill: Bill) => void;
  deleteBill: (billId: string) => void;
  getValuableById: (id: string) => Valuable | undefined;
  setCompanyLogo: (logoDataUri?: string) => void;
  toggleShowCompanyLogo: (show: boolean) => void;
  updateCurrencySymbol: (symbol: string) => void;
  toggleTheme: () => void;
  toggleEnableColorBilling: (enable: boolean) => void;
  updatePdfLogoPosition: (position: PdfLogoPosition) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<Settings>('goldsmith-settings', {
    ...DEFAULT_SETTINGS,
    availableCurrencies: AVAILABLE_CURRENCIES, 
  });
  const [bills, setBills] = useLocalStorage<Bill[]>('goldsmith-bills', []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  const updateValuablePrice = useCallback((valuableId: string, newPrice: number) => {
    setSettings(prev => ({
      ...prev,
      valuables: prev.valuables.map(v =>
        v.id === valuableId ? { ...v, price: Math.max(0, newPrice) } : v 
      ),
    }));
  }, [setSettings]);

  const toggleValuableInHeader = useCallback((valuableId: string) => {
    setSettings(prev => ({
      ...prev,
      valuables: prev.valuables.map(v =>
        v.id === valuableId ? { ...v, selectedInHeader: !v.selectedInHeader } : v
      ),
    }));
  }, [setSettings]);

  const addValuable = useCallback((newValuableData: Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'>): Valuable | null => {
    if (settings.valuables.some(v => v.name.toLowerCase() === newValuableData.name.trim().toLowerCase())) {
      return null; 
    }
    const newFullValuable: Valuable = {
      ...newValuableData,
      id: uuidv4(),
      selectedInHeader: false, 
      isDefault: false,
      iconColor: newValuableData.icon === 'custom-gem' ? (newValuableData.iconColor || '#808080') : undefined,
      price: Math.max(0, newValuableData.price) 
    };
    setSettings(prev => ({
      ...prev,
      valuables: [...prev.valuables, newFullValuable].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    return newFullValuable;
  }, [setSettings, settings.valuables]);

  const updateValuableData = useCallback((valuableId: string, updatedData: Partial<Omit<Valuable, 'id' | 'isDefault'>>) => {
    setSettings(prev => ({
      ...prev,
      valuables: prev.valuables.map(v => {
        if (v.id === valuableId) {
          const mergedData = { ...v, ...updatedData };
          if (typeof mergedData.price === 'number') {
            mergedData.price = Math.max(0, mergedData.price);
          }
          mergedData.iconColor = mergedData.icon === 'custom-gem' ? (mergedData.iconColor || '#808080') : undefined;
          return mergedData;
        }
        return v;
      }).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [setSettings]);

  const removeValuable = useCallback((valuableId: string) => {
    setSettings(prev => {
      const valuableToRemove = prev.valuables.find(v => v.id === valuableId);
      if (valuableToRemove?.isDefault) {
        return prev; 
      }
      return {
        ...prev,
        valuables: prev.valuables.filter(v => v.id !== valuableId),
      };
    });
  }, [setSettings]);


  const addProductName = useCallback((name: string) => {
    if (!name || name.trim() === '') return;
    setSettings(prev => {
      const lowerCaseName = name.trim().toLowerCase();
      if (prev.productNames.some(n => n.toLowerCase() === lowerCaseName)) {
        return prev; 
      }
      return {
        ...prev,
        productNames: [...prev.productNames, name.trim()].sort((a, b) => a.localeCompare(b)),
      };
    });
  }, [setSettings]);

  const removeProductName = useCallback((nameToRemove: string) => {
    setSettings(prev => ({
      ...prev,
      productNames: prev.productNames.filter(name => name !== nameToRemove),
    }));
  }, [setSettings]);

  const getValuableById = useCallback((id: string): Valuable | undefined => {
    return settings.valuables.find(v => v.id === id);
  }, [settings.valuables]);

  const addBill = useCallback((billData: Omit<Bill, 'id' | 'date' | 'billNumber' | 'companyGstin'>): Bill => {
    const prefix = billData.type === 'sales-bill' ? 'S' : 'P';
    const typeSpecificBills = bills.filter(b => b.type === billData.type);
    const nextBillNumber = (typeSpecificBills.length > 0 
        ? Math.max(...typeSpecificBills.map(b => parseInt(b.billNumber?.split('-').pop() || '0', 10))) + 1 
        : 1
    ).toString().padStart(4, '0');

    const newBill: Bill = {
      ...billData,
      id: uuidv4(),
      date: new Date().toISOString(),
      billNumber: `${prefix}-${nextBillNumber}`,
      companyGstin: settings.gstin || undefined, 
    };
    setBills(prev => [newBill, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return newBill;
  }, [bills, setBills, settings.gstin]);

  const updateBill = useCallback((updatedBill: Bill) => {
    setBills(prev => prev.map(b => b.id === updatedBill.id ? { ...updatedBill, companyGstin: updatedBill.companyGstin || b.companyGstin } : b).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [setBills]);

  const deleteBill = useCallback((billId: string) => {
    setBills(prev => prev.filter(b => b.id !== billId));
  }, [setBills]);

  const setCompanyLogo = useCallback((logoDataUri?: string) => {
    setSettings(prev => ({ ...prev, companyLogo: logoDataUri }));
  }, [setSettings]);

  const toggleShowCompanyLogo = useCallback((show: boolean) => {
    setSettings(prev => ({ ...prev, showCompanyLogo: show }));
  }, [setSettings]);

  const updateCurrencySymbol = useCallback((symbol: string) => {
    setSettings(prev => ({ ...prev, currencySymbol: symbol }));
  }, [setSettings]);

  const toggleTheme = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  }, [setSettings]);

  const toggleEnableColorBilling = useCallback((enable: boolean) => {
    setSettings(prev => ({ ...prev, enableColorBilling: enable }));
  }, [setSettings]);

  const updatePdfLogoPosition = useCallback((position: PdfLogoPosition) => {
    setSettings(prev => ({ ...prev, pdfLogoPosition: position }));
  }, [setSettings]);


  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      updateValuablePrice,
      toggleValuableInHeader,
      addValuable,
      updateValuableData,
      removeValuable,
      addProductName,
      removeProductName,
      bills,
      addBill,
      updateBill,
      deleteBill,
      getValuableById,
      setCompanyLogo,
      toggleShowCompanyLogo,
      updateCurrencySymbol,
      toggleTheme,
      toggleEnableColorBilling,
      updatePdfLogoPosition,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
