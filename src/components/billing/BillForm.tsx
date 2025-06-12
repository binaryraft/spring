
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

interface BillFormProps {
  billType: BillType;
  existingBill?: Bill;
  onSaveAndPrint: (bill: Bill) => void;
  onCancel: () => void;
  onShowEstimate?: (estimateData: Bill) => void;
}

const BillForm: React.FC<BillFormProps> = ({ billType, existingBill, onSaveAndPrint, onCancel, onShowEstimate }) => {
  const { settings, addBill, updateBill, addCustomItemName, getValuableById } = useAppContext();
  const { toast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<Partial<BillItem>[]>([]);
  const [notes, setNotes] = useState('');

  const isSalesBill = billType === 'sales-bill';
  const isPurchase = billType === 'purchase';

  const calculateItemAmount = useCallback((item: Partial<BillItem>): number => {
    if (typeof item.weightOrQuantity !== 'number' || item.weightOrQuantity <= 0 || !item.valuableId) return 0;

    let effectiveRate = 0;
    const valuable = getValuableById(item.valuableId); // For market price
    const marketPrice = valuable ? valuable.price : 0;

    if (isPurchase) {
      switch (item.purchaseNetType) {
        case 'net_percentage':
          effectiveRate = marketPrice * (1 - ((item.purchaseNetPercentValue || 0) / 100));
          break;
        case 'fixed_net_price':
          effectiveRate = item.purchaseNetFixedValue || 0;
          break;
        default: // Should not happen as 'market_rate' is removed for purchaseNetType
          effectiveRate = 0; 
          break;
      }
    } else { // Sales Bill
      effectiveRate = typeof item.rate === 'number' ? item.rate : 0;
    }
    
    if (effectiveRate < 0) effectiveRate = 0;

    let baseAmount = item.weightOrQuantity * effectiveRate;

    if (item.makingCharge && !isPurchase) { 
      if (item.makingChargeType === 'percentage') {
        // Making charge % is on (qty * rate), not on (qty * effectiveRate for purchase)
        // For sales, item.rate is the correct base for MC percentage calculation.
        const mcBaseForSales = item.weightOrQuantity * (item.rate || 0);
        baseAmount += mcBaseForSales * (item.makingCharge / 100);
      } else {
        baseAmount += item.makingCharge; 
      }
    }
    return parseFloat(baseAmount.toFixed(2));
  }, [isPurchase, getValuableById]);


 useEffect(() => {
    if (existingBill) {
      setCustomerName(existingBill.customerName || '');
      setCustomerAddress(existingBill.customerAddress || '');
      setCustomerPhone(existingBill.customerPhone || '');
      setItems(existingBill.items.map(item => ({...item, id: item.id || uuidv4() })) || [{ id: uuidv4() }]);
      setNotes(existingBill.notes || '');
    } else {
      resetForm();
    }
  }, [existingBill]); // resetForm removed from deps as it causes loops, handled by initialBill state.
  
  useEffect(() => {
    // Debounce or make smarter to avoid excessive recalculations if possible
    const reCalculatedItems = items.map(currentItem => {
      if (!currentItem.id) return { ...currentItem, id: uuidv4() }; // Ensure ID
      
      // Only recalculate if essential fields that affect amount are present
      if (!currentItem.valuableId || currentItem.weightOrQuantity === undefined) {
        return currentItem; // Not enough info to calculate, keep as is
      }

      const newAmount = calculateItemAmount(currentItem);
      if (currentItem.amount !== newAmount) {
        return { ...currentItem, amount: newAmount };
      }
      return currentItem;
    });
  
    // Check if there's an actual change in items structure or amounts
    let itemsChanged = items.length !== reCalculatedItems.length;
    if (!itemsChanged) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].amount !== reCalculatedItems[i].amount || 
            items[i].name !== reCalculatedItems[i].name ||
            items[i].valuableId !== reCalculatedItems[i].valuableId ||
            items[i].weightOrQuantity !== reCalculatedItems[i].weightOrQuantity ||
            items[i].rate !== reCalculatedItems[i].rate // Add other relevant fields
            ) {
          itemsChanged = true;
          break;
        }
      }
    }

    if (itemsChanged) {
      setItems(reCalculatedItems);
    }
  }, [items, calculateItemAmount]); // Keep calculateItemAmount, items is the primary trigger

  const subTotal = parseFloat(items.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2));
  
  let totalAmount = subTotal;
  let cgstAmount = 0;
  let sgstAmount = 0;

  if (isSalesBill) { 
    cgstAmount = subTotal * (settings.cgstRate / 100);
    sgstAmount = subTotal * (settings.sgstRate / 100);
    totalAmount += cgstAmount + sgstAmount;
  }
  
  totalAmount = parseFloat(totalAmount.toFixed(2));
  cgstAmount = parseFloat(cgstAmount.toFixed(2));
  sgstAmount = parseFloat(sgstAmount.toFixed(2));

  // Calculate estimate total (subtotal for sales, no GST)
  const estimateTotal = subTotal;


  const handleItemChange = (index: number, updatedFields: Partial<BillItem>) => {
    setItems(prevItems => {
        const newItems = [...prevItems];
        // Ensure the item at index exists and create a full copy
        const currentItem = { ...(newItems[index] || { id: uuidv4() }) }; 
        
        const itemWithUpdates = { ...currentItem, ...updatedFields };
        
        // Recalculate amount based on the fully updated item state
        itemWithUpdates.amount = calculateItemAmount(itemWithUpdates);
        
        newItems[index] = itemWithUpdates; 
        return newItems;
    });
  };
  
  const handleItemNameBlur = (name: string) => {
    if (name && name.trim() !== '') {
      addCustomItemName(name.trim());
    }
  };

  const addItem = () => {
    const newItemShell: Partial<BillItem> = { 
      id: uuidv4(), 
      name: '', // User will type this, or it defaults from valuable IF item.name is empty
      weightOrQuantity: 1, 
      // rate will be set upon valuable selection
      // makingCharge will use defaults upon valuable selection (for sales)
      unit: '', // Will be set when valuable is selected
    };
    if (isPurchase) {
      newItemShell.purchaseNetType = 'net_percentage'; // Default for new purchase items
      newItemShell.purchaseNetPercentValue = settings.defaultPurchaseItemNetPercentage;
      newItemShell.purchaseNetFixedValue = settings.defaultPurchaseItemNetFixedValue; // Will be used if type changes
    } else { // Sales
      newItemShell.makingChargeType = settings.defaultMakingCharge.type;
      newItemShell.makingCharge = settings.defaultMakingCharge.value;
    }
    // Amount will be calculated once a valuable is selected and rate/type is known. Initial amount is 0.
    newItemShell.amount = 0; 
    setItems([...items, newItemShell]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const getCurrentBillData = (isEstimateMode: boolean = false): Omit<Bill, 'id'|'date'|'billNumber'> => {
    const finalItems = items
      .filter(item => item.valuableId && item.name && item.name.trim() !== '' && typeof item.weightOrQuantity === 'number' && item.weightOrQuantity > 0) 
      .map(item => {
        // Ensure all required fields for BillItem are present
        if (!item.valuableId || !item.unit) {
          console.warn("Item missing valuableId or unit", item);
          return null; 
        }
        // Make sure to include all necessary fields from Partial<BillItem> to BillItem
        return {
          id: item.id || uuidv4(),
          valuableId: item.valuableId,
          name: item.name || '',
          weightOrQuantity: item.weightOrQuantity || 0,
          unit: item.unit,
          rate: item.rate || 0, // Base rate
          makingCharge: item.makingCharge,
          makingChargeType: item.makingChargeType,
          amount: item.amount || 0,
          purchaseNetType: item.purchaseNetType,
          purchaseNetPercentValue: item.purchaseNetPercentValue,
          purchaseNetFixedValue: item.purchaseNetFixedValue,
        } as BillItem;
      }).filter(item => item !== null) as BillItem[];
    
    const currentSubTotal = parseFloat(finalItems.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2));
    let currentTotalAmount = currentSubTotal;
    let currentCgst = 0;
    let currentSgst = 0;

    if (isSalesBill && !isEstimateMode) { 
      currentCgst = currentSubTotal * (settings.cgstRate / 100);
      currentSgst = currentSubTotal * (settings.sgstRate / 100);
      currentTotalAmount = currentSubTotal + currentCgst + currentSgst;
    } else if (isEstimateMode) {
      currentTotalAmount = currentSubTotal; // For estimates, total is subtotal
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
    };
  };

  const handleSubmit = () => {
    const billDetails = getCurrentBillData(false);
    if (billDetails.items.length === 0) {
      toast({ title: "Error", description: "Please add at least one valid item with a selected material type.", variant: "destructive" });
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
    onSaveAndPrint(savedBill);
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
    const initialItem: Partial<BillItem> = { 
      id: uuidv4(), 
      name: '',
      weightOrQuantity: 1,
      // rate, unit, valuableId, makingCharge will be set on valuable selection
      amount: 0, 
    };
    if (isPurchase) {
      initialItem.purchaseNetType = 'net_percentage'; // Default purchase type
      initialItem.purchaseNetPercentValue = settings.defaultPurchaseItemNetPercentage;
      initialItem.purchaseNetFixedValue = settings.defaultPurchaseItemNetFixedValue;
    } else { // Sales
      initialItem.makingChargeType = settings.defaultMakingCharge.type; 
      initialItem.makingCharge = settings.defaultMakingCharge.value;
    }
    setItems([initialItem]);
    setNotes('');
  }, [settings, isPurchase]); // Added settings and isPurchase

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
        {(isSalesBill || isPurchase) && (
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
           <div className={`py-1 grid ${isPurchase ? 'grid-cols-12' : 'grid-cols-12'} gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2`}>
            <div className="col-span-2">Material</div>
            <div className="col-span-3">Product Name/Desc</div>
            <div className="col-span-1 text-center">Qty/Wt</div>
            {isPurchase && <div className="col-span-2 text-center">Net Type</div>}
            <div className="col-span-1 text-center">{isPurchase ? "Value" : "Rate"}</div>
            {!isPurchase && <div className="col-span-1 text-center">MC Type</div>}
            {!isPurchase && <div className="col-span-1 text-center">Making</div>}
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          {items.map((item, index) => (
            <BillItemRow
              key={item.id || index} 
              item={item}
              onItemChange={(updatedFields) => handleItemChange(index, updatedFields)}
              onItemNameBlur={handleItemNameBlur}
              onRemoveItem={() => removeItem(index)}
              availableValuables={settings.valuables}
              customItemNames={settings.customItemNames}
              isPurchase={isPurchase}
              defaultMakingCharge={settings.defaultMakingCharge}
              defaultPurchaseNetPercentage={settings.defaultPurchaseItemNetPercentage}
              defaultPurchaseNetFixedValue={settings.defaultPurchaseItemNetFixedValue}
              getValuablePrice={(valuableId) => getValuableById(valuableId)?.price || 0}
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
          <div className="text-xl font-bold text-primary">Total: <span className="text-2xl">{totalAmount.toFixed(2)}</span></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Button variant="outline" onClick={onCancel} className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">
          <XCircle className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <div className="flex space-x-2">
          {onShowEstimate && (
            <Button variant="outline" onClick={handleShowEstimate} className="text-accent border-accent hover:bg-accent/10 hover:text-accent flex flex-col h-auto py-2">
              <span className="flex items-center"><FileText className="mr-2 h-4 w-4" /> Create Estimate</span>
              <span className="text-xs text-muted-foreground mt-1">Total: {estimateTotal.toFixed(2)}</span>
            </Button>
          )}
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/80 flex flex-col h-auto py-2">
             <span className="flex items-center"><Save className="mr-2 h-4 w-4" /> {existingBill ? 'Update' : 'Save'} & Print</span>
             <span className="text-xs text-primary-foreground/80 mt-1">Total: {totalAmount.toFixed(2)}</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BillForm;
