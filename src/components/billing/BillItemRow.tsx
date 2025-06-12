
"use client";
import React from 'react';
import type { BillItem, Valuable, MakingChargeSetting } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react'; 
import ValuableIcon from '../ValuableIcon';

interface BillItemRowProps {
  item: Partial<BillItem>;
  onItemChange: (updatedFields: Partial<BillItem>) => void;
  onItemNameBlur: (name: string) => void;
  onRemoveItem: () => void;
  availableValuables: Valuable[];
  customItemNames: string[];
  isPurchase: boolean;
  defaultMakingCharge: MakingChargeSetting;
  defaultPurchaseNetPercentage: number;
  defaultPurchaseNetFixedValue: number;
  getValuablePrice: (valuableId: string) => number;
}

const BillItemRow: React.FC<BillItemRowProps> = ({
  item,
  onItemChange,
  onItemNameBlur,
  onRemoveItem,
  availableValuables,
  customItemNames,
  isPurchase,
  defaultMakingCharge,
  defaultPurchaseNetPercentage,
  defaultPurchaseNetFixedValue,
  getValuablePrice,
}) => {

  const handleValuableSelect = (valuableId: string) => {
    const selectedValuable = availableValuables.find(v => v.id === valuableId);
    if (selectedValuable) {
      const updates: Partial<BillItem> = {
        valuableId,
        unit: selectedValuable.unit,
        // For sales, rate is market price. For purchases, this 'rate' field is the base for % calc.
        rate: selectedValuable.price, 
      };

      // Preserve custom item name if it exists and isn't just a default valuable name
      const currentItemValuableDefaultName = item.valuableId ? availableValuables.find(v => v.id === item.valuableId)?.name : undefined;
      if (!item.name || item.name.trim() === '' || item.name === currentItemValuableDefaultName) {
        updates.name = selectedValuable.name; // Set to new valuable name only if current name is empty/default
      } else {
        updates.name = item.name; // Keep existing custom name
      }
      
      if (isPurchase) {
        updates.purchaseNetType = item.purchaseNetType || 'net_percentage'; // Default to net_percentage
        if (updates.purchaseNetType === 'net_percentage' && item.purchaseNetPercentValue === undefined) {
          updates.purchaseNetPercentValue = defaultPurchaseNetPercentage;
        }
        if (updates.purchaseNetType === 'fixed_net_price' && item.purchaseNetFixedValue === undefined) {
          updates.purchaseNetFixedValue = defaultPurchaseNetFixedValue;
        }
      } else { 
        updates.makingChargeType = item.makingChargeType || defaultMakingCharge.type;
        updates.makingCharge = item.makingCharge === undefined ? defaultMakingCharge.value : item.makingCharge;
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
        // 'rate' for purchase items will be the market rate of selected valuable, used for '%' calculation
        // It's set during valuable selection, and doesn't need to change when purchaseNetType changes
        // unless we want to re-fetch market price. For simplicity, let's assume rate is stable after valuable selection.
    }
    onItemChange(updates);
  };
  
  const selectedValuableDetails = item.valuableId ? availableValuables.find(v => v.id === item.valuableId) : null;
  const datalistId = `item-names-datalist-${item.id || 'new'}`;

  const marketPriceForPurchase = isPurchase && item.valuableId ? getValuablePrice(item.valuableId) : 0;
  let effectiveRateForPurchaseDisplay = 0; // Initialize to 0 or a sensible default

  if (isPurchase && item.valuableId) { // Ensure valuableId is present for calculation
    if (item.purchaseNetType === 'net_percentage') {
        effectiveRateForPurchaseDisplay = marketPriceForPurchase * (1 - ((item.purchaseNetPercentValue || 0) / 100));
    } else if (item.purchaseNetType === 'fixed_net_price') {
        effectiveRateForPurchaseDisplay = item.purchaseNetFixedValue || 0;
    }
    // No 'market_rate' case for purchaseNetType anymore
  } else if (!isPurchase) {
    effectiveRateForPurchaseDisplay = item.rate || 0; // For sales items
  }


  const gridColsClass = isPurchase 
    ? "grid-cols-12" 
    : "grid-cols-12"; 

  return (
    <div className={`grid ${gridColsClass} gap-2 items-start py-2 border-b last:border-b-0`}>
      <datalist id={datalistId}>
        {customItemNames.map(name => <option key={name} value={name} />)}
      </datalist>

      <div className="col-span-2">
        <Select value={item.valuableId || ''} onValueChange={handleValuableSelect}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            {availableValuables.map(v => (
              <SelectItem key={v.id} value={v.id}>
                <div className="flex items-center">
                  <ValuableIcon valuableType={v.icon} color={v.iconColor} className="w-4 h-4 mr-2"/>
                  {v.name} {/* This is Material Type like "18K Gold" */}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-3">
        <Input
          placeholder="Item Name (e.g. Ring)"
          value={item.name || ''} // This is Product Name like "Ring", "Bangle"
          onChange={(e) => handleFieldChange('name', e.target.value)}
          onBlur={(e) => onItemNameBlur(e.target.value)}
          list={datalistId}
          className="h-9 text-sm"
        />
      </div>

      <div className="col-span-1">
        <Input 
          type="number" 
          placeholder={`Qty/${selectedValuableDetails?.unit || 'unit'}`}
          value={item.weightOrQuantity === undefined ? '' : item.weightOrQuantity}
          onChange={(e) => handleFieldChange('weightOrQuantity', e.target.value)}
          min="0"
          step={selectedValuableDetails?.unit === 'carat' || selectedValuableDetails?.unit === 'ct' ? '0.001' : '0.01'}
          className="h-9 text-sm text-center"
        />
      </div>

      {isPurchase && (
        <>
          <div className="col-span-2 flex flex-col space-y-1"> 
            <Select 
              value={item.purchaseNetType || 'net_percentage'} // Default to 'net_percentage'
              onValueChange={(val: 'net_percentage' | 'fixed_net_price') => handleFieldChange('purchaseNetType', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="net_percentage">Net % Off Market</SelectItem>
                <SelectItem value="fixed_net_price">Fixed Net Rate</SelectItem>
              </SelectContent>
            </Select>
            {item.purchaseNetType === 'net_percentage' && selectedValuableDetails && (
                <p className="text-xs text-muted-foreground text-center">Mkt: {marketPriceForPurchase.toFixed(2)}</p>
            )}
          </div>
          
          <div className="col-span-1 flex flex-col space-y-1"> 
            {item.purchaseNetType === 'net_percentage' && (
              <Input type="number" placeholder="%" value={item.purchaseNetPercentValue === undefined ? '' : item.purchaseNetPercentValue} onChange={(e) => handleFieldChange('purchaseNetPercentValue', e.target.value)} className="h-9 text-sm text-center" min="0" step="0.01"/>
            )}
            {item.purchaseNetType === 'fixed_net_price' && (
              <Input type="number" placeholder="Net Rate" value={item.purchaseNetFixedValue === undefined ? '' : item.purchaseNetFixedValue} onChange={(e) => handleFieldChange('purchaseNetFixedValue', e.target.value)} className="h-9 text-sm text-center" min="0" step="0.01"/>
            )}
            {(item.purchaseNetType === 'net_percentage' || item.purchaseNetType === 'fixed_net_price') && item.valuableId && ( // Show effective rate if type is selected and valuable is present
                 <p className="text-xs text-muted-foreground text-center">Eff: {effectiveRateForPurchaseDisplay.toFixed(2)}</p>
            )}
          </div>
        </>
      )}

      {!isPurchase && ( // Sales Bill specific fields
        <>
          <div className="col-span-1"> 
            <Input 
              type="number" 
              placeholder="Rate"
              value={item.rate === undefined ? '' : item.rate}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
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
              <SelectTrigger className="text-xs px-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1"> 
            <Input 
              type="number" 
              placeholder="Making"
              value={item.makingCharge === undefined ? '' : item.makingCharge}
              onChange={(e) => handleFieldChange('makingCharge', e.target.value)}
              min="0"
              step="0.01"
              className="h-9 text-sm text-center"
            />
          </div>
        </>
      )}
      
      <div className={`col-span-1 text-right self-center`}>
        <span className="font-medium text-sm">{item.amount?.toFixed(2) || '0.00'}</span>
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
