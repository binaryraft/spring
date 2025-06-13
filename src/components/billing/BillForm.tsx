
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Bill, BillItem, BillType, Settings, Valuable } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Save, Calculator, FileText, XCircle, Users, ShoppingBag, ListOrdered, StickyNote, Banknote } from 'lucide-react';
import BillItemRow from './BillItemRow';
import { v4 as uuidv4 } from 'uuid';
// import { useToast } from '@/hooks/use-toast'; // Toast removed
import { Separator } from '../ui/separator';

interface BillFormProps {
  billType: BillType;
  existingBill?: Bill;
  onSaveAndPrint: (bill: Bill) => void;
  onCancel: () => void;
  onShowEstimate?: (estimateData: Bill) => void;
}

const BillForm: React.FC<BillFormProps> = ({ billType, existingBill, onSaveAndPrint, onCancel, onShowEstimate }) => {
  const { settings, addBill, updateBill, addProductName, getValuableById } = useAppContext();
  // const { toast } = useToast(); // Toast removed

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<Partial<BillItem>[]>([]);
  const [notes, setNotes] = useState('');

  const isSalesBill = billType === 'sales-bill';
  const isPurchase = billType === 'purchase';

  const customerNameRef = useRef<HTMLInputElement>(null);
  const customerPhoneRef = useRef<HTMLInputElement>(null);
  const customerAddressRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const itemRefs = useRef<Array<Array<HTMLInputElement | HTMLButtonElement | null>>>([]);


  const calculateItemTaxableAmount = useCallback((item: Partial<BillItem>): number => {
    if (typeof item.weightOrQuantity !== 'number' || item.weightOrQuantity <= 0 || !item.valuableId) return 0;

    let effectiveRate = 0;
    const valuable = getValuableById(item.valuableId);
    const marketPrice = valuable ? valuable.price : 0;

    if (isPurchase) {
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
    } else { // Sales bill
      effectiveRate = typeof item.rate === 'number' ? item.rate : 0;
    }

    if (effectiveRate < 0) effectiveRate = 0;

    let baseAmount = item.weightOrQuantity * effectiveRate;

    if (item.makingCharge && !isPurchase) {
      if (item.makingChargeType === 'percentage') {
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
      setItems(existingBill.items.map(item => {
        const taxableAmount = calculateItemTaxableAmount(item);
        let itemCgst = 0;
        let itemSgst = 0;
        if (billType === 'sales-bill') {
          itemCgst = parseFloat((taxableAmount * (settings.cgstRate / 100)).toFixed(2));
          itemSgst = parseFloat((taxableAmount * (settings.sgstRate / 100)).toFixed(2));
        }
        return {
          ...item, 
          id: item.id || uuidv4(),
          amount: taxableAmount, 
          itemCgstAmount: item.itemCgstAmount ?? itemCgst, 
          itemSgstAmount: item.itemSgstAmount ?? itemSgst,
          hsnCode: item.hsnCode || '',
        };
      }) || [{ id: uuidv4(), hsnCode: '' }]);
      setNotes(existingBill.notes || '');
      itemRefs.current = existingBill.items.map(() => []);
    } else {
      resetForm();
      itemRefs.current = [[]];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingBill, billType, settings.cgstRate, settings.sgstRate]);

 useEffect(() => {
    const reCalculatedItems = items.map(currentItem => {
      const newItem = { ...(currentItem.id ? currentItem : { ...currentItem, id: uuidv4() }) };
      if (!newItem.valuableId || newItem.weightOrQuantity === undefined) {
        return newItem;
      }
      const newTaxableAmount = calculateItemTaxableAmount(newItem);
      let newItemCgstAmount = 0;
      let newItemSgstAmount = 0;

      if (isSalesBill) {
          newItemCgstAmount = parseFloat((newTaxableAmount * (settings.cgstRate / 100)).toFixed(2));
          newItemSgstAmount = parseFloat((newTaxableAmount * (settings.sgstRate / 100)).toFixed(2));
      }

      if (newItem.amount !== newTaxableAmount || newItem.itemCgstAmount !== newItemCgstAmount || newItem.itemSgstAmount !== newItemSgstAmount) {
        return { ...newItem, amount: newTaxableAmount, itemCgstAmount: newItemCgstAmount, itemSgstAmount: newItemSgstAmount };
      }
      return newItem;
    });

    if (JSON.stringify(items) !== JSON.stringify(reCalculatedItems)) {
      setItems(reCalculatedItems);
    }
  }, [items, calculateItemTaxableAmount, isSalesBill, settings.cgstRate, settings.sgstRate]);


  const subTotal = parseFloat(items.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2));
  let billCgstAmount = 0;
  let billSgstAmount = 0;
  let finalTotalAmount = subTotal;

  if (isSalesBill) {
    billCgstAmount = parseFloat(items.reduce((acc, item) => acc + (item.itemCgstAmount || 0), 0).toFixed(2));
    billSgstAmount = parseFloat(items.reduce((acc, item) => acc + (item.itemSgstAmount || 0), 0).toFixed(2));
    finalTotalAmount = parseFloat((subTotal + billCgstAmount + billSgstAmount).toFixed(2));
  }


  const handleItemChange = (index: number, updatedFields: Partial<BillItem>) => {
    setItems(prevItems => {
        const newItems = [...prevItems];
        const currentItem = { ...(newItems[index] || { id: uuidv4() }) };
        const itemWithUpdates = { ...currentItem, ...updatedFields };

        itemWithUpdates.amount = calculateItemTaxableAmount(itemWithUpdates);

        if (isSalesBill) {
            itemWithUpdates.itemCgstAmount = parseFloat((itemWithUpdates.amount * (settings.cgstRate / 100)).toFixed(2));
            itemWithUpdates.itemSgstAmount = parseFloat((itemWithUpdates.amount * (settings.sgstRate / 100)).toFixed(2));
        } else {
            itemWithUpdates.itemCgstAmount = 0;
            itemWithUpdates.itemSgstAmount = 0;
        }
        
        newItems[index] = itemWithUpdates;
        return newItems;
    });
  };

  const handleProductNameBlur = (name: string) => {
    if (name && name.trim() !== '') {
      addProductName(name.trim());
    }
  };

  const addItem = useCallback(() => {
    const newItemShell: Partial<BillItem> = {
      id: uuidv4(),
      name: '',
      hsnCode: '',
      weightOrQuantity: 1,
      unit: settings.valuables[0]?.unit || 'gram', 
      amount: 0,
      itemCgstAmount: 0,
      itemSgstAmount: 0,
    };
    if (isPurchase) {
      newItemShell.purchaseNetType = 'net_percentage';
      newItemShell.purchaseNetPercentValue = settings.defaultPurchaseItemNetPercentage;
      newItemShell.purchaseNetFixedValue = settings.defaultPurchaseItemNetFixedValue;
    } else { 
      newItemShell.makingChargeType = settings.defaultMakingCharge.type;
      newItemShell.makingCharge = settings.defaultMakingCharge.value;
    }
    
    setItems(prevItems => [...prevItems, newItemShell]);
    itemRefs.current.push([]); 
    setTimeout(() => {
      const newRowIndex = items.length; 
      if (itemRefs.current[newRowIndex] && itemRefs.current[newRowIndex][0]) {
        (itemRefs.current[newRowIndex][0] as HTMLElement)?.focus();
      }
    }, 0);
  }, [isPurchase, settings.defaultPurchaseItemNetPercentage, settings.defaultPurchaseItemNetFixedValue, settings.defaultMakingCharge, settings.valuables, items.length]);


  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    itemRefs.current.splice(index, 1);
  };

  const getCurrentBillData = (isEstimateMode: boolean = false): Omit<Bill, 'id'|'date'|'billNumber'> => {
    const finalItems = items
      .filter(item => item.valuableId && item.name && item.name.trim() !== '' && typeof item.weightOrQuantity === 'number' && item.weightOrQuantity > 0)
      .map(item => {
        if (!item.valuableId || !item.unit) {
          return null;
        }
        const taxableAmount = item.amount || 0;
        let itemCgst = 0;
        let itemSgst = 0;
        // HSN should only be included for non-estimate sales bills
        const includeHsn = billType === 'sales-bill' && !isEstimateMode;


        if (billType === 'sales-bill' && !isEstimateMode) {
            itemCgst = item.itemCgstAmount || 0;
            itemSgst = item.itemSgstAmount || 0;
        } else { 
            itemCgst = 0;
            itemSgst = 0;
        }

        return {
          id: item.id || uuidv4(),
          valuableId: item.valuableId,
          name: item.name || '',
          hsnCode: includeHsn ? (item.hsnCode || '') : undefined, 
          weightOrQuantity: item.weightOrQuantity || 0,
          unit: item.unit,
          rate: item.rate || 0, 
          makingCharge: item.makingCharge,
          makingChargeType: item.makingChargeType,
          amount: taxableAmount, 
          purchaseNetType: item.purchaseNetType,
          purchaseNetPercentValue: item.purchaseNetPercentValue,
          purchaseNetFixedValue: item.purchaseNetFixedValue,
          itemCgstAmount: itemCgst,
          itemSgstAmount: itemSgst,
        } as BillItem;
      }).filter(item => item !== null) as BillItem[];

    const currentSubTotal = parseFloat(finalItems.reduce((acc, item) => acc + (item.amount || 0), 0).toFixed(2)); 
    let currentBillCgst = 0;
    let currentBillSgst = 0;
    
    if (billType === 'sales-bill' && !isEstimateMode) {
        currentBillCgst = parseFloat(finalItems.reduce((acc, item) => acc + (item.itemCgstAmount || 0), 0).toFixed(2));
        currentBillSgst = parseFloat(finalItems.reduce((acc, item) => acc + (item.itemSgstAmount || 0), 0).toFixed(2));
    }
    
    let currentTotalAmount = currentSubTotal + currentBillCgst + currentBillSgst;
    
    if (isEstimateMode) { 
        currentTotalAmount = currentSubTotal;
        currentBillCgst = 0; 
        currentBillSgst = 0;
    }


    return {
      type: billType,
      customerName,
      customerAddress,
      customerPhone,
      items: finalItems,
      subTotal: currentSubTotal,
      cgstAmount: currentBillCgst,
      sgstAmount: currentBillSgst,
      totalAmount: parseFloat(currentTotalAmount.toFixed(2)),
      notes,
    };
  };

  const handleSubmit = () => {
    const billDetails = getCurrentBillData(false); 
    if (billDetails.items.length === 0) {
      // toast({ title: "Error", description: "Please add at least one valid item with a selected material type.", variant: "destructive" }); // Toast removed
      return;
    }

    let savedBill;
    if (existingBill) {
      savedBill = { ...existingBill, ...billDetails };
      updateBill(savedBill);
      // toast({ title: "Success", description: `${billTypeLabel()} updated.` }); // Toast removed
    } else {
      savedBill = addBill(billDetails);
      // toast({ title: "Success", description: `${billTypeLabel()} created.` }); // Toast removed
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
      hsnCode: '',
      weightOrQuantity: 1,
      amount: 0,
      itemCgstAmount: 0,
      itemSgstAmount: 0,
      unit: settings.valuables[0]?.unit || 'gram',
    };
    if (isPurchase) {
      initialItem.purchaseNetType = 'net_percentage';
      initialItem.purchaseNetPercentValue = settings.defaultPurchaseItemNetPercentage;
      initialItem.purchaseNetFixedValue = settings.defaultPurchaseItemNetFixedValue;
    } else {
      initialItem.makingChargeType = settings.defaultMakingCharge.type;
      initialItem.makingCharge = settings.defaultMakingCharge.value;
    }
    setItems([initialItem]);
    setNotes('');
    itemRefs.current = [[]]; 
  }, [settings, isPurchase]);

  const billTypeLabel = () => {
    switch(billType) {
      case 'purchase': return 'Purchase Bill';
      case 'sales-bill': return 'Sales Bill';
      default: return 'Bill';
    }
  };

  const handleCustomerKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, nextFieldRef?: React.RefObject<HTMLElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Allow shift+enter for new lines in textarea
      event.preventDefault();
      if (nextFieldRef?.current) {
        nextFieldRef.current.focus();
      } else if (itemRefs.current[0] && itemRefs.current[0][0]) {
        (itemRefs.current[0][0] as HTMLElement).focus();
      }
    }
  };

  const focusNextRowFirstElement = useCallback(() => {
    const lastItemIndex = items.length - 1;
    if (itemRefs.current[lastItemIndex] && itemRefs.current[lastItemIndex][0]) {
        (itemRefs.current[lastItemIndex][0] as HTMLElement).focus();
    }
  }, [items.length]);

  const headerGridColsClass = isPurchase
    ? "grid-cols-[1.5fr_2fr_1fr_1.5fr_1fr_1fr_0.5fr]" 
    : billType === 'sales-bill' 
      ? "grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_0.5fr]" 
      : "grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr_0.5fr]";


  return (
    <Card className="shadow-xl border-primary/20 bg-card">
      <CardHeader className="pb-6">
        <CardTitle className="font-headline text-4xl lg:text-5xl text-primary flex items-center">
          <Calculator className="mr-4 h-10 w-10 lg:h-12 lg:w-12" /> {existingBill ? 'Edit' : 'Create'} {billTypeLabel()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-10 pt-2">
        <div className="p-6 border border-border rounded-lg bg-background shadow-sm">
            <h3 className="text-2xl lg:text-3xl font-semibold text-accent mb-6 flex items-center">
                {isPurchase ? <ShoppingBag className="mr-3 h-7 w-7 lg:h-8 lg:w-8"/> : <Users className="mr-3 h-7 w-7 lg:h-8 lg:w-8"/>}
                {isPurchase ? "Supplier" : "Customer"} Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-7 gap-y-6">
                <div>
                <Label htmlFor="customerName" className="text-lg">{isPurchase ? "Supplier" : "Customer"} Name</Label>
                <Input
                    id="customerName"
                    ref={customerNameRef}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => handleCustomerKeyDown(e, customerPhoneRef)}
                    className="mt-2 h-12 text-lg"
                />
                </div>
                <div>
                <Label htmlFor="customerPhone" className="text-lg">{isPurchase ? "Supplier" : "Customer"} Phone</Label>
                <Input
                    id="customerPhone"
                    ref={customerPhoneRef}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onKeyDown={(e) => handleCustomerKeyDown(e, customerAddressRef)}
                    className="mt-2 h-12 text-lg"
                />
                </div>
                <div className="md:col-span-3">
                <Label htmlFor="customerAddress" className="text-lg">{isPurchase ? "Supplier" : "Customer"} Address</Label>
                <Textarea
                    id="customerAddress"
                    ref={customerAddressRef}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    onKeyDown={(e) => handleCustomerKeyDown(e)} 
                    className="mt-2 text-lg"
                    rows={3}
                />
                </div>
            </div>
          </div>
        

        <div className="p-6 border border-border rounded-lg bg-background shadow-sm">
          <h3 className="text-2xl lg:text-3xl font-semibold text-accent mb-6 flex items-center"><ListOrdered className="mr-3 h-7 w-7 lg:h-8 lg:w-8"/>Items</h3>
           <div className={`py-3.5 px-4 grid ${headerGridColsClass} gap-3 text-base font-semibold text-muted-foreground uppercase tracking-wider mt-2 bg-muted/50 rounded-t-md border-x border-t`}>
            <div className="col-span-1">Material</div>
            <div className="col-span-1">Product Name</div>
            {billType === 'sales-bill' && <div className="col-span-1 text-center">HSN</div>}
            <div className="col-span-1 text-center">Qty/Wt</div>
            {isPurchase ? (
                <>
                    <div className="col-span-1 text-center">Net Type</div>
                    <div className="col-span-1 text-center">Value</div>
                </>
            ) : (
                 <>
                    <div className="col-span-1 text-center">Rate</div>
                    <div className="col-span-1 text-center">MC Type</div>
                    <div className="col-span-1 text-center">Making</div>
                 </>
            )}
            <div className="col-span-1 text-right">Taxable Amt</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
          <div className="border rounded-b-md">
            {items.map((item, index) => (
                <BillItemRow
                key={item.id || index}
                item={item}
                onItemChange={(updatedFields) => handleItemChange(index, updatedFields)}
                onProductNameBlur={handleProductNameBlur}
                onRemoveItem={() => removeItem(index)}
                availableValuables={settings.valuables}
                productNames={settings.productNames}
                isPurchase={isPurchase}
                defaultMakingCharge={settings.defaultMakingCharge}
                defaultPurchaseNetPercentage={settings.defaultPurchaseItemNetPercentage}
                defaultPurchaseNetFixedValue={settings.defaultPurchaseItemNetFixedValue}
                getValuablePrice={(valuableId) => getValuableById(valuableId)?.price || 0}
                onEnterInLastField={addItem}
                focusNextRowFirstElement={focusNextRowFirstElement}
                rowIndex={index}
                itemRefs={itemRefs}
                currencySymbol={settings.currencySymbol}
                />
            ))}
          </div>
          <Button variant="outline" size="default" onClick={addItem} className="mt-6 shadow hover:shadow-md transition-shadow text-lg px-6 py-3 h-auto">
            <PlusCircle className="mr-2.5 h-5 w-5" /> Add Item
          </Button>
        </div>
        
        <div className="p-6 border border-border rounded-lg bg-background shadow-sm">
            <h3 className="text-2xl lg:text-3xl font-semibold text-accent mb-5 flex items-center"><StickyNote className="mr-3 h-7 w-7 lg:h-8 lg:w-8"/>Notes</h3>
            <Textarea
                id="notes"
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="shadow-sm text-lg"
                rows={4}
                placeholder="Any additional notes for the bill..."
            />
        </div>
        
        <div className="p-7 border-2 border-primary/30 rounded-lg bg-primary/5 space-y-4 text-right shadow-md">
          <h3 className="text-2xl lg:text-3xl font-semibold text-primary mb-5 flex items-center justify-end"><Banknote className="mr-3 h-7 w-7 lg:h-8 lg:w-8"/>Totals</h3>
          <div className="text-xl">Subtotal (Taxable Value): <span className="font-semibold text-2xl ml-3">{settings.currencySymbol}{subTotal.toFixed(2)}</span></div>
          {(isSalesBill) && (
            <>
              <div className="text-xl">CGST ({settings.cgstRate}%): <span className="font-semibold text-2xl ml-3">{settings.currencySymbol}{billCgstAmount.toFixed(2)}</span></div>
              <div className="text-xl">SGST ({settings.sgstRate}%): <span className="font-semibold text-2xl ml-3">{settings.currencySymbol}{billSgstAmount.toFixed(2)}</span></div>
            </>
          )}
          <Separator className="my-3 bg-primary/20"/>
          <div className="text-3xl lg:text-4xl font-bold text-primary">Total: <span className="text-4xl lg:text-5xl ml-3">{settings.currencySymbol}{finalTotalAmount.toFixed(2)}</span></div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-start border-t pt-8 mt-8">
        <Button variant="outline" onClick={onCancel} className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive shadow hover:shadow-md transition-shadow text-lg px-6 py-3 h-auto">
          <XCircle className="mr-2.5 h-5 w-5" /> Cancel
        </Button>
        <div className="flex items-start space-x-5">
          {onShowEstimate && ( 
            <div className="flex flex-col items-center">
                <Button 
                  variant="outline" 
                  onClick={handleShowEstimate} 
                  className="text-accent border-accent hover:bg-accent/10 hover:text-accent shadow hover:shadow-md transition-shadow text-lg px-6 py-3 h-auto w-full"
                >
                  <FileText className="mr-2.5 h-5 w-5" /> Create Estimate
                </Button>
                <p className="text-lg text-foreground mt-2.5"> 
                    {settings.currencySymbol}{subTotal.toFixed(2)}
                </p>
            </div>
          )}
           <div className="flex flex-col items-center">
                <Button 
                  onClick={handleSubmit} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto w-full"
                >
                  <Save className="mr-2.5 h-5 w-5" /> {existingBill ? 'Update' : 'Save'} & Print Bill
                </Button>
                <p className="text-lg text-secondary mt-2.5">
                    {settings.currencySymbol}{finalTotalAmount.toFixed(2)}
                </p>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BillForm;
