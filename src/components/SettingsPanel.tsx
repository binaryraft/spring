
"use client";
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable, Settings, MakingChargeSetting, CurrencyDefinition } from "@/types";
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
import { Settings as SettingsIcon, Save, PlusCircle, Trash2, Upload, XCircle, Info, Tag, Package, Percent, Banknote, CreditCard } from "lucide-react";
import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValuableIcon from "./ValuableIcon";
import Image from "next/image";
import { cn } from "@/lib/utils"; // Ensure cn is imported

const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, toggleValuableInHeader, addProductName, removeProductName, setCompanyLogo, toggleShowCompanyLogo, updateCurrencySymbol } = useAppContext();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [newProductName, setNewProductName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (field: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCurrencyChange = (symbol: string) => {
    setLocalSettings(prev => ({ ...prev, currencySymbol: symbol }));
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

  const handleAddProductNameToList = () => {
    if (newProductName.trim() !== '') {
      addProductName(newProductName.trim()); 
      setNewProductName('');
    }
  };
  
  const handleRemoveProductNameFromList = (productNameToRemove: string) => {
    removeProductName(productNameToRemove); 
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) { // Allow common image types
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file (e.g., PNG, JPG, GIF).");
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handleSave = () => {
    updateSettings(localSettings);
    updateCurrencySymbol(localSettings.currencySymbol); // Ensure currency symbol is updated directly too
  };

  const SectionHeader: React.FC<{ title: string; icon: React.ElementType; className?: string }> = ({ title, icon: Icon, className }) => (
    <h3 className={cn("text-xl font-headline mb-3 text-primary flex items-center", className)}>
      <Icon className="mr-3 h-5 w-5 text-primary/80" />
      {title}
    </h3>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50 shadow-md hover:shadow-lg transition-shadow">
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Open Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="font-headline text-2xl">Application Settings</SheetTitle>
          <SheetDescription>
            Manage all configurations for your Goldsmith Buddy application.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6 mb-4">
          <div className="space-y-8 py-6">
            
            <section>
              <SectionHeader title="Company Information" icon={Info} />
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={localSettings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="slogan">Slogan / Tagline</Label>
                  <Input id="slogan" value={localSettings.slogan} onChange={(e) => handleChange('slogan', e.target.value)} className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={localSettings.address} onChange={(e) => handleChange('address', e.target.value)} className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" value={localSettings.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} className="mt-1"/>
                </div>
              </div>
            </section>
            
            <Separator />
             <section>
                <SectionHeader title="Currency Settings" icon={CreditCard} />
                <div>
                  <Label htmlFor="currencySymbol">Currency Symbol</Label>
                  <Select
                    value={localSettings.currencySymbol}
                    onValueChange={handleCurrencyChange}
                  >
                    <SelectTrigger id="currencySymbol" className="mt-1 h-9">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {localSettings.availableCurrencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.symbol}>
                          {currency.symbol} - {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-xs text-muted-foreground mt-1 italic">
                    Selected currency will be used across the application for billing.
                  </p>
                </div>
              </section>
            <Separator />


            <section>
                <SectionHeader title="Company Logo" icon={Upload} />
                <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
                        <Checkbox
                            id="showCompanyLogo"
                            checked={settings.showCompanyLogo}
                            onCheckedChange={(checked) => toggleShowCompanyLogo(!!checked)}
                        />
                        <Label htmlFor="showCompanyLogo" className="text-sm font-medium leading-none cursor-pointer">
                            Show company logo on bills & estimates
                        </Label>
                    </div>
                    {settings.showCompanyLogo && (
                        <div className="mt-3 space-y-3 p-3 border rounded-md">
                            <Input
                                id="logoUpload"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                ref={fileInputRef}
                                className="text-sm file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                            {settings.companyLogo && (
                                <div className="mt-2 p-3 border rounded-md bg-muted/50 inline-flex flex-col items-center shadow-sm">
                                    <Image src={settings.companyLogo} alt="Company Logo Preview" width={120} height={120} className="object-contain rounded" />
                                    <Button variant="link" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive-foreground hover:bg-destructive mt-2 text-xs">
                                      <XCircle className="mr-1 h-3 w-3" /> Remove Logo
                                    </Button>
                                </div>
                            )}
                            {!settings.companyLogo && (
                                <p className="text-xs text-muted-foreground mt-1 italic">No logo uploaded. A default placeholder will be used if enabled.</p>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Valuables Management" icon={Banknote} />
              <div className="space-y-3">
                {localSettings.valuables.map((valuable) => (
                  <div key={valuable.id} className="p-4 border rounded-md space-y-3 bg-card shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-6 h-6 mr-2.5 text-primary" />
                        <Input
                          value={valuable.name}
                          onChange={(e) => handleValuableChange(valuable.id, 'name', e.target.value)}
                          className="text-md font-semibold mr-2 w-auto inline-flex h-9"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`select-${valuable.id}`}
                          checked={valuable.selectedInHeader}
                          onCheckedChange={() => toggleValuableInHeader(valuable.id)}
                        />
                        <Label htmlFor={`select-${valuable.id}`} className="text-xs cursor-pointer">Show in Header</Label>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor={`price-${valuable.id}`}>Market Price ({settings.currencySymbol})</Label>
                            <Input
                            id={`price-${valuable.id}`}
                            type="number"
                            value={valuable.price}
                            onChange={(e) => handleValuableChange(valuable.id, 'price', parseFloat(e.target.value))}
                            className="mt-1 h-9"
                            />
                        </div>
                        <div>
                            <Label htmlFor={`unit-${valuable.id}`}>Unit</Label>
                            <Input
                            id={`unit-${valuable.id}`}
                            value={valuable.unit}
                            onChange={(e) => handleValuableChange(valuable.id, 'unit', e.target.value)}
                            className="mt-1 h-9"
                            />
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Product Names" icon={Tag} />
              <div className="space-y-3 mb-4">
                <Label htmlFor="newProductName" className="font-medium">Add New Product Name Suggestion</Label>
                <div className="flex space-x-2">
                  <Input
                    id="newProductName"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g., Ring, Bangle, Earring"
                    className="h-9"
                  />
                  <Button onClick={handleAddProductNameToList} size="sm" className="h-9 shadow hover:shadow-md transition-shadow">
                    <PlusCircle className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
              {settings.productNames.length > 0 ? (
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1.5 bg-muted/30">
                  {settings.productNames.map((productName) => (
                    <div key={productName} className="flex items-center justify-between p-2 bg-card rounded text-sm shadow-sm">
                      <span>{productName}</span>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveProductNameFromList(productName)} className="h-6 w-6 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No custom product names added yet.</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                These names appear as suggestions. Product names are also automatically added here when entered in bills.
              </p>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Default Making Charge (Sales)" icon={Package} />
              <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-card shadow-sm">
                 <div>
                    <Label htmlFor="defaultMakingChargeType">Type</Label>
                    <Select
                        value={localSettings.defaultMakingCharge?.type || 'percentage'}
                        onValueChange={(value: 'percentage' | 'fixed') => handleNestedChange('defaultMakingCharge', 'type', value)}
                    >
                        <SelectTrigger id="defaultMakingChargeType" className="mt-1 h-9">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ({settings.currencySymbol})</SelectItem>
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
                    className="mt-1 h-9"
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Tax Rates (Sales)" icon={Percent} />
              <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-card shadow-sm">
                <div>
                  <Label htmlFor="cgstRate">CGST Rate (%)</Label>
                  <Input id="cgstRate" type="number" value={localSettings.cgstRate} onChange={(e) => handleChange('cgstRate', parseFloat(e.target.value))} className="mt-1 h-9"/>
                </div>
                <div>
                  <Label htmlFor="sgstRate">SGST Rate (%)</Label>
                  <Input id="sgstRate" type="number" value={localSettings.sgstRate} onChange={(e) => handleChange('sgstRate', parseFloat(e.target.value))} className="mt-1 h-9"/>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Default Purchase Item Setup" icon={Package} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-md bg-card shadow-sm">
                <div>
                  <Label htmlFor="defaultPurchaseItemNetPercentage">Default Net % Off Market</Label>
                  <Input
                    id="defaultPurchaseItemNetPercentage"
                    type="number"
                    value={localSettings.defaultPurchaseItemNetPercentage}
                    onChange={(e) => handleChange('defaultPurchaseItemNetPercentage', parseFloat(e.target.value))}
                    placeholder="e.g., 10 for 10% deduction"
                    className="mt-1 h-9"
                  />
                   <p className="text-xs text-muted-foreground mt-1 italic">
                    Applied if 'Net % Off Market' is chosen for a new purchase item.
                  </p>
                </div>
                <div>
                  <Label htmlFor="defaultPurchaseItemNetFixedValue">Default Fixed Net Rate ({settings.currencySymbol})</Label>
                  <Input
                    id="defaultPurchaseItemNetFixedValue"
                    type="number"
                    value={localSettings.defaultPurchaseItemNetFixedValue}
                    onChange={(e) => handleChange('defaultPurchaseItemNetFixedValue', parseFloat(e.target.value))}
                    placeholder="e.g., 4500"
                    className="mt-1 h-9"
                  />
                   <p className="text-xs text-muted-foreground mt-1 italic">
                    Applied if 'Fixed Net Rate' is chosen for a new purchase item.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </ScrollArea>
        <SheetFooter className="p-4 border-t mt-auto">
          <SheetClose asChild>
            <Button variant="outline" className="shadow hover:shadow-md transition-shadow">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow">
              <Save className="mr-2 h-4 w-4" /> Save All Settings
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
