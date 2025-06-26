
"use client";
import React, { useRef, useMemo, useEffect } from 'react';
import type { BillItem, Valuable, MakingChargeSetting, ProductSuggestion } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import ValuableIcon from '../ValuableIcon';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';

interface BillItemRowProps {
  item: Partial<BillItem>;
  onItemChange: (updatedFields: Partial<BillItem>) => void;
  onRemoveItem: () => void;
  availableValuables: Valuable[]; // All valuables from settings
  productSuggestions: ProductSuggestion[];
  isPurchase: boolean;
  defaultMakingCharge: MakingChargeSetting;
  defaultPurchaseNetPercentage: number;
  defaultPurchaseNetFixedValue: number;
  getValuablePrice: (valuableId: string) => number;
  onEnterInLastField?: () => void;
  rowIndex: number;
  itemRefs: React.MutableRefObject<Array<Array<HTMLInputElement | HTMLButtonElement | null>>>;
  currencySymbol: string;
  enableHsnCode: boolean;
}

const BillItemRow: React.FC<BillItemRowProps> = ({
  item,
  onItemChange,
  onRemoveItem,
  availableValuables,
  productSuggestions,
  isPurchase,
  defaultMakingCharge,
  defaultPurchaseNetPercentage,
  defaultPurchaseNetFixedValue,
  getValuablePrice,
  onEnterInLastField,
  rowIndex,
  itemRefs,
  currencySymbol,
  enableHsnCode,
}) => {

  const materialSelectRef = useRef<HTMLButtonElement>(null);
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const hsnCodeInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null);
  const mcTypeSelectRef = useRef<HTMLButtonElement>(null);
  const mcValueInputRef = useRef<HTMLInputElement>(null);
  const purchaseNetTypeSelectRef = useRef<HTMLButtonElement>(null);
  const purchaseNetPercentInputRef = useRef<HTMLInputElement>(null);
  const purchaseNetFixedInputRef = useRef<HTMLInputElement>(null);

  const showHsnForSales = !isPurchase && enableHsnCode;

  useEffect(() => {
    const fields: Array<HTMLInputElement | HTMLButtonElement | null> = [
      materialSelectRef.current,
      productNameInputRef.current,
    ];
    if (showHsnForSales) {
      fields.push(hsnCodeInputRef.current);
    }
    fields.push(qtyInputRef.current);

    if (isPurchase) {
      fields.push(purchaseNetTypeSelectRef.current);
      fields.push(
        item.purchaseNetType === 'net_percentage' ? purchaseNetPercentInputRef.current : purchaseNetFixedInputRef.current
      );
    } else {
      fields.push(rateInputRef.current);
      fields.push(mcTypeSelectRef.current);
      fields.push(mcValueInputRef.current);
    }
    itemRefs.current[rowIndex] = fields.filter(Boolean);
  }, [rowIndex, itemRefs, isPurchase, item.purchaseNetType, showHsnForSales]);

  const displayableMaterials = useMemo(() => {
    let filtered = availableValuables;
    const currentItemValuable = item.valuableId ? availableValuables.find(v => v.id === item.valuableId) : null;

    if (currentItemValuable && !filtered.find(v => v.id === currentItemValuable.id)) {
        filtered.push(currentItemValuable);
    }
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableValuables, item.valuableId]);


  const handleValuableSelect = (valuableId: string) => {
    const selectedValuable = availableValuables.find(v => v.id === valuableId);
    if (selectedValuable) {
      const updates: Partial<BillItem> = {
        valuableId,
        unit: selectedValuable.unit,
      };

      if (!isPurchase) {
        updates.rate = selectedValuable.price;
        updates.makingChargeType = item.makingChargeType || defaultMakingCharge.type;
        updates.makingCharge = item.makingCharge === undefined ? defaultMakingCharge.value : item.makingCharge;
      } else {
        updates.purchaseNetType = item.purchaseNetType || 'net_percentage';
        if (updates.purchaseNetType === 'net_percentage') {
          updates.purchaseNetPercentValue = item.purchaseNetPercentValue ?? defaultPurchaseNetPercentage;
        } else if (updates.purchaseNetType === 'fixed_net_price') {
          updates.purchaseNetFixedValue = item.purchaseNetFixedValue ?? defaultPurchaseNetFixedValue;
        }
      }
      onItemChange(updates);
    }
  };
  
  const handleProductNameChange = (newName: string) => {
    const suggestion = productSuggestions.find(p => p.name.toLowerCase() === newName.toLowerCase());
    if (suggestion && enableHsnCode) {
      onItemChange({ name: newName, hsnCode: suggestion.hsnCode });
    } else {
      onItemChange({ name: newName });
    }
  };

  const handleFieldChange = (field: keyof BillItem, value: any) => {
    let processedValue: any = value;
    const numericFields: (keyof BillItem)[] = ['weightOrQuantity', 'rate', 'makingCharge', 'purchaseNetPercentValue', 'purchaseNetFixedValue'];

    if (numericFields.includes(field)) {
        if (value === '') {
            processedValue = undefined;
        } else {
            const parsed = parseFloat(value);
            processedValue = isNaN(parsed) ? item[field] : parsed;
        }
    }
    
    const updates: Partial<BillItem> = { [field]: processedValue };
    
    if (field === 'purchaseNetType' && isPurchase) {
        updates.purchaseNetPercentValue = value === 'net_percentage' ? (item.purchaseNetPercentValue ?? defaultPurchaseNetPercentage) : undefined;
        updates.purchaseNetFixedValue = value === 'fixed_net_price' ? (item.purchaseNetFixedValue ?? defaultPurchaseNetFixedValue) : undefined;
    }
    onItemChange(updates);
  };

  const selectedValuableDetails = item.valuableId ? availableValuables.find(v => v.id === item.valuableId) : null;
  const datalistId = `product-names-datalist-${item.id || 'new'}`;

  const marketPriceForPurchase = isPurchase && item.valuableId ? getValuablePrice(item.valuableId) : 0;
  let effectiveRateForPurchaseDisplay = 0;

  if (isPurchase && item.valuableId) {
    if (item.purchaseNetType === 'net_percentage') {
        effectiveRateForPurchaseDisplay = marketPriceForPurchase * (1 - ((item.purchaseNetPercentValue || 0) / 100));
    } else if (item.purchaseNetType === 'fixed_net_price') {
        effectiveRateForPurchaseDisplay = item.purchaseNetFixedValue || 0;
    }
  } else if (!isPurchase) {
    effectiveRateForPurchaseDisplay = item.rate || 0;
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>, currentFieldIndex: number) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const currentRowFields = itemRefs.current[rowIndex];
      if (currentFieldIndex < currentRowFields.length - 1) {
        const nextField = currentRowFields[currentFieldIndex + 1];
        if (nextField && typeof (nextField as any).focus === 'function') {
            (nextField as HTMLElement).focus();
          }
      } else {
        if (onEnterInLastField) {
          onEnterInLastField();
        }
      }
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {/* Material */}
        <div className="md:col-span-1 space-y-1.5">
          <Label htmlFor={`material-select-${item.id}`}>Material</Label>
          <Select value={item.valuableId || ''} onValueChange={handleValuableSelect}>
            <SelectTrigger id={`material-select-${item.id}`} ref={materialSelectRef} className="h-11 text-base w-full" onKeyDown={(e) => handleKeyDown(e, 0)}>
              <SelectValue placeholder="Material" />
            </SelectTrigger>
            <SelectContent>
              {displayableMaterials.map(v => (
                <SelectItem key={v.id} value={v.id} className="text-base py-2">
                  <div className="flex items-center">
                    <ValuableIcon valuableType={v.icon} color={v.iconColor} className="w-5 h-5 mr-2.5"/>
                    {v.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product Name & HSN */}
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor={`product-name-${item.id}`}>Product Name</Label>
           <Input
              id={`product-name-${item.id}`}
              ref={productNameInputRef}
              placeholder="e.g., Ring, Chain"
              value={item.name || ''}
              onChange={(e) => handleProductNameChange(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 1)}
              list={datalistId}
              className="h-11 text-base"
            />
          <datalist id={datalistId}>
            {productSuggestions.map(p => <option key={p.name} value={p.name} />)}
          </datalist>
          {showHsnForSales && (
            <div className="relative">
                <Input
                    ref={hsnCodeInputRef}
                    placeholder="HSN Code"
                    value={item.hsnCode || ''}
                    onChange={(e) => handleFieldChange('hsnCode', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 2)}
                    className="text-sm h-9 pl-12"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">HSN</span>
            </div>
          )}
        </div>
        
        {/* Quantity */}
        <div className="md:col-span-1 space-y-1.5">
           <Label htmlFor={`qty-${item.id}`}>{`Qty / ${selectedValuableDetails?.unit || 'Wt'}`}</Label>
           <Input
              id={`qty-${item.id}`}
              ref={qtyInputRef}
              type="number"
              value={item.weightOrQuantity === undefined ? '' : item.weightOrQuantity}
              onChange={(e) => handleFieldChange('weightOrQuantity', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, showHsnForSales ? 3 : 2)}
              min="0"
              step={selectedValuableDetails?.unit === 'carat' || selectedValuableDetails?.unit === 'ct' ? '0.001' : '0.01'}
              className="h-11 text-base"
            />
        </div>

        {/* Rate (Sales) or Net Calc (Purchase) */}
        <div className="md:col-span-1 space-y-1.5">
            {!isPurchase ? (
                 <div className="space-y-1.5">
                    <Label htmlFor={`rate-${item.id}`}>Rate ({currencySymbol})</Label>
                    <Input
                        id={`rate-${item.id}`}
                        ref={rateInputRef}
                        type="number"
                        value={item.rate === undefined ? '' : item.rate}
                        onChange={(e) => handleFieldChange('rate', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, showHsnForSales ? 4 : 3)}
                        min="0"
                        step="0.01"
                        className="h-11 text-base"
                    />
                     <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground font-semibold w-8">MC</Label>
                        <Select value={item.makingChargeType || defaultMakingCharge.type} onValueChange={(val: 'percentage' | 'fixed') => onItemChange({ ...item, makingChargeType: val })}>
                            <SelectTrigger ref={mcTypeSelectRef} className="text-sm h-9 flex-grow" onKeyDown={(e) => handleKeyDown(e, showHsnForSales ? 5 : 4)}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage" className="text-base py-2">%</SelectItem>
                                <SelectItem value="fixed" className="text-base py-2">{currencySymbol}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input ref={mcValueInputRef} type="number" placeholder="Value" value={item.makingCharge === undefined ? '' : item.makingCharge} onChange={(e) => handleFieldChange('makingCharge', e.target.value)} onKeyDown={(e) => handleKeyDown(e, showHsnForSales ? 6 : 5)} className="h-9 text-sm flex-grow" />
                    </div>
                </div>
            ) : (
                <div className="space-y-1.5">
                    <Label>Net Calculation</Label>
                    <Select
                            value={item.purchaseNetType || 'net_percentage'}
                            onValueChange={(val: 'net_percentage' | 'fixed_net_price') => handleFieldChange('purchaseNetType', val)}
                        >
                        <SelectTrigger ref={purchaseNetTypeSelectRef} className="h-11 text-base w-full" onKeyDown={(e) => handleKeyDown(e, 3)}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="net_percentage" className="text-base py-2">Net % Off</SelectItem>
                            <SelectItem value="fixed_net_price" className="text-base py-2">Fixed Rate</SelectItem>
                        </SelectContent>
                    </Select>
                     {item.purchaseNetType === 'net_percentage' ? (
                        <Input ref={purchaseNetPercentInputRef} type="number" placeholder="%" value={item.purchaseNetPercentValue === undefined ? '' : item.purchaseNetPercentValue} onChange={(e) => handleFieldChange('purchaseNetPercentValue', e.target.value)} className="h-11 text-base" onKeyDown={(e) => handleKeyDown(e, 4)} />
                     ) : (
                        <Input ref={purchaseNetFixedInputRef} type="number" placeholder={`Rate in ${currencySymbol}`} value={item.purchaseNetFixedValue === undefined ? '' : item.purchaseNetFixedValue} onChange={(e) => handleFieldChange('purchaseNetFixedValue', e.target.value)} className="h-11 text-base" onKeyDown={(e) => handleKeyDown(e, 4)} />
                     )}
                     {item.valuableId && (
                         <p className="text-xs text-muted-foreground text-center pt-1">Mkt: {currencySymbol}{marketPriceForPurchase.toFixed(2)} / Eff: {currencySymbol}{effectiveRateForPurchaseDisplay.toFixed(2)}</p>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="flex justify-end mt-4">
        <div className="space-y-1 bg-muted/30 p-3 rounded-md min-w-[250px] text-right">
            <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-muted-foreground">Subtotal</span>
                <span className="font-bold text-lg text-foreground">{currencySymbol}{item.amount?.toFixed(2) || '0.00'}</span>
            </div>
             {!isPurchase && (
                <>
                <div className="flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="font-medium">{currencySymbol}{(item.itemSgstAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="font-medium">{currencySymbol}{(item.itemCgstAmount || 0).toFixed(2)}</span>
                </div>
                </>
            )}
             <Separator className="my-2 bg-muted-foreground/20"/>
            <div className="flex justify-end pt-1">
                 <Button variant="ghost" size="icon" onClick={onRemoveItem} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 w-8">
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Remove Item</span>
                  </Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BillItemRow;
