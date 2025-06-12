
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
           // Also update context if value was invalid and reset
          updateValuablePrice(valuableId, originalValuable.price);
        }
    } else {
      updateValuablePrice(valuableId, newPrice);
    }
  }

  const activeValuables = settings.valuables.filter(v => v.selectedInHeader);

  if (activeValuables.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No market prices selected for display. Configure in Settings.
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 shadow-sm">
      <h3 className="text-md font-semibold text-center mb-3 text-primary/80">
        Market Prices (per {activeValuables[0]?.unit || 'unit'})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
        {activeValuables.map((valuable) => (
          <div key={valuable.id} className="flex flex-col space-y-1">
            <Label htmlFor={`price-${valuable.id}`} className="flex items-center text-xs font-medium text-foreground">
              <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-4 h-4 mr-1.5" />
              {valuable.name}
            </Label>
            <Input
              id={`price-${valuable.id}`}
              type="number"
              value={editingPrices[valuable.id] ?? valuable.price}
              onChange={(e) => handlePriceChange(valuable.id, e.target.value)}
              onBlur={() => handleBlur(valuable.id)}
              className="w-full border-accent focus:ring-primary h-8 text-sm"
              min="0"
              step="0.01"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditableHeader;
