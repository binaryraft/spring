
"use client";
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ValuableIcon from "./ValuableIcon";
import React from "react";

const EditableHeader: React.FC = () => {
  const { settings, updateValuablePrice } = useAppContext();
  const [editingPrices, setEditingPrices] = React.useState<Record<string, string>>({});

  const handlePriceChange = (valuableId: string, newPriceStr: string) => {
    setEditingPrices(prev => ({...prev, [valuableId]: newPriceStr}));
    const newPrice = parseFloat(newPriceStr);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateValuablePrice(valuableId, newPrice);
    }
  };
  
  const handleBlur = (valuableId: string) => {
    const priceStr = editingPrices[valuableId];
    if (priceStr === undefined) return; 
    const newPrice = parseFloat(priceStr);
     if (isNaN(newPrice) || newPrice < 0) {
        const originalValuable = settings.valuables.find(v => v.id === valuableId);
        if (originalValuable) {
          setEditingPrices(prev => ({...prev, [valuableId]: String(originalValuable.price)}));
          updateValuablePrice(valuableId, originalValuable.price);
        }
    } else {
      updateValuablePrice(valuableId, newPrice);
    }
  }

  const activeValuables = settings.valuables.filter(v => v.selectedInHeader);

  if (activeValuables.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-base bg-card rounded-lg shadow-md">
        No market prices selected for display. Configure in Settings.
      </div>
    );
  }
  
  return (
    <div className="mt-8 p-6 rounded-lg bg-card border border-border shadow-lg">
      <h3 className="text-2xl font-semibold text-center mb-8 text-primary">
        Live Market Prices
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-8">
        {activeValuables.map((valuable) => (
          <div key={valuable.id} className="flex flex-col space-y-2 items-center">
            <Label htmlFor={`price-${valuable.id}`} className="flex items-center text-lg font-medium text-foreground">
              <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-6 h-6 mr-2.5" />
              {valuable.name}
            </Label>
            <div className="flex items-center">
              <span className="mr-1.5 text-base text-muted-foreground">{settings.currencySymbol}</span>
              <Input
                id={`price-${valuable.id}`}
                type="number"
                value={editingPrices[valuable.id] ?? valuable.price}
                onChange={(e) => handlePriceChange(valuable.id, e.target.value)}
                onBlur={() => handleBlur(valuable.id)}
                className="w-full border-input focus:ring-primary h-10 text-base shadow-sm text-center"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">per {valuable.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditableHeader;
