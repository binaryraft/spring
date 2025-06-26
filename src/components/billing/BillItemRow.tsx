
"use client";
import React, { useRef, useMemo } from 'react';
import type { BillItem, Valuable, MakingChargeSetting, ProductSuggestion } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import ValuableIcon from '../ValuableIcon';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

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
  focusNextRowFirstElement?: () => void;
  rowIndex: number;
  itemRefs: React.MutableRefObject<Array<Array<HTMLInputElement | HTMLButtonElement | null>>>;
  currencySymbol: string;
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

  React.useEffect(() => {
    const fields = [
      materialSelectRef.current,
      productNameInputRef.current,
    ];
    if (!isPurchase) {
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
    itemRefs.current[rowIndex] = fields.filter(Boolean) as Array<HTMLInputElement | HTMLButtonElement>;
  }, [rowIndex, itemRefs, isPurchase, item.purchaseNetType]);

  const displayableMaterials = useMemo(() => {
    let filtered = availableValuables.filter(v => v.selectedInHeader);
    const currentItemValuable = item.valuableId ? availableValuables.find(v => v.id === item.valuableId) : null;

    if (currentItemValuable && !currentItemValuable.selectedInHeader) {
      if (!filtered.find(v => v.id === currentItemValuable.id)) {
        filtered.push(currentItemValuable);
      }
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
    if (suggestion) {
      onItemChange({ name: newName, hsnCode: suggestion.hsnCode });
    } else {
      onItemChange({ name: newName });
    }
  };

  const handleFieldChange = (field: keyof BillItem, value: any) => {
    let numericValue = value;
    const numericFields: (keyof BillItem)[] = ['weightOrQuantity', 'rate', 'makingCharge', 'purchaseNetPercentValue', 'purchaseNetFixedValue'];

    if (numericFields.includes(field)) {
      numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        numericValue = field === 'weightOrQuantity' ? 0 : (item[field] as number || 0);
      }
    }

    const updates: Partial<BillItem> = { [field]: numericValue };

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

  const gridColsClass = isPurchase
    ? "md:grid-cols-[1.5fr_2fr_1fr_1.5fr_1fr_1fr_0.5fr]"
    : "md:grid-cols-[1.5fr_2fr_1fr_1fr_1fr_1fr_1fr_1fr_0.5fr]";

  const showHsnForSales = !isPurchase;

  return (
    <div className={cn('group grid items-start gap-x-4 gap-y-3 p-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors', gridColsClass)}>
      <datalist id={datalistId}>
        {productSuggestions.map(p => <option key={p.name} value={p.name} />)}
      </datalist>

      {/* Column 1: Material */}
      <div className="w-full">
        <Label className="text-xs md:hidden text-muted-foreground">Material</Label>
        <Select
          value={item.valuableId || ''}
          onValueChange={handleValuableSelect}
        >
          <SelectTrigger
            ref={materialSelectRef}
            className="h-11 text-base w-full mt-1 md:mt-0"
            onKeyDown={(e) => handleKeyDown(e, 0)}
          >
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
            {displayableMaterials.length === 0 && !item.valuableId && (
              <div className="p-2 text-sm text-muted-foreground">No active materials selected in header.</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Column 2: Product Name */}
      <div>
        <Label className="text-xs md:hidden text-muted-foreground">Product Name</Label>
        <Input
          ref={productNameInputRef}
          placeholder="Product Name"
          value={item.name || ''}
          onChange={(e) => handleProductNameChange(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          list={datalistId}
          className="h-11 text-base mt-1 md:mt-0"
        />
      </div>

      {/* Column 3: HSN Code (Sales Only) */}
      {showHsnForSales && (
        <div>
          <Label className="text-xs md:hidden text-muted-foreground">HSN</Label>
          <Input
            ref={hsnCodeInputRef}
            placeholder="HSN"
            value={item.hsnCode || ''}
            onChange={(e) => handleFieldChange('hsnCode', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 2)}
            className="h-11 text-base text-center mt-1 md:mt-0"
          />
        </div>
      )}

      {/* Column 4 (Sales) / 3 (Purchase): Qty/Wt */}
      <div>
        <Label className="text-xs md:hidden text-muted-foreground">{`Qty/${selectedValuableDetails?.unit || 'unit'}`}</Label>
        <Input
          ref={qtyInputRef}
          type="number"
          placeholder={`Qty/${selectedValuableDetails?.unit || 'unit'}`}
          value={item.weightOrQuantity === undefined ? '' : item.weightOrQuantity}
          onChange={(e) => handleFieldChange('weightOrQuantity', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, isPurchase ? 2 : 3)}
          min="0"
          step={selectedValuableDetails?.unit === 'carat' || selectedValuableDetails?.unit === 'ct' ? '0.001' : '0.01'}
          className="h-11 text-base text-center mt-1 md:mt-0"
        />
      </div>

      {/* Columns for Purchase vs Sales */}
      {isPurchase ? (
        <>
          {/* Purchase Column 4: Net Type */}
          <div className="flex flex-col space-y-1">
             <Label className="text-xs md:hidden text-muted-foreground">Net Type</Label>
            <Select
              value={item.purchaseNetType || 'net_percentage'}
              onValueChange={(val: 'net_percentage' | 'fixed_net_price') => handleFieldChange('purchaseNetType', val)}
            >
              <SelectTrigger
                ref={purchaseNetTypeSelectRef}
                className="h-11 text-base mt-1 md:mt-0"
                onKeyDown={(e) => handleKeyDown(e, 3)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="net_percentage" className="text-base py-2">Net % Off Market</SelectItem>
                <SelectItem value="fixed_net_price" className="text-base py-2">Fixed Net Rate ({currencySymbol})</SelectItem>
              </SelectContent>
            </Select>
            {item.purchaseNetType === 'net_percentage' && selectedValuableDetails && (
                <p className="text-xs text-muted-foreground text-center">Mkt: {currencySymbol}{marketPriceForPurchase.toFixed(2)}</p>
            )}
          </div>

          {/* Purchase Column 5: Value Input (Percentage or Fixed) */}
          <div className="flex flex-col space-y-1">
             <Label className="text-xs md:hidden text-muted-foreground">Value</Label>
            {item.purchaseNetType === 'net_percentage' && (
              <Input
                ref={purchaseNetPercentInputRef}
                type="number"
                placeholder="%"
                value={item.purchaseNetPercentValue === undefined ? '' : item.purchaseNetPercentValue}
                onChange={(e) => handleFieldChange('purchaseNetPercentValue', e.target.value)}
                className="h-11 text-base text-center mt-1 md:mt-0"
                min="0"
                step="0.01"
                onKeyDown={(e) => handleKeyDown(e, 4)}
              />
            )}
            {item.purchaseNetType === 'fixed_net_price' && (
              <Input
                ref={purchaseNetFixedInputRef}
                type="number"
                placeholder="Net Rate"
                value={item.purchaseNetFixedValue === undefined ? '' : item.purchaseNetFixedValue}
                onChange={(e) => handleFieldChange('purchaseNetFixedValue', e.target.value)}
                className="h-11 text-base text-center mt-1 md:mt-0"
                min="0"
                step="0.01"
                onKeyDown={(e) => handleKeyDown(e, 4)}
              />
            )}
            {(item.purchaseNetType === 'net_percentage' || item.purchaseNetType === 'fixed_net_price') && item.valuableId && (
                 <p className="text-xs text-muted-foreground text-center">Eff: {currencySymbol}{effectiveRateForPurchaseDisplay.toFixed(2)}</p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Sales Column 5: Rate */}
          <div>
            <Label className="text-xs md:hidden text-muted-foreground">Rate</Label>
            <Input
              ref={rateInputRef}
              type="number"
              placeholder="Rate"
              value={item.rate === undefined ? '' : item.rate}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 4)}
              min="0"
              step="0.01"
              className="h-11 text-base text-center mt-1 md:mt-0"
            />
          </div>
          {/* Sales Column 6: MC Type */}
          <div>
            <Label className="text-xs md:hidden text-muted-foreground">MC Type</Label>
            <Select
              value={item.makingChargeType || defaultMakingCharge.type}
              onValueChange={(val: 'percentage' | 'fixed') => onItemChange({ ...item, makingChargeType: val })}
            >
              <SelectTrigger
                ref={mcTypeSelectRef}
                className="text-base h-11 mt-1 md:mt-0"
                onKeyDown={(e) => handleKeyDown(e, 5)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage" className="text-base py-2">%</SelectItem>
                <SelectItem value="fixed" className="text-base py-2">Flat ({currencySymbol})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Sales Column 7: Making Value */}
          <div>
            <Label className="text-xs md:hidden text-muted-foreground">Making</Label>
            <Input
              ref={mcValueInputRef}
              type="number"
              placeholder="Making"
              value={item.makingCharge === undefined ? '' : item.makingCharge}
              onChange={(e) => handleFieldChange('makingCharge', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 6)}
              min="0"
              step="0.01"
              className="h-11 text-base text-center mt-1 md:mt-0"
            />
          </div>
        </>
      )}

      {/* Last common columns */}
      {/* Taxable Amount */}
      <div className="text-right self-center">
        <Label className="text-xs md:hidden text-muted-foreground">Taxable Amount</Label>
        <span className="font-semibold text-lg block mt-1 md:mt-0 text-foreground">{currencySymbol}{item.amount?.toFixed(2) || '0.00'}</span>
      </div>

      {/* Action Button */}
      <div className="text-center self-center">
        <Button variant="ghost" size="icon" onClick={onRemoveItem} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-10 w-10 opacity-50 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-5 h-5" />
           <span className="sr-only">Remove Item</span>
        </Button>
      </div>
    </div>
  );
};

export default BillItemRow;

    