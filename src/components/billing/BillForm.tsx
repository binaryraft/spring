
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import type { Bill, BillItem, BillType, Settings, Valuable } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Calculator } from 'lucide-react';
import BillItemRow from './BillItemRow';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BillFormProps {
  billType: BillType;
  existingBill?: Bill; // For editing
  onSave: (bill: Bill) => void; // Callback after saving
}

const BillForm: React.FC<BillFormProps> = ({ billType, existingBill, onSave }) => {
  const { settings, addBill, updateBill, getValuableById } = useAppContext();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState(existingBill?.customerName || '');
  const [customerAddress, setCustomerAddress] = useState(existingBill?.customerAddress || '');
  const [customerPhone, setCustomerPhone] = useState(existingBill?.customerPhone || '');
  const [items, setItems] = useState<Partial<BillItem>[]>(existingBill?.items || [{ id: uuidv4() }]);
  const [notes, setNotes] = useState(existingBill?.notes || '');

  // Purchase specific state
  const [purchaseNetMode, setPurchaseNetMode] = useState<'percentage' | 'fixed_price' | undefined>(
    existingBill?.type === 'purchase' ? existingBill.purchaseNetApplied || settings.netPurchaseMode : undefined
  );
  const [purchaseNetValue, setPurchaseNetValue] = useState<number | undefined>(
    existingBill?.type === 'purchase' ? existingBill.purchaseNetValueApplied || (settings.netPurchaseMode === 'percentage' ? settings.netPurchasePercentage : settings.netPurchaseFixedPrice ) : undefined
  );

  const isSales = billType.startsWith('sales');
  const isEstimate = billType === 'sales-estimate';
  const isPurchase = billType === 'purchase';


  const calculateItemAmount = useCallback((item: Partial<BillItem>): number => {
    if (!item.valuableId || !item.weightOrQuantity || !item.rate) return 0;
    let baseAmount = item.weightOrQuantity * item.rate;
    if (item.makingCharge && !isPurchase) { // Making charges typically for sales
      if (item.makingChargeType === 'percentage') {
        baseAmount += baseAmount * (item.makingCharge / 100);
      } else {
        baseAmount += item.makingCharge;
      }
    }
    return baseAmount;
  }, [isPurchase]);
  
  useEffect(() => {
    setItems(prevItems => prevItems.map(item => ({ ...item, amount: calculateItemAmount(item) })));
  }, [items.map(i => i.valuableId && i.weightOrQuantity && i.rate && i.makingCharge), calculateItemAmount]);


  const subTotal = items.reduce((acc, item) => acc + (item.amount || 0), 0);
  
  let totalAmount = subTotal;
  let cgstAmount = 0;
  let sgstAmount = 0;

  if (isPurchase && purchaseNetMode && purchaseNetValue !== undefined) {
    if (purchaseNetMode === 'percentage') {
      totalAmount = subTotal * (1 - purchaseNetValue / 100);
    } else { // fixed_price
      totalAmount = purchaseNetValue; // The final price is this value
    }
  } else if (isSales && !isEstimate) {
    cgstAmount = totalAmount * (settings.cgstRate / 100);
    sgstAmount = totalAmount * (settings.sgstRate / 100);
    totalAmount += cgstAmount + sgstAmount;
  }


  const handleItemChange = (index: number, updatedItem: Partial<BillItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updatedItem, amount: calculateItemAmount(updatedItem) };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: uuidv4() }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = () => {
    const finalItems = items.filter(item => item.valuableId && item.weightOrQuantity && item.rate).map(item => item as BillItem);
    if (finalItems.length === 0) {
      toast({ title: "Error", description: "Please add at least one valid item.", variant: "destructive" });
      return;
    }

    const billData: Omit<Bill, 'id'|'date'|'billNumber'> = {
      type: billType,
      customerName,
      customerAddress,
      customerPhone,
      items: finalItems,
      subTotal,
      cgstAmount: (isSales && !isEstimate) ? cgstAmount : undefined,
      sgstAmount: (isSales && !isEstimate) ? sgstAmount : undefined,
      totalAmount,
      notes,
      purchaseNetApplied: isPurchase ? purchaseNetMode : undefined,
      purchaseNetValueApplied: isPurchase ? purchaseNetValue : undefined,
    };
    
    let savedBill;
    if (existingBill) {
      savedBill = { ...existingBill, ...billData };
      updateBill(savedBill);
      toast({ title: "Success", description: `${billTypeLabel()} updated.` });
    } else {
      savedBill = addBill(billData);
      toast({ title: "Success", description: `${billTypeLabel()} created.` });
    }
    onSave(savedBill); // Callback for any parent component logic (e.g. closing modal, redirecting)
    resetForm();
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerAddress('');
    setCustomerPhone('');
    setItems([{ id: uuidv4() }]);
    setNotes('');
    if (isPurchase) {
      setPurchaseNetMode(settings.netPurchaseMode);
      setPurchaseNetValue(settings.netPurchaseMode === 'percentage' ? settings.netPurchasePercentage : settings.netPurchaseFixedPrice);
    }
  };

  const billTypeLabel = () => {
    switch(billType) {
      case 'purchase': return 'Purchase Bill';
      case 'sales-estimate': return 'Sales Estimate';
      case 'sales-bill': return 'Sales Bill';
      default: return 'Bill';
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <Calculator className="mr-2 h-6 w-6" /> Create {billTypeLabel()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSales && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="customerAddress">Customer Address</Label>
              <Textarea id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label className="text-lg font-medium">Items</Label>
          <div className="py-1 grid grid-cols-12 gap-2 text-sm font-semibold text-muted-foreground">
            <div className="col-span-3">Item</div>
            <div className="col-span-2">Qty/Wt</div>
            <div className="col-span-2">Rate</div>
            {!isPurchase && <div className="col-span-1">MC Type</div>}
            {!isPurchase && <div className="col-span-1">Making</div>}
            <div className={`col-span-2 ${isPurchase ? 'col-start-8' : ''} text-right`}>Amount</div>
            <div className="col-span-1">Action</div>
          </div>
          {items.map((item, index) => (
            <BillItemRow
              key={item.id || index}
              item={item}
              onItemChange={(updatedItem) => handleItemChange(index, updatedItem)}
              onRemoveItem={() => removeItem(index)}
              availableValuables={settings.valuables}
              isPurchase={isPurchase}
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
                  onValueChange={(value: 'percentage' | 'fixed_price') => setPurchaseNetMode(value)}
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
                value={purchaseNetValue || ''}
                onChange={(e) => setPurchaseNetValue(parseFloat(e.target.value))}
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
          {(isSales && !isEstimate) && (
            <>
              <div>CGST ({settings.cgstRate}%): <span className="text-lg">{cgstAmount.toFixed(2)}</span></div>
              <div>SGST ({settings.sgstRate}%): <span className="text-lg">{sgstAmount.toFixed(2)}</span></div>
            </>
          )}
          <div className="text-xl font-bold text-primary">Total: <span className="text-2xl">{totalAmount.toFixed(2)}</span></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/80">
          <Save className="mr-2 h-4 w-4" /> {existingBill ? 'Update' : 'Save'} {billTypeLabel()}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BillForm;
