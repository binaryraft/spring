"use client";
import { useAppContext } from "@/contexts/AppContext";
import type { Valuable, Settings, MakingChargeSetting, CurrencyDefinition, PdfLogoPosition, ProductSuggestion, ValuableIconType } from "@/types";
import { AVAILABLE_ICONS, AVAILABLE_CURRENCIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Save, PlusCircle, Trash2, XCircle, Info, Tag, Package, Percent, Banknote, CreditCard, Edit3, Palette, Paintbrush, Loader2, Check, Wrench, GripVertical, Upload, Download, Database, Network } from "lucide-react"; 
import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ValuableIcon from "@/components/ValuableIcon";
import Image from "next/image";
import { cn } from "@/lib/utils"; 
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableValuableCard({ 
    valuable, 
    currencySymbol,
    handleLocalValuableChange, 
    handleEditValuable,
    handleDeleteValuable
}: { 
    valuable: Valuable, 
    currencySymbol: string,
    handleLocalValuableChange: (valuableId: string, field: keyof Valuable, value: any) => void,
    handleEditValuable: (valuable: Valuable) => void,
    handleDeleteValuable: (valuableId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: valuable.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute top-1/2 -left-8 -translate-y-1/2" {...attributes} {...listeners}>
        <GripVertical className="h-8 w-8 text-muted-foreground cursor-grab active:cursor-grabbing" />
      </div>
      <div key={valuable.id} className="p-4 border rounded-lg space-y-4 bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <ValuableIcon valuableType={valuable.icon} color={valuable.iconColor} className="w-7 h-7 text-primary" />
                  {valuable.isDefault ? 
                      <span className="text-lg font-semibold">{valuable.name}</span> :
                      <Input value={valuable.name} onChange={(e) => handleLocalValuableChange(valuable.id, 'name', e.target.value)} className="text-lg font-semibold mr-2 w-auto inline-flex h-10 bg-transparent border-0 focus:ring-1 focus:ring-primary"/>
                  }
              </div>
              <div className="flex items-center space-x-3">
                  <Checkbox id={`select-${valuable.id}`} checked={valuable.selectedInHeader} onCheckedChange={(checked) => handleLocalValuableChange(valuable.id, 'selectedInHeader', !!checked)} className="w-5 h-5"/>
                  <Label htmlFor={`select-${valuable.id}`} className="text-sm font-medium cursor-pointer">Show in Header</Label>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                  <Label htmlFor={`price-${valuable.id}`} className="text-sm font-medium">Market Price ({currencySymbol})</Label>
                  <Input id={`price-${valuable.id}`} type="number" value={valuable.price} onChange={(e) => handleLocalValuableChange(valuable.id, 'price', parseFloat(e.target.value))} className="mt-1.5 h-11 text-base" min="0"/>
              </div>
              <div>
                  <Label htmlFor={`unit-${valuable.id}`} className="text-sm font-medium">Unit</Label>
                  <Input id={`unit-${valuable.id}`} value={valuable.unit} onChange={(e) => handleLocalValuableChange(valuable.id, 'unit', e.target.value)} className="mt-1.5 h-11 text-base" disabled={valuable.isDefault && ['gold', 'silver', 'diamond', 'platinum'].includes(valuable.icon)}/>
              </div>
              {!valuable.isDefault && (
                  <>
                  <div>
                      <Label htmlFor={`icon-select-${valuable.id}`} className="text-sm font-medium">Icon</Label>
                      <Select value={valuable.icon} onValueChange={(newIcon) => handleLocalValuableChange(valuable.id, 'icon', newIcon as ValuableIconType)}>
                          <SelectTrigger id={`icon-select-${valuable.id}`} className="mt-1.5 h-11 text-base"><SelectValue placeholder="Select icon" /></SelectTrigger>
                          <SelectContent>
                              {AVAILABLE_ICONS.map(iconOpt => (<SelectItem key={iconOpt.value} value={iconOpt.value} className="text-base py-2 flex items-center"><ValuableIcon valuableType={iconOpt.value} className="w-5 h-5 mr-3" color={iconOpt.value === 'custom-gem' ? valuable.iconColor : undefined} /> {iconOpt.label}</SelectItem>))}
                          </SelectContent>
                      </Select>
                  </div>
                  {valuable.icon === 'custom-gem' && (
                      <div>
                          <Label htmlFor={`icon-color-${valuable.id}`} className="text-sm font-medium flex items-center"><Palette className="w-4 h-4 mr-2"/>Icon Color</Label>
                          <Input id={`icon-color-${valuable.id}`} type="color" value={valuable.iconColor || '#808080'} onChange={(e) => handleLocalValuableChange(valuable.id, 'iconColor', e.target.value)} className="mt-1.5 h-11 text-base w-full"/>
                      </div>
                  )}
                  </>
              )}
          </div>
          {!valuable.isDefault && (
              <div className="flex justify-end space-x-2.5 pt-2 border-t mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleEditValuable(valuable)} className="text-sm px-3 py-1.5 h-auto"><Edit3 className="mr-1.5 h-4 w-4"/> Edit in Form</Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="text-sm px-3 py-1.5 h-auto"><Trash2 className="mr-1.5 h-4 w-4"/> Delete</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl">Confirm Deletion</AlertDialogTitle>
                              <AlertDialogDescription className="text-base">Are you sure you want to delete the material "{valuable.name}"? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel className="text-base h-auto px-4 py-2">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteValuable(valuable.id)} className="bg-destructive hover:bg-destructive/90 text-base h-auto px-4 py-2">Delete Material</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              </div>
          )}
      </div>
    </div>
  );
}


