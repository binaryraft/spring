
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
  onSave: (bill: Bill) => void;
  onCancel: () => void;
  onShowEstimate?: (estimateData: Bill) => void; // Optional: only for sales bill
}

const BillForm: React.FC<BillFormProps> = ({ billType, existingBill, onSave, onCancel, onShowEstimate }) => {
  const { settings, addBill, updateBill } = useAppContext();
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
    if (!item.valuableId || typeof item.weightOrQuantity !== 'number' || typeof item.rate !== 'number') return 0;
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
      if (!currentItem.id) return { ...currentItem, id: uuidv4() }; // Ensure ID for new items
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
  } else if (isSalesBill) { // GST only for sales bills, not estimates
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

  const addItem = () => {
    const newItemShell: Partial<BillItem> = { 
      id: uuidv4(), 
      makingChargeType: settings.defaultMakingCharge.type,
      makingCharge: settings.defaultMakingCharge.value,
    };
    const newItemWithAmount = { ...newItemShell, amount: calculateItemAmount(newItemShell) };
    setItems([...items, newItemWithAmount]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const getCurrentBillData = (isEstimate: boolean = false): Omit<Bill, 'id'|'date'|'billNumber'> => {
    const finalItems = items.filter(item => item.valuableId && typeof item.weightOrQuantity === 'number' && typeof item.rate === 'number').map(item => item as BillItem);
    
    let estimateSubTotal = parseFloat(finalItems.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2));
    let estimateTotalAmount = estimateSubTotal; // For estimates, total is subtotal (includes MC)
    
    return {
      type: billType,
      customerName,
      customerAddress,
      customerPhone,
      items: finalItems,
      subTotal: isEstimate ? estimateSubTotal : subTotal,
      cgstAmount: (isSalesBill && !isEstimate) ? cgstAmount : 0,
      sgstAmount: (isSalesBill && !isEstimate) ? sgstAmount : 0,
      totalAmount: isEstimate ? estimateTotalAmount : totalAmount,
      notes,
      purchaseNetApplied: isPurchase ? purchaseNetMode : undefined,
      purchaseNetValueApplied: isPurchase ? purchaseNetValue : undefined,
    };
  };

  const handleSubmit = () => {
    const billDetails = getCurrentBillData(false);
    if (billDetails.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one valid item.", variant: "destructive" });
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
    onSave(savedBill);
    resetForm(); // Reset form only after successful save and callback
  };

  const handleShowEstimate = () => {
    if (onShowEstimate && isSalesBill) {
      const estimateDetails = getCurrentBillData(true);
       // Construct a temporary Bill object for the estimate
      const estimateBillForView: Bill = {
        ...estimateDetails,
        id: 'estimate-preview', // Temporary ID
        date: new Date().toISOString(), // Current date for preview
        billNumber: 'ESTIMATE', // Indicate it's an estimate
        cgstAmount: 0, // Explicitly zero for estimate
        sgstAmount: 0, // Explicitly zero for estimate
        totalAmount: estimateDetails.subTotal, // Total is just subtotal for estimate
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
        {(isSalesBill || isPurchase && customerName) && ( // Show customer fields for sales, or for purchase if editing and name exists
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

        <div>
          <Label className="text-lg font-medium">Items</Label>
           <div className="py-1 grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Item</div>
            <div className="col-span-2 text-center">Qty/Wt</div>
            <div className="col-span-2 text-center">Rate</div>
            {!isPurchase && <div className="col-span-1 text-center">MC Type</div>}
            {!isPurchase && <div className="col-span-1 text-center">Making</div>}
            <div className={`col-span-2 ${isPurchase ? 'col-start-8' : ''} text-right`}>Amount</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          {items.map((item, index) => (
            <BillItemRow
              key={item.id || index} // ensure key is stable
              item={item}
              onItemChange={(updatedItem) => handleItemChange(index, updatedItem)}
              onRemoveItem={() => removeItem(index)}
              availableValuables={settings.valuables}
              isPurchase={isPurchase}
              defaultMakingCharge={settings.defaultMakingCharge}
            />
          ))}
          <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
        
        {isPurchase && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchaseNetMode">Net Calculation</Label>
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
                      <SelectItem value="percentage">Net Percentage</SelectItem>
                      <SelectItem value="fixed_price">Net Fixed Price</SelectItem>
                  </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="purchaseNetValue">{purchaseNetMode === 'percentage' ? 'Net Value (%)' : 'Net Value (Fixed)'}</Label>
              <Input 
                id="purchaseNetValue" 
                type="number" 
                value={purchaseNetValue ?? ''}
                onChange={(e) => setPurchaseNetValue(parseFloat(e.target.value))}
                placeholder={purchaseNetMode === 'percentage' ? String(settings.netPurchasePercentage) : String(settings.netPurchaseFixedPrice)}
              />
            </div>
          </div>
        )}

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
          <div className="text-xl font-bold text-primary">Total: <span className="text-2xl">{totalAmount.toFixed(2)}</span></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel} className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">
          <XCircle className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <div className="flex space-x-2">
          {isSalesBill && onShowEstimate && (
            <Button variant="outline" onClick={handleShowEstimate} className="text-accent border-accent hover:bg-accent/10 hover:text-accent">
              <FileText className="mr-2 h-4 w-4" /> Create Estimate
            </Button>
          )}
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/80">
            <Save className="mr-2 h-4 w-4" /> {existingBill ? 'Update' : 'Save'} {billTypeLabel()}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BillForm;
