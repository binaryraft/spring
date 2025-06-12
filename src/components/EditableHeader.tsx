
"use client";
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (priceStr === undefined) return; // if not edited, do nothing
    const newPrice = parseFloat(priceStr);
     if (isNaN(newPrice) || newPrice < 0) {
        // Reset to original price from settings if input is invalid
        const originalValuable = settings.valuables.find(v => v.id === valuableId);
        if (originalValuable) {
          setEditingPrices(prev => ({...prev, [valuableId]: String(originalValuable.price)}));
        }
    } else {
      updateValuablePrice(valuableId, newPrice);
    }
  }


  const activeValuables = settings.valuables.filter(v => v.selectedInHeader);

  if (activeValuables.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No valuables selected to display in header. Please check settings.
      </div>
    );
  }
  
  return (
    <Card className="mb-6 shadow-md bg-primary/10 border-primary/30">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-primary">Market Prices (per {activeValuables[0]?.unit || 'unit'})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeValuables.map((valuable) => (
            <div key={valuable.id} className="flex flex-col space-y-1">
              <Label htmlFor={`price-${valuable.id}`} className="flex items-center text-sm font-medium text-foreground">
                <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-5 h-5 mr-2" />
                {valuable.name}
              </Label>
              <Input
                id={`price-${valuable.id}`}
                type="number"
                value={editingPrices[valuable.id] ?? valuable.price}
                onChange={(e) => handlePriceChange(valuable.id, e.target.value)}
                onBlur={() => handleBlur(valuable.id)}
                className="w-full border-accent focus:ring-primary"
                min="0"
                step="0.01"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EditableHeader;