export default function SettingsPage() {
  const { settings, updateSettings } = useAppContext();
  
  const [localSettings, setLocalSettings] = useState<Settings>(() => JSON.parse(JSON.stringify(settings))); 
  const [newProductName, setNewProductName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const [isEditingMaterial, setIsEditingMaterial] = useState<Valuable | null>(null);
  const [customMaterialForm, setCustomMaterialForm] = useState<Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault'>>({
    name: '', price: 0, unit: 'gram', icon: 'other', iconColor: '#808080'
  });
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState('company');
  const [importedSettings, setImportedSettings] = useState<Settings | null>(null);

  useEffect(() => {
    setLocalSettings(JSON.parse(JSON.stringify(settings))); 
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
        handleChange('companyLogo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    handleChange('companyLogo', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handleCustomMaterialFormChange = (field: keyof typeof customMaterialForm, value: any) => {
    setCustomMaterialForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveCustomMaterial = () => {
    if (!customMaterialForm.name.trim() || !customMaterialForm.unit.trim() || customMaterialForm.price < 0) return;

    const materialToSave: Omit<Valuable, 'id' | 'selectedInHeader' | 'isDefault' | 'price'> & { price: number } = {
      ...customMaterialForm,
      price: Number(customMaterialForm.price) || 0,
      iconColor: customMaterialForm.icon === 'custom-gem' ? (customMaterialForm.iconColor || '#808080') : undefined,
    };
    
    const materialNameExists = (name: string, currentId?: string) => 
        localSettings.valuables.some(v => v.id !== currentId && v.name.toLowerCase() === name.trim().toLowerCase());

    if (isEditingMaterial) {
      if (materialNameExists(materialToSave.name, isEditingMaterial.id)) return;
      setLocalSettings(prev => ({
        ...prev,
        valuables: prev.valuables.map(v => v.id === isEditingMaterial.id ? { ...v, ...materialToSave } : v),
      }));
    } else {
      if (materialNameExists(materialToSave.name)) return;
      const newFullValuable: Valuable = {
        ...materialToSave,
        id: uuidv4(),
        selectedInHeader: false,
        isDefault: false,
      };
      setLocalSettings(prev => ({
        ...prev,
        valuables: [...prev.valuables, newFullValuable],
      }));
    }
    resetCustomMaterialForm();
  };

  const resetCustomMaterialForm = () => {
    setIsEditingMaterial(null);
    setCustomMaterialForm({ name: '', price: 0, unit: 'gram', icon: 'other', iconColor: '#808080' });
  };

  const handleEditValuable = (valuable: Valuable) => {
    setActiveTab('materials');
    setIsEditingMaterial(valuable);
    setCustomMaterialForm({
      name: valuable.name,
      price: valuable.price,
      unit: valuable.unit,
      icon: valuable.icon,
      iconColor: valuable.iconColor || '#808080',
    });
    const formElement = document.getElementById('manage-materials-card');
    formElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  
  const handleDeleteValuable = (valuableId: string) => {
    const valuableToRemove = localSettings.valuables.find(v => v.id === valuableId);
    if (valuableToRemove?.isDefault) return;
    setLocalSettings(prev => ({
      ...prev,
      valuables: prev.valuables.filter(v => v.id !== valuableId),
    }));
    if (isEditingMaterial && isEditingMaterial.id === valuableId) {
        resetCustomMaterialForm();
    }
  };

  const handleSaveAllSettings = () => {
    setSaveState('saving');
    updateSettings(localSettings);
    setTimeout(() => {
        setSaveState('saved');
        setTimeout(() => {
            setSaveState('idle');
        }, 2000);
    }, 1200);
  };
  
  const navItems = [
    { id: 'company', label: 'Company Info', icon: Info },
    { id: 'appearance', label: 'Appearance', icon: Paintbrush },
    { id: 'materials', label: 'Materials', icon: Banknote },
    { id: 'products', label: 'Products & HSN', icon: Tag },
    { id: 'billing', label: 'Billing Defaults', icon: Package },
    { id: 'features', label: 'Features', icon: Wrench },
    { id: 'data', label: 'Backup & Restore', icon: Database },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalSettings((prev) => {
        const oldIndex = prev.valuables.findIndex((v) => v.id === active.id);
        const newIndex = prev.valuables.findIndex((v) => v.id === over.id);
        return {
          ...prev,
          valuables: arrayMove(prev.valuables, oldIndex, newIndex),
        };
      });
    }
  };

  const handleExportSettings = () => {
    const jsonString = JSON.stringify(localSettings, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spring-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
  };

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string') throw new Error("File content is not text.");
          const parsedSettings = JSON.parse(text);
          
          if (parsedSettings.companyName && Array.isArray(parsedSettings.valuables)) {
            setImportedSettings(parsedSettings as Settings);
          } else {
            alert('Invalid or corrupted settings file.');
          }
        } catch (error) {
          console.error("Error parsing settings file:", error);
          alert('Failed to read or parse the settings file.');
        } finally {
          if (event.target) {
            event.target.value = '';
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = () => {
    if (importedSettings) {
      setLocalSettings(importedSettings);
      setImportedSettings(null);
    }
  };


  return (
    <div className="space-y-8">
        <div className="space-y-1">
            <h1 className="text-3xl lg:text-4xl font-headline text-primary flex items-center">
                <SettingsIcon className="mr-3 h-8 w-8" />
                Application Settings
            </h1>
            <p className="text-lg text-muted-foreground">
                Select a category to manage its settings.
            </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-12 items-start">
            {/* Left Navigation */}
            <div className="p-2 rounded-lg bg-card border shadow-sm sticky top-8">
              <nav>
                <ul className="space-y-1">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <Button
                        variant={activeTab === item.id ? 'secondary' : 'ghost'}
                        onClick={() => setActiveTab(item.id)}
                        className="w-full justify-start text-base h-12 px-4"
                      >
                        <item.icon className="mr-3 h-5 w-5 text-muted-foreground" />
                        {item.label}
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Right Content Area */}
            <div className="space-y-8">
              {activeTab === 'company' && (
                  <Card className="shadow-lg border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                            <Info className="mr-3 h-6 w-6 text-primary"/> Company Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Label htmlFor="companyName" className="text-base font-medium">Company Name</Label>
                              <Input id="companyName" value={localSettings.companyName} onChange={(e) => handleChange('companyName', e.target.value)} className="mt-1.5 text-base h-11"/>
                            </div>
                            <div>
                              <Label htmlFor="slogan" className="text-base font-medium">Slogan / Tagline</Label>
                              <Input id="slogan" value={localSettings.slogan} onChange={(e) => handleChange('slogan', e.target.value)} className="mt-1.5 text-base h-11"/>
                            </div>
                        </div>
                        <div>
                          <Label htmlFor="place" className="text-base font-medium">Place</Label>
                          <Input id="place" value={localSettings.place} onChange={(e) => handleChange('place', e.target.value)} className="mt-1.5 text-base h-11"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Label htmlFor="phoneNumber" className="text-base font-medium">Phone Number</Label>
                              <Input id="phoneNumber" value={localSettings.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} className="mt-1.5 text-base h-11"/>
                            </div>
                            <div>
                              <Label htmlFor="gstin" className="text-base font-medium">GSTIN</Label>
                              <Input id="gstin" value={localSettings.gstin || ''} onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())} className="mt-1.5 text-base h-11" placeholder="Enter company GSTIN"/>
                            </div>
                        </div>
                    </CardContent>
                  </Card>
              )}

              {activeTab === 'appearance' && (
                <>
                  <Card className="shadow-lg border-border">
                      <CardHeader>
                          <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                              <CreditCard className="mr-3 h-6 w-6 text-primary"/> Currency Settings
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Label htmlFor="currencySymbol" className="text-base font-medium">Currency</Label>
                            <Select value={localSettings.currencySymbol} onValueChange={handleCurrencyChange}>
                              <SelectTrigger id="currencySymbol" className="mt-1.5 h-11 text-base">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_CURRENCIES.map((currency) => (
                                  <SelectItem key={currency.code} value={currency.symbol} className="text-base py-2">
                                    {currency.symbol} - {currency.name} ({currency.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              Selected currency will be used across the application.
                            </p>
                      </CardContent>
                  </Card>

                  <Card className="shadow-lg border-border">
                      <CardHeader>
                          <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                              <Paintbrush className="mr-3 h-6 w-6 text-primary"/> Print &amp; Appearance
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                              <Checkbox id="showCompanyLogo" checked={localSettings.showCompanyLogo} onCheckedChange={(checked) => handleChange('showCompanyLogo', !!checked)} className="w-5 h-5"/>
                              <Label htmlFor="showCompanyLogo" className="text-base font-medium leading-none cursor-pointer">Show company logo on PDFs</Label>
                          </div>
                          {localSettings.showCompanyLogo && (
                              <div className="space-y-4">
                                  <div>
                                      <Label htmlFor="pdfLogoPosition" className="text-base font-medium">PDF Logo Position</Label>
                                      <Select value={localSettings.pdfLogoPosition} onValueChange={(value: PdfLogoPosition) => handleChange('pdfLogoPosition', value)}>
                                          <SelectTrigger id="pdfLogoPosition" className="mt-1.5 h-11 text-base"><SelectValue placeholder="Select logo position" /></SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="top-center" className="text-base py-2">Top Center</SelectItem>
                                              <SelectItem value="top-left" className="text-base py-2">Top Left</SelectItem>
                                              <SelectItem value="inline-left" className="text-base py-2">Inline (Left of Name)</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <Input id="logoUpload" type="file" accept="image/*" onChange={handleLogoUpload} ref={fileInputRef} className="text-base file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20 h-11 flex-grow"/>
                                      {localSettings.companyLogo && (
                                          <Button variant="link" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive-foreground hover:bg-destructive text-sm px-3 py-1.5 h-auto">
                                              <XCircle className="mr-1.5 h-4 w-4" /> Remove
                                          </Button>
                                      )}
                                  </div>
                                  {localSettings.companyLogo && (
                                      <div className="mt-2.5 p-3 border rounded-md bg-muted/50 inline-block shadow-sm">
                                          <Image src={localSettings.companyLogo} alt="Company Logo Preview" width={120} height={120} className="object-contain rounded" />
                                      </div>
                                  )}
                              </div>
                          )}
                          <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                              <Checkbox id="enableColorBilling" checked={localSettings.enableColorBilling} onCheckedChange={(checked) => handleChange('enableColorBilling', !!checked)} className="w-5 h-5"/>
                              <Label htmlFor="enableColorBilling" className="text-base font-medium leading-none cursor-pointer">Enable Colour PDF Bills &amp; Estimates</Label>
                          </div>
                      </CardContent>
                  </Card>
                </>
              )}
              
              {activeTab === 'materials' && (
                <Card id="manage-materials-card" className="shadow-lg border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                            <Banknote className="mr-3 h-6 w-6 text-primary"/> Manage Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-8 p-5 border rounded-lg bg-background shadow-md space-y-5">
                            <h4 className="text-lg font-semibold text-muted-foreground">{isEditingMaterial ? 'Edit Material' : 'Add New Material'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
                                <div>
                                    <Label htmlFor="customMaterialName" className="text-base font-medium">Name</Label>
                                    <Input id="customMaterialName" value={customMaterialForm.name} onChange={e => handleCustomMaterialFormChange('name', e.target.value)} className="mt-1.5 h-11 text-base" placeholder="e.g., Emerald, Platinum Bar" />
                                </div>
                                <div>
                                    <Label htmlFor="customMaterialPrice" className="text-base font-medium">Price ({localSettings.currencySymbol})</Label>
                                    <Input id="customMaterialPrice" type="number" value={customMaterialForm.price} onChange={e => handleCustomMaterialFormChange('price', parseFloat(e.target.value) || 0)} className="mt-1.5 h-11 text-base" min="0" />
                                </div>
                                <div>
                                    <Label htmlFor="customMaterialUnit" className="text-base font-medium">Unit</Label>
                                    <Input id="customMaterialUnit" value={customMaterialForm.unit} onChange={e => handleCustomMaterialFormChange('unit', e.target.value)} className="mt-1.5 h-11 text-base" placeholder="e.g., gram, carat" />
                                </div>
                                <div>
                                    <Label htmlFor="customMaterialIcon" className="text-base font-medium">Icon</Label>
                                    <Select value={customMaterialForm.icon} onValueChange={val => handleCustomMaterialFormChange('icon', val as ValuableIconType)}>
                                        <SelectTrigger className="mt-1.5 h-11 text-base"> <SelectValue placeholder="Select icon" /></SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_ICONS.map(icon => (
                                                <SelectItem key={icon.value} value={icon.value} className="text-base py-2 flex items-center">
                                                  <ValuableIcon valuableType={icon.value} className="w-5 h-5 mr-3" color={icon.value === 'custom-gem' ? customMaterialForm.iconColor : undefined} /> {icon.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {customMaterialForm.icon === 'custom-gem' && (
                                    <div>
                                        <Label htmlFor="customMaterialIconColor" className="text-base font-medium flex items-center"><Palette className="w-4 h-4 mr-2"/>Icon Color</Label>
                                        <Input id="customMaterialIconColor" type="color" value={customMaterialForm.iconColor || '#808080'} onChange={e => handleCustomMaterialFormChange('iconColor', e.target.value)} className="mt-1.5 h-11 text-base w-full"/>
                                    </div>
                                )}
                                <div className="flex justify-end space-x-3 pt-3 lg:col-start-3">
                                    {isEditingMaterial && <Button variant="outline" onClick={resetCustomMaterialForm} className="text-base px-5 py-2.5 h-11">Cancel Edit</Button>}
                                    <Button onClick={handleSaveCustomMaterial} className="text-base px-5 py-2.5 h-11 shadow-md hover:shadow-lg">
                                        <Save className="mr-2 h-4 w-4" /> {isEditingMaterial ? 'Update' : 'Add'}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <h4 className="text-lg font-semibold mb-4 text-muted-foreground">Current Materials List</h4>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={localSettings.valuables.map(v => v.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4 ml-8">
                                    {localSettings.valuables.map((valuable) => (
                                        <SortableValuableCard 
                                            key={valuable.id} 
                                            valuable={valuable} 
                                            currencySymbol={localSettings.currencySymbol}
                                            handleLocalValuableChange={handleLocalValuableChange}
                                            handleEditValuable={handleEditValuable}
                                            handleDeleteValuable={handleDeleteValuable}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </CardContent>
                </Card>
              )}

              {activeTab === 'products' && (
                <Card className="shadow-lg border-border">
                  <CardHeader>
                      <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                          <Tag className="mr-3 h-6 w-6 text-primary"/> Product Suggestions {localSettings.enableHsnCode && '&amp; HSN'}
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="space-y-4 mb-5">
                          <Label htmlFor="newProductName" className="font-medium text-base">Add New Product Suggestion</Label>
                          <div className="flex space-x-2.5">
                              <Input id="newProductName" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="e.g., Ring, Bangle, Earring" className="h-11 text-base"/>
                              <Button onClick={handleAddProductSuggestion} size="default" className="h-11 shadow hover:shadow-md transition-shadow text-base px-5"><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
                          </div>
                      </div>
                      {localSettings.productSuggestions.length > 0 ? (
                          <div className="max-h-80 overflow-y-auto border rounded-md p-3 space-y-2 bg-muted/30">
                              <div className={cn("grid items-center px-3 py-2 font-semibold text-muted-foreground text-sm", localSettings.enableHsnCode ? "grid-cols-[2fr_1fr_auto]" : "grid-cols-[1fr_auto]")}>
                                  <span>Product Name</span>
                                  {localSettings.enableHsnCode && <span>HSN Code</span>}
                                  <span className="text-right">Action</span>
                              </div>
                              <Separator/>
                              {localSettings.productSuggestions.map((product) => (
                                  <div key={product.name} className={cn("grid items-center p-2 bg-card rounded shadow-sm", localSettings.enableHsnCode ? "grid-cols-[2fr_1fr_auto]" : "grid-cols-[1fr_auto]")}>
                                      <span className="text-base font-medium">{product.name}</span>
                                      {localSettings.enableHsnCode && <Input value={product.hsnCode} onChange={(e) => handleProductSuggestionHsnChange(product.name, e.target.value)} placeholder="HSN Code" className="h-10 text-sm"/>}
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10"><Trash2 className="h-5 w-5" /></Button></AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the product suggestion "{product.name}"?</AlertDialogDescription></AlertDialogHeader>
                                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleRemoveProductSuggestion(product.name)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  </div>
                              ))}
                          </div>
                      ) : (<p className="text-base text-muted-foreground italic text-center py-4">No custom product names added yet.</p>)}
                      {localSettings.enableHsnCode && <p className="text-sm text-muted-foreground mt-3">HSN codes are automatically saved here when you create bills. You can also edit them manually.</p>}
                  </CardContent>
                </Card>
              )}
              
              {activeTab === 'billing' && (
                <>
                  <Card className="shadow-lg border-border">
                      <CardHeader>
                          <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                              <Package className="mr-3 h-6 w-6 text-primary"/> Default Making Charge (Sales)
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                              <Label htmlFor="defaultMakingChargeType" className="text-base font-medium">Type</Label>
                              <Select value={localSettings.defaultMakingCharge?.type || 'percentage'} onValueChange={(value: 'percentage' | 'fixed') => handleNestedChange('defaultMakingCharge', 'type', value)}>
                                  <SelectTrigger id="defaultMakingChargeType" className="mt-1.5 h-11 text-base"><SelectValue placeholder="Select type" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="percentage" className="text-base py-2">Percentage (%)</SelectItem>
                                      <SelectItem value="fixed" className="text-base py-2">Fixed Amount ({localSettings.currencySymbol})</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="defaultMakingChargeValue" className="text-base font-medium">Value</Label>
                              <Input id="defaultMakingChargeValue" type="number" value={localSettings.defaultMakingCharge?.value || 0} onChange={(e) => handleNestedChange('defaultMakingCharge', 'value', parseFloat(e.target.value))} className="mt-1.5 h-11 text-base" min="0"/>
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="shadow-lg border-border">
                      <CardHeader>
                          <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                              <Percent className="mr-3 h-6 w-6 text-primary"/> Tax Rates (Sales)
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div>
                              <Label htmlFor="cgstRate" className="text-base font-medium">CGST Rate (%)</Label>
                              <Input id="cgstRate" type="number" value={localSettings.cgstRate} onChange={(e) => handleChange('cgstRate', parseFloat(e.target.value))} className="mt-1.5 h-11 text-base" min="0"/>
                          </div>
                          <div>
                              <Label htmlFor="sgstRate" className="text-base font-medium">SGST Rate (%)</Label>
                              <Input id="sgstRate" type="number" value={localSettings.sgstRate} onChange={(e) => handleChange('sgstRate', parseFloat(e.target.value))} className="mt-1.5 h-11 text-base" min="0"/>
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="shadow-lg border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                            <Package className="mr-3 h-6 w-6 text-primary"/> Default Purchase Item Setup
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <Label htmlFor="defaultPurchaseItemNetPercentage" className="text-base font-medium">Default Net % Off Market</Label>
                          <Input id="defaultPurchaseItemNetPercentage" type="number" value={localSettings.defaultPurchaseItemNetPercentage} onChange={(e) => handleChange('defaultPurchaseItemNetPercentage', parseFloat(e.target.value))} placeholder="e.g., 10 for 10% deduction" className="mt-1.5 h-11 text-base" min="0"/>
                          <p className="text-sm text-muted-foreground mt-2 italic">Applied if 'Net % Off Market' is chosen for a new purchase item.</p>
                        </div>
                        <div>
                          <Label htmlFor="defaultPurchaseItemNetFixedValue" className="text-base font-medium">Default Fixed Net Rate ({localSettings.currencySymbol})</Label>
                          <Input id="defaultPurchaseItemNetFixedValue" type="number" value={localSettings.defaultPurchaseItemNetFixedValue} onChange={(e) => handleChange('defaultPurchaseItemNetFixedValue', parseFloat(e.target.value))} placeholder="e.g., 4500" className="mt-1.5 h-11 text-base" min="0"/>
                          <p className="text-sm text-muted-foreground mt-2 italic">Applied if 'Fixed Net Rate' is chosen for a new purchase item.</p>
                        </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {activeTab === 'features' && (
                <Card className="shadow-lg border-border">
                  <CardHeader>
                      <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                          <Wrench className="mr-3 h-6 w-6 text-primary"/> Feature Toggles
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                          <Checkbox id="enableGstReport" checked={localSettings.enableGstReport} onCheckedChange={(checked) => handleChange('enableGstReport', !!checked)} className="w-5 h-5"/>
                          <Label htmlFor="enableGstReport" className="text-base font-medium leading-none cursor-pointer">Enable GST Report</Label>
                      </div>
                      <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                          <Checkbox id="enableHsnCode" checked={localSettings.enableHsnCode} onCheckedChange={(checked) => handleChange('enableHsnCode', !!checked)} className="w-5 h-5"/>
                          <Label htmlFor="enableHsnCode" className="text-base font-medium leading-none cursor-pointer">Enable HSN Codes for Sales</Label>
                      </div>
                       <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                          <Checkbox id="enablePurchase" checked={localSettings.enablePurchase} onCheckedChange={(checked) => handleChange('enablePurchase', !!checked)} className="w-5 h-5"/>
                          <Label htmlFor="enablePurchase" className="text-base font-medium leading-none cursor-pointer">Enable Purchase Module</Label>
                      </div>
                      <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                          <Checkbox id="enableEwayBill" checked={localSettings.enableEwayBill} onCheckedChange={(checked) => handleChange('enableEwayBill', !!checked)} className="w-5 h-5"/>
                          <Label htmlFor="enableEwayBill" className="text-base font-medium leading-none cursor-pointer">Enable E-Way Bill Feature</Label>
                      </div>
                      <div className="flex items-center space-x-3.5 p-3 bg-muted/30 rounded-md">
                          <Checkbox id="enableGstInvoicing" checked={localSettings.enableGstInvoicing} onCheckedChange={(checked) => handleChange('enableGstInvoicing', !!checked)} className="w-5 h-5"/>
                          <Label htmlFor="enableGstInvoicing" className="text-base font-medium leading-none cursor-pointer">Enable GST Invoicing Features (TRN, IRN, etc.)</Label>
                      </div>
                  </CardContent>
                </Card>
              )}
              {activeTab === 'data' && (
                <Card className="shadow-lg border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl lg:text-2xl font-headline">
                      <Database className="mr-3 h-6 w-6 text-primary"/> Backup &amp; Restore
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Export Settings</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Save a backup of all your current application settings. This includes company info, materials, billing defaults, and all other configurations. Keep this file safe.
                      </p>
                      <Button onClick={handleExportSettings}>
                        <Download className="mr-2 h-4 w-4" /> Export Settings File
                      </Button>
                    </div>

                    <Separator />
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Import Settings</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Restore your settings from a backup file. <span className="font-bold text-destructive">Warning:</span> This will overwrite all your current settings. This action cannot be undone.
                      </p>
                      <Button variant="outline" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" /> Import from File
                      </Button>
                      <input
                        type="file"
                        ref={importFileRef}
                        onChange={handleImportFileChange}
                        accept=".json"
                        className="hidden"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
        </div>

        <div className="flex justify-end pt-6 border-t mt-8">
            <Button 
              onClick={handleSaveAllSettings} 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all text-lg h-auto px-8 py-3 w-52"
              disabled={saveState !== 'idle'}
            >
              {saveState === 'saving' && <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />}
              {saveState === 'saved' && <Check className="mr-2.5 h-5 w-5" />}
              {saveState === 'idle' && <Save className="mr-2.5 h-5 w-5" />}
              
              {saveState === 'idle' ? 'Save All Settings' : (saveState === 'saving' ? 'Saving...' : 'Saved!')}
            </Button>
        </div>

        <AlertDialog open={!!importedSettings} onOpenChange={(isOpen) => !isOpen && setImportedSettings(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl">Confirm Settings Import</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Are you sure you want to import settings from this file? This will overwrite all of your current settings. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setImportedSettings(null)} className="text-base h-auto px-4 py-2">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmImport} className="bg-destructive hover:bg-destructive/90 text-base h-auto px-4 py-2">Overwrite &amp; Import</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};
