
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Settings, Valuable, Bill, BillItem, BillType } from '@/types'; // Added BillItem
import { DEFAULT_SETTINGS } from '@/types';
import useLocalStorage from '@/hooks/useLocalStorage';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateValuablePrice: (valuableId: string, newPrice: number) => void;
  toggleValuableInHeader: (valuableId: string) => void;
  addCustomItemName: (name: string) => void;
  bills: Bill[];
  addBill: (bill: Omit<Bill, 'id' | 'date' | 'billNumber'>) => Bill;
  updateBill: (updatedBill: Bill) => void;
  deleteBill: (billId: string) => void;
  getValuableById: (id: string) => Valuable | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<Settings>('goldsmith-settings', DEFAULT_SETTINGS);
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
  
  const addCustomItemName = useCallback((name: string) => {
    setSettings(prev => {
      const lowerCaseName = name.toLowerCase();
      if (prev.customItemNames.some(n => n.toLowerCase() === lowerCaseName)) {
        return prev; 
      }
      return {
        ...prev,
        customItemNames: [...prev.customItemNames, name].sort(), 
      };
    });
  }, [setSettings]);

  const getValuableById = useCallback((id: string): Valuable | undefined => {
    return settings.valuables.find(v => v.id === id);
  }, [settings.valuables]);

  const addBill = useCallback((billData: Omit<Bill, 'id' | 'date' | 'billNumber'>): Bill => {
    const newBill: Bill = {
      ...billData,
      id: uuidv4(),
      date: new Date().toISOString(),
      billNumber: `${billData.type === 'sales-bill' ? 'S' : 'P'}-${String(bills.filter(b => b.type === billData.type).length + 1).padStart(4, '0')}`,
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

  return (
    <AppContext.Provider value={{ 
      settings, 
      updateSettings, 
      updateValuablePrice,
      toggleValuableInHeader,
      addCustomItemName,
      bills, 
      addBill,
      updateBill,
      deleteBill,
      getValuableById
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
