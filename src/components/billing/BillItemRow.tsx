
"use client";
import React, { useRef } from 'react'; 
import type { BillItem, Valuable, MakingChargeSetting } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import ValuableIcon from '../ValuableIcon';

interface BillItemRowProps {
  item: Partial<BillItem>;
  onItemChange: (updatedFields: Partial<BillItem>) => void;
  onProductNameBlur: (name: string) => void;
  onRemoveItem: () => void;
  availableValuables: Valuable[];
  productNames: string[];
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
  onProductNameBlur,
  onRemoveItem,
  availableValuables,
  productNames,
  isPurchase,
  defaultMakingCharge,
  defaultPurchaseNetPercentage,
  defaultPurchaseNetFixedValue,
  getValuablePrice,
  onEnterInLastField,
  focusNextRowFirstElement,
  rowIndex,
  itemRefs,
  currencySymbol,
}) => {

  const materialSelectRef = useRef<HTMLButtonElement>(null); 
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const rateInputRef = useRef<HTMLInputElement>(null); 
  const mcTypeSelectRef = useRef<HTMLButtonElement>(null); 
  const mcValueInputRef = useRef<HTMLInputElement>(null); 
  const purchaseNetTypeSelectRef = useRef<HTMLButtonElement>(null); 
  const purchaseNetPercentInputRef = useRef<HTMLInputElement>(null); 
  const purchaseNetFixedInputRef = useRef<HTMLInputElement>(null); 

  React.useEffect(() => {
    itemRefs.current[rowIndex] = [
      materialSelectRef.current,
      productNameInputRef.current,
      qtyInputRef.current,
      isPurchase ? purchaseNetTypeSelectRef.current : rateInputRef.current,
      isPurchase
        ? item.purchaseNetType === 'net_percentage' ? purchaseNetPercentInputRef.current : purchaseNetFixedInputRef.current
        : mcTypeSelectRef.current,
      isPurchase ? null : mcValueInputRef.current, 
    ].filter(Boolean) as Array<HTMLInputElement | HTMLButtonElement>;
  }, [rowIndex, itemRefs, isPurchase, item.purchaseNetType]);


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
    ? "grid-cols-12"
    : "grid-cols-12";

  return (
    <div className={`grid ${gridColsClass} gap-2 items-start p-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors`}>
      <datalist id={datalistId}>
        {productNames.map(name => <option key={name} value={name} />)}
      </datalist>

      <div className="col-span-2">
        <Select
          value={item.valuableId || ''}
          onValueChange={handleValuableSelect}
        >
          <SelectTrigger
            ref={materialSelectRef}
            className="h-9 text-sm"
            onKeyDown={(e) => handleKeyDown(e, 0)}
          >
            <SelectValue placeholder="Select Material" />
          </SelectTrigger>
          <SelectContent>
            {availableValuables.map(v => (
              <SelectItem key={v.id} value={v.id}>
                <div className="flex items-center">
                  <ValuableIcon valuableType={v.icon} color={v.iconColor} className="w-4 h-4 mr-2"/>
                  {v.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-3">
        <Input
          ref={productNameInputRef}
          placeholder="Product Name (e.g. Ring)"
          value={item.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          onBlur={(e) => onProductNameBlur(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          list={datalistId}
          className="h-9 text-sm"
        />
      </div>

      <div className="col-span-1">
        <Input
          ref={qtyInputRef}
          type="number"
          placeholder={`Qty/${selectedValuableDetails?.unit || 'unit'}`}
          value={item.weightOrQuantity === undefined ? '' : item.weightOrQuantity}
          onChange={(e) => handleFieldChange('weightOrQuantity', e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, 2)}
          min="0"
          step={selectedValuableDetails?.unit === 'carat' || selectedValuableDetails?.unit === 'ct' ? '0.001' : '0.01'}
          className="h-9 text-sm text-center"
        />
      </div>

      {isPurchase && (
        <>
          <div className="col-span-2 flex flex-col space-y-1">
            <Select
              value={item.purchaseNetType || 'net_percentage'}
              onValueChange={(val: 'net_percentage' | 'fixed_net_price') => handleFieldChange('purchaseNetType', val)}
            >
              <SelectTrigger
                ref={purchaseNetTypeSelectRef}
                className="h-9 text-xs"
                onKeyDown={(e) => handleKeyDown(e, 3)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="net_percentage">Net % Off Market</SelectItem>
                <SelectItem value="fixed_net_price">Fixed Net Rate ({currencySymbol})</SelectItem>
              </SelectContent>
            </Select>
            {item.purchaseNetType === 'net_percentage' && selectedValuableDetails && (
                <p className="text-xs text-muted-foreground text-center">Mkt: {currencySymbol}{marketPriceForPurchase.toFixed(2)}</p>
            )}
          </div>

          <div className="col-span-1 flex flex-col space-y-1">
            {item.purchaseNetType === 'net_percentage' && (
              <Input
                ref={purchaseNetPercentInputRef}
                type="number"
                placeholder="%"
                value={item.purchaseNetPercentValue === undefined ? '' : item.purchaseNetPercentValue}
                onChange={(e) => handleFieldChange('purchaseNetPercentValue', e.target.value)}
                className="h-9 text-sm text-center"
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
                className="h-9 text-sm text-center"
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
      )}

      {!isPurchase && (
        <>
          <div className="col-span-1">
            <Input
              ref={rateInputRef}
              type="number"
              placeholder="Rate"
              value={item.rate === undefined ? '' : item.rate}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 3)}
              min="0"
              step="0.01"
              className="h-9 text-sm text-center"
            />
          </div>
          <div className="col-span-1">
            <Select
              value={item.makingChargeType || defaultMakingCharge.type}
              onValueChange={(val: 'percentage' | 'fixed') => onItemChange({ ...item, makingChargeType: val })}
            >
              <SelectTrigger
                ref={mcTypeSelectRef}
                className="text-xs px-1 h-9"
                onKeyDown={(e) => handleKeyDown(e, 4)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">Flat ({currencySymbol})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1">
            <Input
              ref={mcValueInputRef}
              type="number"
              placeholder="Making"
              value={item.makingCharge === undefined ? '' : item.makingCharge}
              onChange={(e) => handleFieldChange('makingCharge', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 5)}
              min="0"
              step="0.01"
              className="h-9 text-sm text-center"
            />
          </div>
        </>
      )}

      <div className={`col-span-1 text-right self-center`}>
        <span className="font-medium text-sm">{currencySymbol}{item.amount?.toFixed(2) || '0.00'}</span>
      </div>

      <div className="col-span-1 text-center self-center">
        <Button variant="ghost" size="icon" onClick={onRemoveItem} className="text-destructive hover:text-destructive/80 h-9 w-9">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default BillItemRow;
