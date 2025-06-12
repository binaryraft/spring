
"use client";
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable, Settings, MakingChargeSetting } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Settings as SettingsIcon, Save, PlusCircle, Trash2 } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValuableIcon from "./ValuableIcon";

const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, toggleValuableInHeader, addProductName, removeProductName } = useAppContext();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [newProductName, setNewProductName] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parentField: keyof Settings, nestedField: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [parentField]: {
        // @ts-ignore
        ...prev[parentField],
        [nestedField]: value,
      },
    }));
  };

  const handleValuableChange = (valuableId: string, field: keyof Valuable, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      valuables: prev.valuables.map(v =>
        v.id === valuableId ? { ...v, [field]: value } : v
      ),
    }));
  };

  const handleAddProductName = () => {
    if (newProductName.trim() !== '') {
      const updatedProductNames = [...localSettings.productNames, newProductName.trim()].sort();
      setLocalSettings(prev => ({ ...prev, productNames: updatedProductNames }));
      setNewProductName(''); // Clear input after adding
    }
  };

  const handleRemoveProductName = (productNameToRemove: string) => {
    const updatedProductNames = localSettings.productNames.filter(name => name !== productNameToRemove);
    setLocalSettings(prev => ({ ...prev, productNames: updatedProductNames }));
  };


  const handleSave = () => {
    // Ensure productNames are updated in context before saving all settings
    // This is slightly redundant if addProductName directly updates context,
    // but ensures settings panel changes are captured if context update isn't immediate
    // or if localSettings were manipulated directly.
    const finalSettings = {...localSettings};
    // The AppContext addProductName/removeProductName already handle updating the context's settings state
    // So, just calling updateSettings with the current localSettings is sufficient
    updateSettings(finalSettings);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50">
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Open Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <ScrollArea className="h-[calc(100%-120px)] pr-6">
          <SheetHeader>
            <SheetTitle className="font-headline">Application Settings</SheetTitle>
            <SheetDescription>
              Manage your company details, valuable items, products, and tax rates.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Company Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={localSettings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="slogan">Slogan</Label>
                  <Input id="slogan" value={localSettings.slogan} onChange={(e) => handleChange('slogan', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={localSettings.address} onChange={(e) => handleChange('address', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" value={localSettings.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Valuables Management</h3>
              {localSettings.valuables.map((valuable) => (
                <div key={valuable.id} className="p-3 border rounded-md mb-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-5 h-5 mr-2" />
                      <Input 
                        value={valuable.name} 
                        onChange={(e) => handleValuableChange(valuable.id, 'name', e.target.value)}
                        className="text-md font-semibold mr-2 w-auto inline-flex"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`select-${valuable.id}`} className="text-xs">Show in Header</Label>
                      <Checkbox
                        id={`select-${valuable.id}`}
                        checked={valuable.selectedInHeader}
                        onCheckedChange={() => toggleValuableInHeader(valuable.id)} 
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`price-${valuable.id}`}>Market Price (per {valuable.unit})</Label>
                    <Input
                      id={`price-${valuable.id}`}
                      type="number"
                      value={valuable.price}
                      onChange={(e) => handleValuableChange(valuable.id, 'price', parseFloat(e.target.value))}
                    />
                  </div>
                   <div>
                    <Label htmlFor={`unit-${valuable.id}`}>Unit</Label>
                    <Input
                      id={`unit-${valuable.id}`}
                      value={valuable.unit}
                      onChange={(e) => handleValuableChange(valuable.id, 'unit', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Product Management</h3>
              <div className="space-y-2 mb-4">
                <Label htmlFor="newProductName">Add New Product Name</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="newProductName" 
                    value={newProductName} 
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g., Ring, Bangle"
                  />
                  <Button onClick={handleAddProductName} size="sm">
                    <PlusCircle className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
              {localSettings.productNames.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {localSettings.productNames.map((productName) => (
                    <div key={productName} className="flex items-center justify-between p-1.5 bg-muted/50 rounded text-sm">
                      <span>{productName}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveProductName(productName)} className="h-6 w-6 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No custom product names added yet.</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Product names are also automatically added here when entered in bills.
              </p>
            </div>


            <Separator />
            
            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Default Making Charge (for Sales)</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="defaultMakingChargeType">Type</Label>
                    <Select
                        value={localSettings.defaultMakingCharge?.type || 'percentage'}
                        onValueChange={(value: 'percentage' | 'fixed') => handleNestedChange('defaultMakingCharge', 'type', value)}
                    >
                        <SelectTrigger id="defaultMakingChargeType">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                  <Label htmlFor="defaultMakingChargeValue">Value</Label>
                  <Input 
                    id="defaultMakingChargeValue" 
                    type="number" 
                    value={localSettings.defaultMakingCharge?.value || 0} 
                    onChange={(e) => handleNestedChange('defaultMakingCharge', 'value', parseFloat(e.target.value))} 
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Tax Rates (for Sales)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cgstRate">CGST Rate (%)</Label>
                  <Input id="cgstRate" type="number" value={localSettings.cgstRate} onChange={(e) => handleChange('cgstRate', parseFloat(e.target.value))} />
                </div>
                <div>
                  <Label htmlFor="sgstRate">SGST Rate (%)</Label>
                  <Input id="sgstRate" type="number" value={localSettings.sgstRate} onChange={(e) => handleChange('sgstRate', parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Default Purchase Item Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultPurchaseItemNetPercentage">Default Net Percentage (%)</Label>
                  <Input 
                    id="defaultPurchaseItemNetPercentage" 
                    type="number" 
                    value={localSettings.defaultPurchaseItemNetPercentage} 
                    onChange={(e) => handleChange('defaultPurchaseItemNetPercentage', parseFloat(e.target.value))}
                    placeholder="e.g., 10 for 10% off market price"
                  />
                   <p className="text-xs text-muted-foreground mt-1">
                    Used when 'Net % Off Market' is selected for a new purchase item.
                  </p>
                </div>
                <div>
                  <Label htmlFor="defaultPurchaseItemNetFixedValue">Default Fixed Net Rate</Label>
                  <Input 
                    id="defaultPurchaseItemNetFixedValue" 
                    type="number" 
                    value={localSettings.defaultPurchaseItemNetFixedValue} 
                    onChange={(e) => handleChange('defaultPurchaseItemNetFixedValue', parseFloat(e.target.value))}
                    placeholder="e.g., 4500"
                  />
                   <p className="text-xs text-muted-foreground mt-1">
                    Used when 'Fixed Net Rate' is selected for a new purchase item.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t">
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
              <Save className="mr-2 h-4 w-4" /> Save Settings
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
