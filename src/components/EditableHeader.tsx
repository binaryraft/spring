
"use client";
import React, { useState } from 'react';
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ValuableIcon from "./ValuableIcon";
import { Button } from "@/components/ui/button";
import { Edit3, Save, XCircle } from "lucide-react";

const EditableHeader: React.FC = () => {
  const { settings, updateValuablePrice } = useAppContext();
  const [editingValuableId, setEditingValuableId] = useState<string | null>(null);
  const [currentEditPrice, setCurrentEditPrice] = useState<string>("");

  const handleEditClick = (valuable: Valuable) => {
    setEditingValuableId(valuable.id);
    setCurrentEditPrice(String(valuable.price));
  };

  const handleSavePrice = () => {
    if (editingValuableId === null) return;
    const newPrice = parseFloat(currentEditPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateValuablePrice(editingValuableId, newPrice);
    }
    setEditingValuableId(null);
  };

  const handleCancelEdit = () => {
    setEditingValuableId(null);
    setCurrentEditPrice("");
  };

  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentEditPrice(e.target.value);
  };

  const activeValuables = settings.valuables.filter(v => v.selectedInHeader);

  if (activeValuables.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground text-lg bg-card rounded-lg shadow-md">
        No market prices selected for display. Configure in Settings.
      </div>
    );
  }
  
  return (
    <div className="mt-8 p-6 rounded-lg bg-card border border-border shadow-xl">
      <h3 className="text-3xl lg:text-4xl font-semibold text-center mb-10 text-primary">
        Live Market Prices
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-10">
        {activeValuables.map((valuable) => (
          <div key={valuable.id} className="flex flex-col items-center space-y-3 p-4 rounded-lg bg-background shadow-md border border-primary/20 hover:shadow-lg transition-shadow">
            <Label htmlFor={`price-display-${valuable.id}`} className="flex items-center text-xl font-headline text-foreground text-center">
              <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-7 h-7 mr-3" />
              {valuable.name}
            </Label>
            
            {editingValuableId === valuable.id ? (
              <div className="w-full space-y-3">
                <div className="flex items-center">
                   <span className="mr-1.5 text-lg text-muted-foreground">{settings.currencySymbol}</span>
                  <Input
                    id={`price-input-${valuable.id}`}
                    type="number"
                    value={currentEditPrice}
                    onChange={handlePriceInputChange}
                    className="w-full border-input focus:ring-primary h-12 text-lg shadow-sm text-center"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>
                <div className="flex justify-around space-x-2">
                  <Button onClick={handleSavePrice} size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-base h-10">
                    <Save className="mr-2 h-4 w-4" /> Save
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm" className="flex-1 text-base h-10">
                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full group">
                <span id={`price-display-${valuable.id}`} className="text-3xl font-bold text-primary group-hover:text-primary/80 transition-colors">
                  {settings.currencySymbol}{valuable.price.toFixed(2)}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleEditClick(valuable)} className="ml-3 opacity-50 group-hover:opacity-100 transition-opacity">
                  <Edit3 className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Edit price for {valuable.name}</span>
                </Button>
              </div>
            )}
            <p className="text-base text-muted-foreground text-center">per {valuable.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditableHeader;
