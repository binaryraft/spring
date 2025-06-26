
"use client";
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable, Settings, MakingChargeSetting, CurrencyDefinition, PdfLogoPosition, ProductSuggestion } from "@/types";
import { AVAILABLE_ICONS, AVAILABLE_CURRENCIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarMenuButton } from "@/components/ui/sidebar";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings as SettingsIcon, Save, PlusCircle, Trash2, Upload, XCircle, Info, Tag, Package, Percent, Banknote, CreditCard, Edit3, Palette, FileText as GstinIcon, Paintbrush, LayoutDashboard } from "lucide-react"; 
import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValuableIcon from "./ValuableIcon";
import Image from "next/image";
import { cn } from "@/lib/utils"; 
import { v4 as uuidv4 } from 'uuid';

const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, toggleValuableInHeader, addOrUpdateProductSuggestion, removeProductSuggestion, setCompanyLogo, toggleShowCompanyLogo, updateCurrencySymbol, addValuable, updateValuableData, removeValuable: removeValuableFromContext, toggleEnableColorBilling, updatePdfLogoPosition } = useAppContext();
  const [localSettings, setLocalSettings] = useState<Settings>(() => JSON.parse(JSON.stringify(settings))); 
  const [newProductName, setNewProductName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditingMaterial, setIsEditingMaterial] = useState<Valuable | null>(null);
  const [customMaterialForm, setCustomMaterialForm] = useState<Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'>>({
    name: '', price: 0, unit: 'gram', icon: 'other', iconColor: '#808080'
  });

  useEffect(() => {
    setLocalSettings(JSON.parse(JSON.stringify(settings))); 
  }, [settings]);

  const handleChange = (field: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCurrencyChange = (symbol: string) => {
    const selectedCurrency = AVAILABLE_CURRENCIES.find(c => c.symbol === symbol);
    if (selectedCurrency) {
      setLocalSettings(prev => ({ ...prev, currencySymbol: selectedCurrency.symbol }));
    }
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

  const handleLocalValuableChange = (valuableId: string, field: keyof Valuable, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      valuables: prev.valuables.map(v =>
        v.id === valuableId ? { ...v, [field]: value } : v
      ),
    }));
  };
  
  const handleAddProductSuggestion = () => {
    if (newProductName.trim() && !localSettings.productSuggestions.some(p => p.name.toLowerCase() === newProductName.trim().toLowerCase())) {
        const newSuggestion: ProductSuggestion = { name: newProductName.trim(), hsnCode: '' };
        setLocalSettings(prev => ({
            ...prev,
            productSuggestions: [...prev.productSuggestions, newSuggestion].sort((a, b) => a.name.localeCompare(b.name)),
        }));
        setNewProductName('');
    }
  };

  const handleProductSuggestionHsnChange = (productName: string, newHsn: string) => {
    setLocalSettings(prev => ({
        ...prev,
        productSuggestions: prev.productSuggestions.map(p =>
            p.name === productName ? { ...p, hsnCode: newHsn } : p
        ),
    }));
  };
  
  const handleRemoveProductSuggestion = (productName: string) => {
    setLocalSettings(prev => ({
      ...prev,
      productSuggestions: prev.productSuggestions.filter(p => p.name !== productName),
    }));
  };


  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) { 
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handleCustomMaterialFormChange = (field: keyof typeof customMaterialForm, value: any) => {
    setCustomMaterialForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCustomMaterial = () => {
    if (!customMaterialForm.name.trim()) {
      return;
    }
    if (!customMaterialForm.unit.trim()) {
        return;
    }
    if (customMaterialForm.price < 0) {
      return;
    }

    const materialToSave: Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'> = {
      ...customMaterialForm,
      price: Number(customMaterialForm.price) || 0,
      iconColor: customMaterialForm.icon === 'custom-gem' ? (customMaterialForm.iconColor || '#808080') : undefined,
    };
    
    if (isEditingMaterial) {
      if (settings.valuables.some(v => v.id !== isEditingMaterial.id && v.name.toLowerCase() === materialToSave.name.trim().toLowerCase())) {
        return;
      }
      updateValuableData(isEditingMaterial.id, materialToSave);
    } else {
      if (settings.valuables.some(v => v.name.toLowerCase() === materialToSave.name.trim().toLowerCase())) {
        return;
      }
      addValuable(materialToSave);
    }
    resetCustomMaterialForm();
  };

  const resetCustomMaterialForm = () => {
    setIsEditingMaterial(null);
    setCustomMaterialForm({ name: '', price: 0, unit: 'gram', icon: 'other', iconColor: '#808080' });
  };

  const handleEditValuable = (valuable: Valuable) => {
    setIsEditingMaterial(valuable);
    setCustomMaterialForm({
      name: valuable.name,
      price: valuable.price,
      unit: valuable.unit,
      icon: valuable.icon,
      iconColor: valuable.iconColor || '#808080',
    });
    const formElement = document.getElementById('custom-material-form-section');
    formElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  
  const handleDeleteValuable = (valuableId: string) => {
    const valuableToRemove = settings.valuables.find(v => v.id === valuableId);
    if (valuableToRemove?.isDefault) {
        return;
    }
    removeValuableFromContext(valuableId);
    if (isEditingMaterial && isEditingMaterial.id === valuableId) {
        resetCustomMaterialForm();
    }
  };

  const handleSaveAllSettings = () => {
    updateSettings(localSettings);
    // These functions need to be called to update the global state
    // since some parts of the context rely on their own logic (like adding suggestions)
    localSettings.productSuggestions.forEach(p => addOrUpdateProductSuggestion(p.name, p.hsnCode));
    // Check for removed suggestions
    settings.productSuggestions.forEach(oldP => {
        if (!localSettings.productSuggestions.some(newP => newP.name === oldP.name)) {
            removeProductSuggestion(oldP.name);
        }
    });

    updateCurrencySymbol(localSettings.currencySymbol);
    toggleEnableColorBilling(localSettings.enableColorBilling); 
    updatePdfLogoPosition(localSettings.pdfLogoPosition);
    
    localSettings.valuables.forEach(val => {
      const originalValInContext = settings.valuables.find(v => v.id === val.id);
      if (originalValInContext && JSON.stringify(val) !== JSON.stringify(originalValInContext)) {
        const { id, isDefault, ...updatableDataFromLocal } = val;
        
        let dataToUpdateInContext: Partial<Omit<Valuable, 'id' | 'isDefault'>> = {
            price: Number(updatableDataFromLocal.price) || 0,
            unit: updatableDataFromLocal.unit,
            selectedInHeader: updatableDataFromLocal.selectedInHeader,
        };

        if (!isDefault) { 
            dataToUpdateInContext.name = updatableDataFromLocal.name;
            dataToUpdateInContext.icon = updatableDataFromLocal.icon;
            dataToUpdateInContext.iconColor = updatableDataFromLocal.iconColor;
        }
        updateValuableData(id, dataToUpdateInContext);
      }
    });
  };

  const SectionHeader: React.FC<{ title: string; icon: React.ElementType; className?: string; id?:string }> = ({ title, icon: Icon, className, id }) => (
    <h3 id={id} className={cn("text-xl lg:text-2xl font-headline mb-6 text-primary flex items-center scroll-mt-20", className)}>
      <Icon className="mr-3 h-7 w-7 text-primary/80" />
      {title}
    </h3>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <SidebarMenuButton tooltip="Settings">
            <SettingsIcon/>
            <span>Settings</span>
        </SidebarMenuButton>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl flex flex-col">
        <SheetHeader className="pb-6 border-b">
          <SheetTitle className="font-headline text-3xl lg:text-4xl">Application Settings</SheetTitle>
          <SheetDescription className="text-lg">
            Manage configurations for your Goldsmith Buddy application.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6 mb-4">
          <div className="space-y-12 py-10">
            
            <section>
              <SectionHeader title="Company Information" icon={Info} />
              <div className="space-y-6">
                <div>
                  <Label htmlFor="companyName" className="text-lg">Company Name</Label>
                  <Input id="companyName" value={localSettings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} className="mt-1.5 text-lg h-12"/>
                </div>
                <div>
                  <Label htmlFor="slogan" className="text-lg">Slogan / Tagline</Label>
                  <Input id="slogan" value={localSettings.slogan} onChange={(e) => handleChange('slogan', e.target.value)} className="mt-1.5 text-lg h-12"/>
                </div>
                <div>
                  <Label htmlFor="address" className="text-lg">Address</Label>
                  <Input id="address" value={localSettings.address} onChange={(e) => handleChange('address', e.target.value)} className="mt-1.5 text-lg h-12"/>
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-lg">Phone Number</Label>
                  <Input id="phoneNumber" value={localSettings.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} className="mt-1.5 text-lg h-12"/>
                </div>
                <div>
                  <Label htmlFor="gstin" className="text-lg">GSTIN</Label>
                  <Input id="gstin" value={localSettings.gstin || ''} onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())} className="mt-1.5 text-lg h-12" placeholder="Enter company GSTIN"/>
                </div>
              </div>
            </section>
            
            <Separator />
             <section>
                <SectionHeader title="Currency Settings" icon={CreditCard} />
                <div>
                  <Label htmlFor="currencySymbol" className="text-lg">Currency</Label>
                  <Select
                    value={localSettings.currencySymbol}
                    onValueChange={handleCurrencyChange}
                  >
                    <SelectTrigger id="currencySymbol" className="mt-1.5 h-12 text-lg">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.symbol} className="text-lg py-2.5">
                          {currency.symbol} - {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   <p className="text-base text-muted-foreground mt-2 italic">
                    Selected currency will be used across the application.
                  </p>
                </div>
              </section>
            <Separator />

            <section>
                <SectionHeader title="Company Logo & Print Options" icon={Paintbrush} />
                <div className="space-y-5">
                    <div className="flex items-center space-x-3.5 p-3.5 bg-muted/30 rounded-md">
                        <Checkbox
                            id="showCompanyLogo"
                            checked={localSettings.showCompanyLogo} 
                            onCheckedChange={(checked) => {
                                handleChange('showCompanyLogo', !!checked); 
                            }}
                            className="w-5 h-5"
                        />
                        <Label htmlFor="showCompanyLogo" className="text-lg font-medium leading-none cursor-pointer">
                            Show company logo on bills & estimates
                        </Label>
                    </div>
                    {localSettings.showCompanyLogo && (
                        <div className="mt-3.5 space-y-3.5 p-4 border rounded-md">
                            <Input
                                id="logoUpload"
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                ref={fileInputRef}
                                className="text-lg file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-base file:bg-primary/10 file:text-primary hover:file:bg-primary/20 h-12"
                            />
                            {localSettings.companyLogo && (
                                <div className="mt-2.5 p-3.5 border rounded-md bg-muted/50 inline-flex flex-col items-center shadow-sm">
                                    <Image src={localSettings.companyLogo} alt="Company Logo Preview" width={160} height={160} className="object-contain rounded" />
                                    <Button variant="link" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive-foreground hover:bg-destructive mt-2.5 text-base px-3 py-1.5 h-auto">
                                      <XCircle className="mr-1.5 h-4 w-4" /> Remove Logo
                                    </Button>
                                </div>
                            )}
                            {!localSettings.companyLogo && (
                                <p className="text-base text-muted-foreground mt-1.5 italic">No logo uploaded. A default placeholder will be used if enabled.</p>
                            )}
                             <div className="mt-4">
                                <Label htmlFor="pdfLogoPosition" className="text-lg">PDF Logo Position</Label>
                                <Select
                                    value={localSettings.pdfLogoPosition}
                                    onValueChange={(value: PdfLogoPosition) => handleChange('pdfLogoPosition', value)}
                                >
                                    <SelectTrigger id="pdfLogoPosition" className="mt-1.5 h-12 text-lg">
                                        <SelectValue placeholder="Select logo position" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="top-center" className="text-lg py-2.5">Top Center</SelectItem>
                                        <SelectItem value="top-left" className="text-lg py-2.5">Top Left</SelectItem>
                                        <SelectItem value="inline-left" className="text-lg py-2.5">Inline (Left of Name)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-base text-muted-foreground mt-2 italic">
                                    Choose where the company logo appears on generated PDF documents.
                                </p>
                            </div>
                        </div>
                    )}
                     <div className="flex items-center space-x-3.5 p-3.5 bg-muted/30 rounded-md mt-4">
                        <Checkbox
                            id="enableColorBilling"
                            checked={localSettings.enableColorBilling} 
                            onCheckedChange={(checked) => {
                                handleChange('enableColorBilling', !!checked); 
                            }}
                            className="w-5 h-5"
                        />
                        <Label htmlFor="enableColorBilling" className="text-lg font-medium leading-none cursor-pointer">
                            Enable Colour PDF Bills & Estimates
                        </Label>
                    </div>
                     <p className="text-base text-muted-foreground mt-1.5 italic">
                        When enabled, PDFs will use theme colors. Otherwise, they will be monochrome.
                    </p>
                </div>
            </section>
            <Separator />

            <section id="custom-material-form-section">
                <SectionHeader title="Manage All Materials" icon={Banknote} />
                <div className="mb-8 p-5 border rounded-lg bg-background shadow-md space-y-5">
                    <h4 className="text-xl font-semibold text-accent">{isEditingMaterial ? 'Edit Material' : 'Add New Material'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <Label htmlFor="customMaterialName" className="text-lg">Name</Label>
                            <Input id="customMaterialName" value={customMaterialForm.name} onChange={e => handleCustomMaterialFormChange('name', e.target.value)} className="mt-1.5 h-12 text-lg" placeholder="e.g., Emerald, Platinum Bar" />
                        </div>
                        <div>
                            <Label htmlFor="customMaterialPrice" className="text-lg">Price ({settings.currencySymbol})</Label>
                            <Input id="customMaterialPrice" type="number" value={customMaterialForm.price} onChange={e => handleCustomMaterialFormChange('price', parseFloat(e.target.value) || 0)} className="mt-1.5 h-12 text-lg" min="0" />
                        </div>
                        <div>
                            <Label htmlFor="customMaterialUnit" className="text-lg">Unit</Label>
                            <Input id="customMaterialUnit" value={customMaterialForm.unit} onChange={e => handleCustomMaterialFormChange('unit', e.target.value)} className="mt-1.5 h-12 text-lg" placeholder="e.g., gram, carat, piece" />
                        </div>
                        <div>
                            <Label htmlFor="customMaterialIcon" className="text-lg">Icon</Label>
                            <Select value={customMaterialForm.icon} onValueChange={val => handleCustomMaterialFormChange('icon', val as Valuable['icon'])}>
                                <SelectTrigger className="mt-1.5 h-12 text-lg"> <SelectValue placeholder="Select icon" /></SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_ICONS.map(icon => (
                                        <SelectItem key={icon.value} value={icon.value} className="text-lg py-2.5 flex items-center">
                                           <ValuableIcon valuableType={icon.value} className="w-5 h-5 mr-3" color={icon.value === 'custom-gem' ? customMaterialForm.iconColor : undefined} /> {icon.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {customMaterialForm.icon === 'custom-gem' && (
                             <div>
                                <Label htmlFor="customMaterialIconColor" className="text-lg flex items-center"><Palette className="w-5 h-5 mr-2"/>Icon Color</Label>
                                <Input id="customMaterialIconColor" type="color" value={customMaterialForm.iconColor || '#808080'} onChange={e => handleCustomMaterialFormChange('iconColor', e.target.value)} className="mt-1.5 h-12 text-lg w-full"/>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end space-x-3 pt-3">
                        {isEditingMaterial && <Button variant="outline" onClick={resetCustomMaterialForm} className="text-lg px-5 py-2.5 h-auto">Cancel Edit</Button>}
                        <Button onClick={handleSaveCustomMaterial} className="text-lg px-5 py-2.5 h-auto shadow-md hover:shadow-lg">
                            <Save className="mr-2 h-5 w-5" /> {isEditingMaterial ? 'Update Material' : 'Add Material'}
                        </Button>
                    </div>
                </div>

                <h4 className="text-xl font-semibold mb-4 text-accent">Current Materials List</h4>
                <div className="space-y-5">
                    {localSettings.valuables.sort((a,b) => a.name.localeCompare(b.name)).map((valuable) => (
                    <div key={valuable.id} className="p-5 border rounded-lg space-y-5 bg-card shadow-md hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-8 h-8 mr-4 text-primary" />
                                {valuable.isDefault ? 
                                    <span className="text-xl font-semibold mr-2">{valuable.name}</span> :
                                    <Input
                                    value={valuable.name}
                                    onChange={(e) => handleLocalValuableChange(valuable.id, 'name', e.target.value)}
                                    className="text-xl font-semibold mr-2 w-auto inline-flex h-11 bg-transparent border-0 focus:ring-1 focus:ring-primary"
                                    />
                                }
                            </div>
                            <div className="flex items-center space-x-3">
                                <Checkbox
                                id={`select-${valuable.id}`}
                                checked={valuable.selectedInHeader}
                                onCheckedChange={() => {
                                    toggleValuableInHeader(valuable.id); 
                                    handleLocalValuableChange(valuable.id, 'selectedInHeader', !valuable.selectedInHeader);
                                }}
                                className="w-5 h-5"
                                />
                                <Label htmlFor={`select-${valuable.id}`} className="text-base cursor-pointer">Show in Header</Label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <Label htmlFor={`price-${valuable.id}`} className="text-lg">Market Price ({settings.currencySymbol})</Label>
                                <Input
                                id={`price-${valuable.id}`}
                                type="number"
                                value={valuable.price}
                                onChange={(e) => handleLocalValuableChange(valuable.id, 'price', parseFloat(e.target.value))}
                                className="mt-1.5 h-12 text-lg"
                                min="0"
                                />
                            </div>
                            <div>
                                <Label htmlFor={`unit-${valuable.id}`} className="text-lg">Unit</Label>
                                <Input
                                id={`unit-${valuable.id}`}
                                value={valuable.unit}
                                onChange={(e) => handleLocalValuableChange(valuable.id, 'unit', e.target.value)}
                                className="mt-1.5 h-12 text-lg"
                                disabled={valuable.isDefault && ['gold', 'silver', 'diamond', 'platinum'].includes(valuable.icon)}
                                />
                            </div>
                             {!valuable.isDefault && (
                                <>
                                <div>
                                    <Label htmlFor={`icon-select-${valuable.id}`} className="text-lg">Icon</Label>
                                    <Select 
                                        value={valuable.icon} 
                                        onValueChange={(newIcon) => handleLocalValuableChange(valuable.id, 'icon', newIcon)}
                                    >
                                        <SelectTrigger id={`icon-select-${valuable.id}`} className="mt-1.5 h-12 text-lg">
                                            <SelectValue placeholder="Select icon" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_ICONS.map(iconOpt => (
                                                <SelectItem key={iconOpt.value} value={iconOpt.value} className="text-lg py-2.5 flex items-center">
                                                    <ValuableIcon valuableType={iconOpt.value} className="w-5 h-5 mr-3" color={iconOpt.value === 'custom-gem' ? valuable.iconColor : undefined} /> {iconOpt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {valuable.icon === 'custom-gem' && (
                                    <div>
                                        <Label htmlFor={`icon-color-${valuable.id}`} className="text-lg flex items-center"><Palette className="w-5 h-5 mr-2"/>Icon Color</Label>
                                        <Input 
                                            id={`icon-color-${valuable.id}`} 
                                            type="color" 
                                            value={valuable.iconColor || '#808080'} 
                                            onChange={(e) => handleLocalValuableChange(valuable.id, 'iconColor', e.target.value)} 
                                            className="mt-1.5 h-12 text-lg w-full"
                                        />
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                        {!valuable.isDefault && (
                            <div className="flex justify-end space-x-2.5 pt-2">
                                <Button variant="outline" size="sm" onClick={() => handleEditValuable(valuable)} className="text-base px-3 py-1.5 h-auto">
                                    <Edit3 className="mr-2 h-4 w-4"/> Edit in Form
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" className="text-base px-3 py-1.5 h-auto">
                                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl">Confirm Deletion</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base">
                                            Are you sure you want to delete the material "{valuable.name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel className="text-base h-auto px-4 py-2">Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteValuable(valuable.id)} className="bg-destructive hover:bg-destructive/90 text-base h-auto px-4 py-2">
                                            Delete Material
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>
                    ))}
                </div>
            </section>


            <Separator />

            <section>
              <SectionHeader title="Product Name & HSN Suggestions" icon={Tag} />
              <div className="space-y-4 mb-5">
                <Label htmlFor="newProductName" className="font-medium text-lg">Add New Product Suggestion</Label>
                <div className="flex space-x-2.5">
                  <Input
                    id="newProductName"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g., Ring, Bangle, Earring"
                    className="h-12 text-lg"
                  />
                  <Button onClick={handleAddProductSuggestion} size="default" className="h-12 shadow hover:shadow-md transition-shadow text-lg px-5">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add
                  </Button>
                </div>
              </div>
              {localSettings.productSuggestions.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border rounded-md p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-[2fr_1fr_auto] gap-x-4 items-center px-3 py-2 font-semibold text-muted-foreground">
                      <span>Product Name</span>
                      <span>HSN Code</span>
                      <span className="text-right">Action</span>
                  </div>
                  {localSettings.productSuggestions.map((product) => (
                    <div key={product.name} className="grid grid-cols-[2fr_1fr_auto] gap-x-4 items-center p-3 bg-card rounded shadow-sm">
                      <span className="text-lg font-medium">{product.name}</span>
                      <Input
                        value={product.hsnCode}
                        onChange={(e) => handleProductSuggestionHsnChange(product.name, e.target.value)}
                        placeholder="HSN Code"
                        className="h-11 text-base"
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the product suggestion "{product.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveProductSuggestion(product.name)} className="bg-destructive hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-lg text-muted-foreground italic">No custom product names added yet.</p>
              )}
              <p className="text-base text-muted-foreground mt-3">
                HSN codes are automatically saved here when you create bills. You can also edit them manually.
              </p>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Default Making Charge (Sales)" icon={Package} />
              <div className="grid grid-cols-2 gap-5 p-5 border rounded-lg bg-card shadow-sm">
                 <div>
                    <Label htmlFor="defaultMakingChargeType" className="text-lg">Type</Label>
                    <Select
                        value={localSettings.defaultMakingCharge?.type || 'percentage'}
                        onValueChange={(value: 'percentage' | 'fixed') => handleNestedChange('defaultMakingCharge', 'type', value)}
                    >
                        <SelectTrigger id="defaultMakingChargeType" className="mt-1.5 h-12 text-lg">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage" className="text-lg py-2.5">Percentage (%)</SelectItem>
                            <SelectItem value="fixed" className="text-lg py-2.5">Fixed Amount ({settings.currencySymbol})</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                  <Label htmlFor="defaultMakingChargeValue" className="text-lg">Value</Label>
                  <Input
                    id="defaultMakingChargeValue"
                    type="number"
                    value={localSettings.defaultMakingCharge?.value || 0}
                    onChange={(e) => handleNestedChange('defaultMakingCharge', 'value', parseFloat(e.target.value))}
                    className="mt-1.5 h-12 text-lg"
                    min="0"
                  />
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Tax Rates (Sales)" icon={Percent} />
              <div className="grid grid-cols-2 gap-5 p-5 border rounded-lg bg-card shadow-sm">
                <div>
                  <Label htmlFor="cgstRate" className="text-lg">CGST Rate (%)</Label>
                  <Input id="cgstRate" type="number" value={localSettings.cgstRate} onChange={(e) => handleChange('cgstRate', parseFloat(e.target.value))} className="mt-1.5 h-12 text-lg" min="0"/>
                </div>
                <div>
                  <Label htmlFor="sgstRate" className="text-lg">SGST Rate (%)</Label>
                  <Input id="sgstRate" type="number" value={localSettings.sgstRate} onChange={(e) => handleChange('sgstRate', parseFloat(e.target.value))} className="mt-1.5 h-12 text-lg" min="0"/>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <SectionHeader title="Default Purchase Item Setup" icon={Package} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 border rounded-lg bg-card shadow-sm">
                <div>
                  <Label htmlFor="defaultPurchaseItemNetPercentage" className="text-lg">Default Net % Off Market</Label>
                  <Input
                    id="defaultPurchaseItemNetPercentage"
                    type="number"
                    value={localSettings.defaultPurchaseItemNetPercentage}
                    onChange={(e) => handleChange('defaultPurchaseItemNetPercentage', parseFloat(e.target.value))}
                    placeholder="e.g., 10 for 10% deduction"
                    className="mt-1.5 h-12 text-lg"
                     min="0"
                  />
                   <p className="text-base text-muted-foreground mt-2 italic">
                    Applied if 'Net % Off Market' is chosen for a new purchase item.
                  </p>
                </div>
                <div>
                  <Label htmlFor="defaultPurchaseItemNetFixedValue" className="text-lg">Default Fixed Net Rate ({settings.currencySymbol})</Label>
                  <Input
                    id="defaultPurchaseItemNetFixedValue"
                    type="number"
                    value={localSettings.defaultPurchaseItemNetFixedValue}
                    onChange={(e) => handleChange('defaultPurchaseItemNetFixedValue', parseFloat(e.target.value))}
                    placeholder="e.g., 4500"
                    className="mt-1.5 h-12 text-lg"
                     min="0"
                  />
                   <p className="text-base text-muted-foreground mt-2 italic">
                    Applied if 'Fixed Net Rate' is chosen for a new purchase item.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </ScrollArea>
        <SheetFooter className="p-5 border-t mt-auto">
          <SheetClose asChild>
            <Button variant="outline" className="shadow hover:shadow-md transition-shadow text-lg px-6 py-3 h-auto">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button onClick={handleSaveAllSettings} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
              <Save className="mr-2.5 h-5 w-5" /> Save All Settings
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsPanel;
