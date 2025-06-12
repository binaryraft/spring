
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
import { Settings as SettingsIcon, Save } from "lucide-react";
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValuableIcon from "./ValuableIcon";

const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, toggleValuableInHeader } = useAppContext();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

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

  const handleSave = () => {
    updateSettings(localSettings);
    // Consider closing the sheet by controlling its open state via context or props if needed
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
        <ScrollArea className="h-[calc(100%-120px)] pr-6"> {/* Adjust height for footer */}
          <SheetHeader>
            <SheetTitle className="font-headline">Application Settings</SheetTitle>
            <SheetDescription>
              Manage your company details, valuable items, and tax rates.
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
                    <Label htmlFor={`price-${valuable.id}`}>Price (per {valuable.unit})</Label>
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
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Default Making Charge (for Sales)</h3>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <Label htmlFor="defaultMakingChargeType">Type</Label>
                    <Select
                        value={localSettings.defaultMakingCharge.type}
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
                    value={localSettings.defaultMakingCharge.value} 
                    onChange={(e) => handleNestedChange('defaultMakingCharge', 'value', parseFloat(e.target.value))} 
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Tax Rates</h3>
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
              <h3 className="text-lg font-medium font-headline mb-2 text-primary">Purchase Configuration</h3>
              <div className="space-y-3">
                <div>
                    <Label htmlFor="netPurchaseMode">Default Net Calculation for Purchases</Label>
                    <Select
                        value={localSettings.netPurchaseMode}
                        onValueChange={(value: 'percentage' | 'fixed_price') => handleChange('netPurchaseMode', value)}
                    >
                        <SelectTrigger id="netPurchaseMode">
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage">Percentage Based</SelectItem>
                            <SelectItem value="fixed_price">Fixed Net Price</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {localSettings.netPurchaseMode === 'percentage' && (
                    <div>
                        <Label htmlFor="netPurchasePercentage">Net Percentage (%)</Label>
                        <Input 
                            id="netPurchasePercentage" 
                            type="number" 
                            value={localSettings.netPurchasePercentage} 
                            onChange={(e) => handleChange('netPurchasePercentage', parseFloat(e.target.value))} 
                        />
                    </div>
                )}
                {localSettings.netPurchaseMode === 'fixed_price' && (
                    <div>
                        <Label htmlFor="netPurchaseFixedPrice">Net Fixed Price</Label>
                        <Input 
                            id="netPurchaseFixedPrice" 
                            type="number" 
                            value={localSettings.netPurchaseFixedPrice} 
                            onChange={(e) => handleChange('netPurchaseFixedPrice', parseFloat(e.target.value))} 
                        />
                    </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 border-t"> {/* Ensure footer is visible */}
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
