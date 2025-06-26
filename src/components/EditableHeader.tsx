
"use client";
import React, { useState } from 'react';
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ValuableIcon from "./ValuableIcon";
import { Button } from "@/components/ui/button";
import { Edit3, Save, XCircle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

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
      <Card className="p-6 text-center text-muted-foreground text-lg shadow-lg border-border">
        No market prices selected for display. You can enable them in Settings.
      </Card>
    );
  }
  
  return (
    <Card className="p-6 sm:p-8 rounded-2xl shadow-xl border-border">
      <h3 className="text-3xl font-bold text-center mb-10 text-primary flex items-center justify-center gap-3">
        <TrendingUp className="w-8 h-8"/>
        Live Market Prices
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {activeValuables.map((valuable) => (
          <div key={valuable.id} className="relative group flex flex-col items-center justify-between p-4 rounded-xl bg-gradient-to-br from-background to-muted/50 shadow-lg border border-primary/10 hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300">
            <div className="flex flex-col items-center text-center">
                <Label htmlFor={`price-display-${valuable.id}`} className="flex items-center text-xl font-headline text-foreground">
                    <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-7 h-7 mr-3" />
                    {valuable.name}
                </Label>
                <p className="text-base text-muted-foreground mt-1">per {valuable.unit}</p>
            </div>
            
            {editingValuableId === valuable.id ? (
              <div className="w-full space-y-3 mt-4">
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
              <div className="flex items-center justify-center w-full group mt-4">
                <span id={`price-display-${valuable.id}`} className="text-3xl font-bold text-primary group-hover:text-primary/80 transition-colors">
                  {settings.currencySymbol}{valuable.price.toFixed(2)}
                </span>
                <Button variant="ghost" size="icon" onClick={() => handleEditClick(valuable)} className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                  <Edit3 className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Edit price for {valuable.name}</span>
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default EditableHeader;
