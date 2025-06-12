
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import type { Bill, BillItem, BillType, Settings, Valuable } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Calculator, FileText, XCircle } from 'lucide-react';
import BillItemRow from './BillItemRow';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BillFormProps {
  billType: BillType;
  existingBill?: Bill;
  onSaveAndPrint: (bill: Bill) => void; // Changed from onSave
  onCancel: () => void;
  onShowEstimate?: (estimateData: Bill) => void;
}

const BillForm: React.FC<BillFormProps> = ({ billType, existingBill, onSaveAndPrint, onCancel, onShowEstimate }) => {
  const { settings, addBill, updateBill, addCustomItemName } = useAppContext();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<Partial<BillItem>[]>([]);
  const [notes, setNotes] = useState('');

  const [purchaseNetMode, setPurchaseNetMode] = useState<'percentage' | 'fixed_price' | undefined>(undefined);
  const [purchaseNetValue, setPurchaseNetValue] = useState<number | undefined>(undefined);

  const isSalesBill = billType === 'sales-bill';
  const isPurchase = billType === 'purchase';

  useEffect(() => {
    if (existingBill) {
      setCustomerName(existingBill.customerName || '');
      setCustomerAddress(existingBill.customerAddress || '');
      setCustomerPhone(existingBill.customerPhone || '');
      setItems(existingBill.items.map(item => ({...item})) || [{ id: uuidv4() }]);
      setNotes(existingBill.notes || '');
      if (existingBill.type === 'purchase') {
        setPurchaseNetMode(existingBill.purchaseNetApplied || settings.netPurchaseMode);
        setPurchaseNetValue(existingBill.purchaseNetValueApplied ?? (existingBill.purchaseNetApplied === 'percentage' ? settings.netPurchasePercentage : settings.netPurchaseFixedPrice));
      }
    } else {
      resetForm();
    }
  }, [existingBill, settings, billType]);

  const calculateItemAmount = useCallback((item: Partial<BillItem>): number => {
    if (typeof item.weightOrQuantity !== 'number' || typeof item.rate !== 'number') return 0;
    let baseAmount = item.weightOrQuantity * item.rate;
    if (item.makingCharge && !isPurchase) { 
      if (item.makingChargeType === 'percentage') {
        baseAmount += baseAmount * (item.makingCharge / 100);
      } else {
        baseAmount += item.makingCharge;
      }
    }
    return parseFloat(baseAmount.toFixed(2));
  }, [isPurchase]);
  
  useEffect(() => {
    let hasAnyAmountChanged = false;
    const reCalculatedItems = items.map(currentItem => {
      if (!currentItem.id) return { ...currentItem, id: uuidv4() };
      const newAmount = calculateItemAmount(currentItem);
      if (currentItem.amount !== newAmount) {
        hasAnyAmountChanged = true;
        return { ...currentItem, amount: newAmount };
      }
      return currentItem;
    });

    if (hasAnyAmountChanged) {
      setItems(reCalculatedItems);
    }
  }, [items, calculateItemAmount]);

  const subTotal = parseFloat(items.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2));
  
  let totalAmount = subTotal;
  let cgstAmount = 0;
  let sgstAmount = 0;

  if (isPurchase && purchaseNetMode && purchaseNetValue !== undefined && purchaseNetValue !== null) {
    if (purchaseNetMode === 'percentage') {
      totalAmount = subTotal * (1 - purchaseNetValue / 100);
    } else { 
      totalAmount = purchaseNetValue; 
    }
  } else if (isSalesBill) {
    cgstAmount = totalAmount * (settings.cgstRate / 100);
    sgstAmount = totalAmount * (settings.sgstRate / 100);
    totalAmount += cgstAmount + sgstAmount;
  }
  totalAmount = parseFloat(totalAmount.toFixed(2));
  cgstAmount = parseFloat(cgstAmount.toFixed(2));
  sgstAmount = parseFloat(sgstAmount.toFixed(2));

  const handleItemChange = (index: number, updatedItem: Partial<BillItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updatedItem, amount: calculateItemAmount(updatedItem) };
    setItems(newItems);
  };
  
  const handleItemNameBlur = (name: string) => {
    if (name && name.trim() !== '') {
      addCustomItemName(name.trim());
    }
  };

  const addItem = () => {
    const newItemShell: Partial<BillItem> = { 
      id: uuidv4(), 
      makingChargeType: settings.defaultMakingCharge.type,
      makingCharge: settings.defaultMakingCharge.value,
      name: '', // Initialize name for new items
    };
    const newItemWithAmount = { ...newItemShell, amount: calculateItemAmount(newItemShell) };
    setItems([...items, newItemWithAmount]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const getCurrentBillData = (isEstimate: boolean = false): Omit<Bill, 'id'|'date'|'billNumber'> => {
    const finalItems = items.filter(item => item.name && item.name.trim() !== '' && typeof item.weightOrQuantity === 'number' && typeof item.rate === 'number').map(item => item as BillItem);
    
    const currentSubTotal = parseFloat(finalItems.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2));
    let currentTotalAmount = currentSubTotal;
    let currentCgst = 0;
    let currentSgst = 0;

    if (isEstimate) {
      if (isPurchase) {
        // For purchase estimate, total is just subtotal (before net adjustments)
        currentTotalAmount = currentSubTotal;
      } else { // Sales Estimate
        currentTotalAmount = currentSubTotal; // No GST for sales estimate
      }
    } else { // Actual Bill
      if (isPurchase && purchaseNetMode && purchaseNetValue !== undefined) {
        if (purchaseNetMode === 'percentage') {
          currentTotalAmount = currentSubTotal * (1 - (purchaseNetValue / 100));
        } else {
          currentTotalAmount = purchaseNetValue;
        }
      } else if (isSalesBill) {
        currentCgst = currentSubTotal * (settings.cgstRate / 100);
        currentSgst = currentSubTotal * (settings.sgstRate / 100);
        currentTotalAmount = currentSubTotal + currentCgst + currentSgst;
      }
    }
    
    return {
      type: billType,
      customerName,
      customerAddress,
      customerPhone,
      items: finalItems,
      subTotal: currentSubTotal,
      cgstAmount: parseFloat(currentCgst.toFixed(2)),
      sgstAmount: parseFloat(currentSgst.toFixed(2)),
      totalAmount: parseFloat(currentTotalAmount.toFixed(2)),
      notes,
      purchaseNetApplied: (isPurchase && !isEstimate) ? purchaseNetMode : undefined,
      purchaseNetValueApplied: (isPurchase && !isEstimate) ? purchaseNetValue : undefined,
    };
  };

  const handleSubmit = () => {
    const billDetails = getCurrentBillData(false);
    if (billDetails.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one valid item with a name.", variant: "destructive" });
      return;
    }
    
    let savedBill;
    if (existingBill) {
      savedBill = { ...existingBill, ...billDetails };
      updateBill(savedBill);
      toast({ title: "Success", description: `${billTypeLabel()} updated.` });
    } else {
      savedBill = addBill(billDetails);
      toast({ title: "Success", description: `${billTypeLabel()} created.` });
    }
    onSaveAndPrint(savedBill); // Changed from onSave
    resetForm();
  };

  const handleShowEstimate = () => {
    if (onShowEstimate) {
      const estimateDetails = getCurrentBillData(true);
       const estimateBillForView: Bill = {
        ...estimateDetails,
        id: `estimate-preview-${uuidv4()}`, 
        date: new Date().toISOString(), 
        billNumber: 'ESTIMATE', 
      };
      onShowEstimate(estimateBillForView);
    }
  };

  const resetForm = useCallback(() => {
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setItems([{ 
      id: uuidv4(), 
      name: '',
      amount: 0, 
      makingChargeType: settings.defaultMakingCharge.type, 
      makingCharge: settings.defaultMakingCharge.value 
    }]);
    setNotes('');
    if (isPurchase) {
      setPurchaseNetMode(settings.netPurchaseMode);
      setPurchaseNetValue(settings.netPurchaseMode === 'percentage' ? settings.netPurchasePercentage : settings.netPurchaseFixedPrice);
    } else {
      setPurchaseNetMode(undefined);
      setPurchaseNetValue(undefined);
    }
  }, [settings, isPurchase]);

  const billTypeLabel = () => {
    switch(billType) {
      case 'purchase': return 'Purchase Bill';
      case 'sales-bill': return 'Sales Bill';
      default: return 'Bill';
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <Calculator className="mr-2 h-6 w-6" /> {existingBill ? 'Edit' : 'Create'} {billTypeLabel()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(isSalesBill || (isPurchase && (customerName || existingBill))) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customerName">{isPurchase ? "Supplier" : "Customer"} Name</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="customerPhone">{isPurchase ? "Supplier" : "Customer"} Phone</Label>
              <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="customerAddress">{isPurchase ? "Supplier" : "Customer"} Address</Label>
              <Textarea id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </div>
        )}
        
        {isPurchase && (
          <div className="p-4 border rounded-md bg-muted/50 my-4">
            <h4 className="text-md font-semibold mb-2 text-primary">Purchase Net Calculation</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseNetMode">Net Calculation Type</Label>
                <Select
                    value={purchaseNetMode}
                    onValueChange={(value: 'percentage' | 'fixed_price') => {
                      setPurchaseNetMode(value);
                      if (value === 'percentage') setPurchaseNetValue(settings.netPurchasePercentage);
                      else if (value === 'fixed_price') setPurchaseNetValue(settings.netPurchaseFixedPrice);
                    }}
                >
                    <SelectTrigger id="purchaseNetMode">
                        <SelectValue placeholder="Select net mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="percentage">Net Percentage Off Subtotal</SelectItem>
                        <SelectItem value="fixed_price">Net Fixed Bill Price</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="purchaseNetValue">{purchaseNetMode === 'percentage' ? 'Net Percentage Value (%)' : 'Net Fixed Bill Value'}</Label>
                <Input 
                  id="purchaseNetValue" 
                  type="number" 
                  value={purchaseNetValue ?? ''}
                  onChange={(e) => setPurchaseNetValue(parseFloat(e.target.value))}
                  placeholder={purchaseNetMode === 'percentage' ? String(settings.netPurchasePercentage) : String(settings.netPurchaseFixedPrice)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {purchaseNetMode === 'percentage' 
                ? "The entered percentage will be deducted from the item subtotal to calculate the final bill amount."
                : "The final bill amount will be this fixed value, regardless of item subtotal."}
            </p>
          </div>
        )}

        <div>
          <Label className="text-lg font-medium">Items</Label>
           <div className="py-1 grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
            <div className="col-span-3">Type</div>
            <div className="col-span-3">Name/Desc</div>
            <div className="col-span-1 text-center">Qty/Wt</div>
            <div className="col-span-1 text-center">Rate</div>
            {!isPurchase && <div className="col-span-1 text-center">MC Type</div>}
            {!isPurchase && <div className="col-span-1 text-center">Making</div>}
            <div className={`col-span-1 ${isPurchase ? 'col-start-10' : ''} text-right`}>Amount</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          {items.map((item, index) => (
            <BillItemRow
              key={item.id || index}
              item={item}
              onItemChange={(updatedItem) => handleItemChange(index, updatedItem)}
              onItemNameBlur={handleItemNameBlur}
              onRemoveItem={() => removeItem(index)}
              availableValuables={settings.valuables}
              customItemNames={settings.customItemNames}
              isPurchase={isPurchase}
              defaultMakingCharge={settings.defaultMakingCharge}
            />
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
        
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="space-y-2 text-right font-medium pr-4">
          <div>Subtotal: <span className="text-lg">{subTotal.toFixed(2)}</span></div>
          {(isSalesBill) && (
            <>
              <div>CGST ({settings.cgstRate}%): <span className="text-lg">{cgstAmount.toFixed(2)}</span></div>
              <div>SGST ({settings.sgstRate}%): <span className="text-lg">{sgstAmount.toFixed(2)}</span></div>
            </>
          )}
           {isPurchase && purchaseNetMode && purchaseNetValue !== undefined && (
            <div className="text-sm text-muted-foreground">
              (Net Calculation Applied)
            </div>
          )}
          <div className="text-xl font-bold text-primary">Total: <span className="text-2xl">{totalAmount.toFixed(2)}</span></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel} className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">
          <XCircle className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <div className="flex space-x-2">
          {onShowEstimate && (
            <Button variant="outline" onClick={handleShowEstimate} className="text-accent border-accent hover:bg-accent/10 hover:text-accent">
              <FileText className="mr-2 h-4 w-4" /> Create Estimate
            </Button>
          )}
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/80">
            <Save className="mr-2 h-4 w-4" /> {existingBill ? 'Update' : 'Save'} & Print {billTypeLabel()}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BillForm;
