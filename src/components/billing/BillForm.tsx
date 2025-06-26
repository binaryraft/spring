
"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Bill, BillItem, BillType } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Calculator, FileText, XCircle, Users, ShoppingBag, List, Loader2, Edit, Banknote, StickyNote, ListOrdered } from 'lucide-react';
import BillItemPreviewRow from './BillItemPreviewRow';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ValuableIcon from '../ValuableIcon';
import { Table, TableBody, TableHeader, TableRow, TableHead } from '@/components/ui/table';

interface BillFormProps {
  billType: BillType;
  existingBill?: Bill;
  onSaveAndPrint: (bill: Bill) => void;
  onCancel: () => void;
  onShowEstimate?: (estimateData: Bill) => void;
}

const BillForm: React.FC<BillFormProps> = ({ billType, existingBill, onSaveAndPrint, onCancel, onShowEstimate }) => {
  const { settings, addBill, updateBill, addOrUpdateProductSuggestion, getValuableById } = useAppContext();

  const isSalesBill = billType === 'sales-bill';
  
  // Bill-level state
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<BillItem[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Item form state
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<Partial<BillItem>>({});

  // Refs for keyboard navigation
  const customerNameRef = useRef<HTMLInputElement>(null);
  const customerPhoneRef = useRef<HTMLInputElement>(null);
  const customerAddressRef = useRef<HTMLTextAreaElement>(null);
  const materialSelectTriggerRef = useRef<HTMLButtonElement>(null);
  const productNameRef = useRef<HTMLInputElement>(null);
  const hsnCodeRef = useRef<HTMLInputElement>(null);
  const qtyWtRef = useRef<HTMLInputElement>(null);
  const addItemButtonRef = useRef<HTMLButtonElement>(null);

  const getBlankItem = useCallback((): Partial<BillItem> => ({
    id: uuidv4(),
    name: '',
    hsnCode: '',
    weightOrQuantity: 1,
    unit: settings.valuables[0]?.unit || 'gram',
    amount: 0,
    itemCgstAmount: 0,
    itemSgstAmount: 0,
    makingChargeType: isSalesBill ? settings.defaultMakingCharge.type : undefined,
    makingCharge: isSalesBill ? settings.defaultMakingCharge.value : undefined,
    purchaseNetType: !isSalesBill ? 'net_percentage' : undefined,
    purchaseNetPercentValue: !isSalesBill ? settings.defaultPurchaseItemNetPercentage : undefined,
    purchaseNetFixedValue: !isSalesBill ? settings.defaultPurchaseItemNetFixedValue : undefined,
  }), [settings, isSalesBill]);

  useEffect(() => {
    if (existingBill) {
      setCustomerName(existingBill.customerName || '');
      setCustomerAddress(existingBill.customerAddress || '');
      setCustomerPhone(existingBill.customerPhone || '');
      setItems(existingBill.items || []);
      setNotes(existingBill.notes || '');
    }
    setCurrentItem(getBlankItem());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBill, getBlankItem]);

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldRef?: React.RefObject<HTMLElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      nextFieldRef?.current?.focus();
    }
  };

  const calculateItemTaxableAmount = useCallback((item: Partial<BillItem>): number => {
    if (typeof item.weightOrQuantity !== 'number' || item.weightOrQuantity <= 0 || !item.valuableId) return 0;

    let effectiveRate = 0;
    const valuable = getValuableById(item.valuableId);
    const marketPrice = valuable ? valuable.price : 0;

    if (!isSalesBill) {
      switch (item.purchaseNetType) {
        case 'net_percentage':
          effectiveRate = marketPrice * (1 - ((item.purchaseNetPercentValue || 0) / 100));
          break;
        case 'fixed_net_price':
          effectiveRate = item.purchaseNetFixedValue || 0;
          break;
        default: 
          effectiveRate = item.rate || 0; 
          break;
      }
    } else {
      effectiveRate = typeof item.rate === 'number' ? item.rate : 0;
    }

    if (effectiveRate < 0) effectiveRate = 0;

    let baseAmount = item.weightOrQuantity * effectiveRate;

    if (item.makingCharge && isSalesBill) {
      if (item.makingChargeType === 'percentage') {
        const mcBaseForSales = item.weightOrQuantity * (item.rate || 0); 
        baseAmount += mcBaseForSales * (item.makingCharge / 100);
      } else {
        baseAmount += item.makingCharge;
      }
    }
    return parseFloat(baseAmount.toFixed(2));
  }, [isSalesBill, getValuableById]);

  const handleItemFormChange = (field: keyof BillItem, value: any) => {
    const updatedItem = { ...currentItem, [field]: value };
    setCurrentItem(updatedItem);
  };
  
  const handleValuableSelect = (valuableId: string) => {
    const selectedValuable = settings.valuables.find(v => v.id === valuableId);
    if (selectedValuable) {
      const updates: Partial<BillItem> = {
        valuableId,
        unit: selectedValuable.unit,
      };

      if (isSalesBill) {
        updates.rate = selectedValuable.price;
      }
      setCurrentItem(prev => ({...prev, ...updates}));
      productNameRef.current?.focus();
    }
  };

  const handleAddItem = () => {
    if (!currentItem.valuableId || !currentItem.name || !currentItem.weightOrQuantity) {
        if (!currentItem.valuableId) materialSelectTriggerRef.current?.focus();
        else if (!currentItem.name) productNameRef.current?.focus();
        else if (!currentItem.weightOrQuantity) qtyWtRef.current?.focus();
        return;
    }
    const amount = calculateItemTaxableAmount(currentItem);
    const newItem: BillItem = {
      ...getBlankItem(),
      ...currentItem,
      id: uuidv4(),
      amount,
      itemCgstAmount: isSalesBill ? parseFloat((amount * (settings.cgstRate / 100)).toFixed(2)) : 0,
      itemSgstAmount: isSalesBill ? parseFloat((amount * (settings.sgstRate / 100)).toFixed(2)) : 0,
    } as BillItem;

    if (editingItemIndex !== null) {
      const newItems = [...items];
      newItems[editingItemIndex] = newItem;
      setItems(newItems);
    } else {
      setItems(prev => [...prev, newItem]);
    }
    
    setCurrentItem(getBlankItem());
    setEditingItemIndex(null);
    materialSelectTriggerRef.current?.focus();
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setCurrentItem({...items[index]});
    materialSelectTriggerRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingItemIndex(null);
    setCurrentItem(getBlankItem());
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (index === editingItemIndex) {
      handleCancelEdit();
    }
  };

  const subTotal = useMemo(() => parseFloat(items.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2)), [items]);
  const billCgstAmount = useMemo(() => isSalesBill ? parseFloat(items.reduce((acc, item) => acc + (item.itemCgstAmount || 0), 0).toFixed(2)) : 0, [items, isSalesBill]);
  const billSgstAmount = useMemo(() => isSalesBill ? parseFloat(items.reduce((acc, item) => acc + (item.itemSgstAmount || 0), 0).toFixed(2)) : 0, [items, isSalesBill]);
  const finalTotalAmount = useMemo(() => parseFloat((subTotal + billCgstAmount + billSgstAmount).toFixed(2)), [subTotal, billCgstAmount, billSgstAmount]);

  const handleSubmit = () => {
    const finalItems = items.filter(item => item.name && item.weightOrQuantity > 0);
    if (finalItems.length === 0) return;

    const billDetails = {
      type: billType,
      customerName,
      customerAddress,
      customerPhone,
      items: finalItems,
      subTotal,
      cgstAmount: billCgstAmount,
      sgstAmount: billSgstAmount,
      totalAmount: finalTotalAmount,
      notes,
    };
    
    setIsSaving(true);
    setTimeout(() => {
      finalItems.forEach(item => {
        if (item.name && isSalesBill && settings.enableHsnCode) {
          addOrUpdateProductSuggestion(item.name.trim(), item.hsnCode || '');
        }
      });

      let savedBill;
      if (existingBill) {
        savedBill = { ...existingBill, ...billDetails };
        updateBill(savedBill);
      } else {
        savedBill = addBill(billDetails);
      }
      onSaveAndPrint(savedBill);
      setIsSaving(false);
    }, 700);
  };
  
  const handleShowEstimate = () => {
    if (!onShowEstimate) return;
    const finalItems = items.filter(item => item.name && item.weightOrQuantity > 0);
    const estimateBillForView: Bill = {
        id: `estimate-preview-${uuidv4()}`,
        date: new Date().toISOString(),
        billNumber: 'ESTIMATE', 
        type: billType,
        customerName, customerAddress, customerPhone, notes,
        items: finalItems,
        subTotal,
        totalAmount: subTotal, // No taxes on estimate
        cgstAmount: 0,
        sgstAmount: 0,
      };
      onShowEstimate(estimateBillForView);
  };


  const billTypeLabel = () => {
    switch(billType) {
      case 'purchase': return 'Purchase';
      case 'sales-bill': return 'Sale';
      default: return 'Bill';
    }
  };

  const datalistId = 'product-names-datalist';
  const isEditing = editingItemIndex !== null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
          <h1 className={cn(
              "font-headline text-3xl lg:text-4xl flex items-center",
              isSalesBill ? 'text-success' : 'text-destructive'
          )}>
            <Calculator className="mr-3 h-8 w-8 lg:h-9 lg:w-9" /> {existingBill ? 'Edit' : 'Create'} {billTypeLabel()}
          </h1>
           {!existingBill && (
              <Button variant="outline" onClick={onCancel} className="shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
                  <List className="mr-2.5 h-5 w-5" /> View History
              </Button>
          )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-xl font-headline">
            {isSalesBill ? <Users className="mr-3 h-6 w-6 text-success"/> : <ShoppingBag className="mr-3 h-6 w-6 text-destructive"/>}
            {isSalesBill ? "Customer" : "Supplier"} Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <Label htmlFor="customerName" className="text-base">{isSalesBill ? "Customer" : "Supplier"} Name</Label>
                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1.5 h-11 text-base" ref={customerNameRef} onKeyDown={e => handleKeyDown(e, customerPhoneRef)}/>
              </div>
              <div>
                <Label htmlFor="customerPhone" className="text-base">{isSalesBill ? "Customer" : "Supplier"} Phone</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="mt-1.5 h-11 text-base" ref={customerPhoneRef} onKeyDown={e => handleKeyDown(e, customerAddressRef)}/>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="customerAddress" className="text-base">{isSalesBill ? "Customer" : "Supplier"} Address</Label>
                <Textarea id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="mt-1.5 text-base" rows={2} ref={customerAddressRef} onKeyDown={e => handleKeyDown(e, materialSelectTriggerRef)}/>
              </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Items Preview */}
      <Card>
        <CardHeader><CardTitle className="flex items-center text-xl font-headline"><ListOrdered className="mr-3 h-6 w-6 text-primary"/>Items on Bill</CardTitle></CardHeader>
        <CardContent>
            {items.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Product</TableHead>
                                {isSalesBill && settings.enableHsnCode && <TableHead>HSN</TableHead>}
                                <TableHead className="text-right">Qty/Wt</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                {isSalesBill && <TableHead className="text-right">Making Charge</TableHead>}
                                <TableHead className="text-right">Subtotal</TableHead>
                                <TableHead className="w-[120px] text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <BillItemPreviewRow 
                                    key={item.id} 
                                    item={item} 
                                    index={index}
                                    onEdit={() => handleEditItem(index)}
                                    onDelete={() => handleRemoveItem(index)}
                                    isSalesBill={isSalesBill}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-8">No items added yet.</p>
            )}
        </CardContent>
      </Card>

      {/* Item Input Form */}
      <Card>
          <CardHeader><CardTitle className="flex items-center text-xl font-headline"><Edit className="mr-3 h-6 w-6 text-primary"/>{isEditing ? `Editing Item #${(editingItemIndex ?? 0) + 1}` : 'Add New Item'}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-10 gap-4 items-start">
                <div className="md:col-span-2 space-y-1.5">
                    <Label>Material</Label>
                    <Select value={currentItem.valuableId || ''} onValueChange={handleValuableSelect}>
                        <SelectTrigger className="h-11 text-base w-full" ref={materialSelectTriggerRef}><SelectValue placeholder="Select Material" /></SelectTrigger>
                        <SelectContent>
                            {settings.valuables.sort((a,b) => a.name.localeCompare(b.name)).map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-base py-2">
                                <div className="flex items-center"><ValuableIcon valuableType={v.icon} color={v.iconColor} className="w-5 h-5 mr-2.5"/>{v.name}</div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                    <Label>Product Name</Label>
                    <Input placeholder="e.g., Ring, Chain" value={currentItem.name || ''} onChange={(e) => handleItemFormChange('name', e.target.value)} list={datalistId} className="h-11 text-base" ref={productNameRef} onKeyDown={e => handleKeyDown(e, (isSalesBill && settings.enableHsnCode) ? hsnCodeRef : qtyWtRef)}/>
                    <datalist id={datalistId}>{settings.productSuggestions.map(p => <option key={p.name} value={p.name} />)}</datalist>
                    {isSalesBill && settings.enableHsnCode && <Input placeholder="HSN Code" value={currentItem.hsnCode || ''} onChange={e => handleItemFormChange('hsnCode', e.target.value)} className="h-9 text-sm mt-1" ref={hsnCodeRef} onKeyDown={e => handleKeyDown(e, qtyWtRef)}/>}
                </div>
                <div className="md:col-span-2 space-y-1.5">
                    <Label>{`Qty / ${getValuableById(currentItem.valuableId || '')?.unit || 'Wt'}`}</Label>
                    <Input type="number" value={currentItem.weightOrQuantity || ''} onChange={(e) => handleItemFormChange('weightOrQuantity', parseFloat(e.target.value))} className="h-11 text-base" ref={qtyWtRef} onKeyDown={e => handleKeyDown(e, addItemButtonRef)}/>
                </div>
                <div className="md:col-span-3 space-y-1.5">
                    {!isSalesBill ? (
                        <div>
                            <Label>Net Calculation</Label>
                            <Select value={currentItem.purchaseNetType || 'net_percentage'} onValueChange={(val: 'net_percentage' | 'fixed_net_price') => handleItemFormChange('purchaseNetType', val)}>
                                <SelectTrigger className="h-11 text-base w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="net_percentage" className="text-base py-2">Net % Off</SelectItem>
                                    <SelectItem value="fixed_net_price" className="text-base py-2">Fixed Rate</SelectItem>
                                </SelectContent>
                            </Select>
                            {currentItem.purchaseNetType === 'net_percentage' ? (
                                <Input type="number" placeholder="%" value={currentItem.purchaseNetPercentValue || ''} onChange={(e) => handleItemFormChange('purchaseNetPercentValue', parseFloat(e.target.value))} className="h-11 text-base mt-1" />
                            ) : (
                                <Input type="number" placeholder={`Rate in ${settings.currencySymbol}`} value={currentItem.purchaseNetFixedValue || ''} onChange={(e) => handleItemFormChange('purchaseNetFixedValue', parseFloat(e.target.value))} className="h-11 text-base mt-1" />
                            )}
                        </div>
                    ) : (
                        <div>
                            <Label>Rate ({settings.currencySymbol})</Label>
                            <Input type="number" value={currentItem.rate || ''} onChange={(e) => handleItemFormChange('rate', parseFloat(e.target.value))} className="h-11 text-base"/>
                            <div className="mt-2">
                                <Label className="text-sm font-medium text-muted-foreground">Making Charge</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="inline-flex rounded-md shadow-sm" role="group">
                                        <Button
                                            onClick={() => handleItemFormChange('makingChargeType', 'percentage')}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "rounded-r-none h-9 px-4 transition-all duration-200",
                                                currentItem.makingChargeType === 'percentage'
                                                ? 'bg-yellow-400 text-black font-bold shadow-[0_0_15px_rgba(250,204,21,0.5)] z-10 border-yellow-500'
                                                : 'bg-background text-muted-foreground'
                                            )}
                                        >
                                            %
                                        </Button>
                                        <Button
                                            onClick={() => handleItemFormChange('makingChargeType', 'fixed')}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={cn(
                                                "rounded-l-none h-9 px-4 transition-all duration-200 -ml-px",
                                                currentItem.makingChargeType === 'fixed'
                                                ? 'bg-green-500 text-white font-bold shadow-[0_0_15px_rgba(34,197,94,0.6)] z-10 border-green-600'
                                                : 'bg-background text-muted-foreground'
                                            )}
                                        >
                                            {settings.currencySymbol}
                                        </Button>
                                    </div>
                                    <Input 
                                        type="number" 
                                        placeholder="MC Value" 
                                        value={currentItem.makingCharge || ''} 
                                        onChange={(e) => handleItemFormChange('makingCharge', parseFloat(e.target.value))} 
                                        className="h-9 text-sm w-full" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end space-x-2">
            {isEditing && <Button variant="outline" onClick={handleCancelEdit}>Cancel Edit</Button>}
            <Button onClick={handleAddItem} className="shadow-md hover:shadow-lg" ref={addItemButtonRef}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {isEditing ? 'Update Item' : 'Add Item'}
            </Button>
          </CardFooter>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
            <CardHeader><CardTitle className="flex items-center text-xl font-headline"><StickyNote className={cn("mr-3 h-6 w-6", isSalesBill ? "text-success" : "text-destructive")}/>Notes</CardTitle></CardHeader>
            <CardContent><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="text-base" rows={6} placeholder="Add any notes for the bill here..."/></CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center text-xl font-headline"><Banknote className={cn("mr-3 h-6 w-6", isSalesBill ? "text-success" : "text-destructive")}/>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-base p-4">
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{settings.currencySymbol}{subTotal.toFixed(2)}</span></div>
               {isSalesBill && (<>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">CGST ({settings.cgstRate}%)</span><span className="font-medium">{settings.currencySymbol}{billCgstAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">SGST ({settings.sgstRate}%)</span><span className="font-medium">{settings.currencySymbol}{billSgstAmount.toFixed(2)}</span></div>
                </>)}
              <Separator className="my-2" />
              <div className={cn("flex justify-between items-center text-2xl font-bold p-4 mt-2 rounded-lg", isSalesBill ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                <span>TOTAL</span>
                <span>{settings.currencySymbol}{finalTotalAmount.toFixed(2)}</span>
              </div>
          </CardContent>
        </Card>
      </div>
      
      <footer className="flex justify-end space-x-4 border-t pt-6 mt-6">
        {existingBill && (<Button variant="outline" size="lg" onClick={onCancel} className="h-12 text-base" disabled={isSaving}><XCircle className="mr-2 h-5 w-5" /> Cancel</Button>)}
        <div className="flex items-center space-x-4">
          {onShowEstimate && isSalesBill && (<Button variant="outline" size="lg" onClick={handleShowEstimate} disabled={isSaving} className="h-12 text-base border-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"><FileText className="mr-2.5 h-5 w-5" /> Create Estimate</Button>)}
          <Button onClick={handleSubmit} variant={isSalesBill ? 'success' : 'destructive'} size="lg" className="h-12 text-base w-48" disabled={isSaving}>
            {isSaving ? (<Loader2 className="mr-2.5 h-5 w-5 animate-spin" />) : (<Save className="mr-2.5 h-5 w-5" />)}
            {isSaving ? 'Saving...' : `${existingBill ? 'Update' : 'Save'} & Print`}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default BillForm;
