
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Settings, Valuable, Bill, BillItem, BillType, CurrencyDefinition } from '@/types';
import { DEFAULT_SETTINGS, AVAILABLE_CURRENCIES } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateValuablePrice: (valuableId: string, newPrice: number) => void;
  toggleValuableInHeader: (valuableId: string) => void;
  
  addValuable: (newValuable: Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'>) => void;
  updateValuableData: (valuableId: string, updatedData: Partial<Omit<Valuable, 'id' | 'isDefault'>>) => void;
  removeValuable: (valuableId: string) => void;

  addProductName: (name: string) => void;
  removeProductName: (name: string) => void;
  bills: Bill[];
  addBill: (bill: Omit<Bill, 'id' | 'date' | 'billNumber'>) => Bill;
  updateBill: (updatedBill: Bill) => void;
  deleteBill: (billId: string) => void;
  getValuableById: (id: string) => Valuable | undefined;
  setCompanyLogo: (logoDataUri?: string) => void;
  toggleShowCompanyLogo: (show: boolean) => void;
  updateCurrencySymbol: (symbol: string) => void;
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
        v.id === valuableId ? { ...v, price: newPrice } : v
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

  const addValuable = useCallback((newValuableData: Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'>) => {
    setSettings(prev => {
      const newFullValuable: Valuable = {
        ...newValuableData,
        id: uuidv4(),
        selectedInHeader: false, // Custom valuables not in header by default
        isDefault: false,
      };
      return {
        ...prev,
        valuables: [...prev.valuables, newFullValuable].sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  }, [setSettings]);

  const updateValuableData = useCallback((valuableId: string, updatedData: Partial<Omit<Valuable, 'id' | 'isDefault'>>) => {
    setSettings(prev => ({
      ...prev,
      valuables: prev.valuables.map(v =>
        v.id === valuableId ? { ...v, ...updatedData } : v
      ).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [setSettings]);

  const removeValuable = useCallback((valuableId: string) => {
    setSettings(prev => ({
      ...prev,
      valuables: prev.valuables.filter(v => v.id !== valuableId),
    }));
    // Optionally, could remove this valuable from any existing bill items if strict data integrity is needed,
    // but that might be too destructive or complex for this app.
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

  const addBill = useCallback((billData: Omit<Bill, 'id' | 'date' | 'billNumber'>): Bill => {
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
    };
    setBills(prev => [newBill, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return newBill;
  }, [bills, setBills]);

  const updateBill = useCallback((updatedBill: Bill) => {
    setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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
