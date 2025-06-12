
"use client";
import React from 'react';
import type { BillItem, Valuable, MakingChargeSetting } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit2 } from 'lucide-react'; // Using Edit2 for a pencil-like icon
import ValuableIcon from '../ValuableIcon';
import { Label } from '@/components/ui/label';

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
  getValuablePrice,
}) => {

  const handleValuableSelect = (valuableId: string) => {
    const selectedValuable = availableValuables.find(v => v.id === valuableId);
    if (selectedValuable) {
      const updates: Partial<BillItem> = {
        valuableId,
        name: item.name && item.valuableId === valuableId ? item.name : selectedValuable.name,
        unit: selectedValuable.unit,
        rate: selectedValuable.price, // For sales, this is the base rate. For purchases, it's the market rate.
      };
      if (isPurchase) {
        updates.purchaseNetType = item.purchaseNetType || 'market_rate'; // Default to market_rate
        if (updates.purchaseNetType === 'net_percentage' && item.purchaseNetPercentValue === undefined) {
          updates.purchaseNetPercentValue = defaultPurchaseNetPercentage;
        }
      } else { // Sales
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
      if (isNaN(numericValue)) numericValue = field === 'weightOrQuantity' ? 0 : (item[field] || 0) ; // Keep existing or 0 if invalid
    }
    
    const updates: Partial<BillItem> = { [field]: numericValue };

    // If purchaseNetType changes, reset related values or set defaults
    if (field === 'purchaseNetType' && isPurchase) {
        updates.purchaseNetPercentValue = value === 'net_percentage' ? (item.purchaseNetPercentValue ?? defaultPurchaseNetPercentage) : undefined;
        updates.purchaseNetFixedValue = value === 'fixed_net_price' ? (item.purchaseNetFixedValue ?? 0) : undefined;
        updates.rate = value === 'market_rate' ? (item.rate ?? getValuablePrice(item.valuableId || '')) : 0; // Reset rate if not market_rate unless already set
    }
    onItemChange(updates);
  };
  
  const selectedValuableDetails = item.valuableId ? availableValuables.find(v => v.id === item.valuableId) : null;
  const datalistId = `item-names-datalist-${item.id || 'new'}`;

  const marketPriceForPurchase = isPurchase && item.valuableId ? getValuablePrice(item.valuableId) : 0;
  let effectiveRateForPurchaseDisplay = item.rate || 0;
  if (isPurchase) {
    if (item.purchaseNetType === 'net_percentage') {
        effectiveRateForPurchaseDisplay = marketPriceForPurchase * (1 - ((item.purchaseNetPercentValue || 0) / 100));
    } else if (item.purchaseNetType === 'fixed_net_price') {
        effectiveRateForPurchaseDisplay = item.purchaseNetFixedValue || 0;
    }
  }


  const gridColsClass = isPurchase 
    ? "grid-cols-12" // Type(2), Name(3), Qty(1), NetType(2), Value(1), Amount(1), Action(1) (+ MarketPrice/EffectiveRate display)
    : "grid-cols-12"; // Type(2), Name(3), Qty(1), Rate(1), MCType(1), MC(1), Amount(1), Action(1)

  return (
    <div className={`grid ${gridColsClass} gap-2 items-start py-2 border-b last:border-b-0`}>
      <datalist id={datalistId}>
        {customItemNames.map(name => <option key={name} value={name} />)}
      </datalist>

      {/* Column 1: Valuable Type Select */}
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
                  {v.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Column 2: Item Name/Description */}
      <div className="col-span-3">
        <Input
          placeholder="Item Name / Description"
          value={item.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          onBlur={(e) => onItemNameBlur(e.target.value)}
          list={datalistId}
          className="h-9 text-sm"
        />
      </div>

      {/* Column 3: Quantity/Weight */}
      <div className="col-span-1">
        <Input 
          type="number" 
          placeholder={`Qty/${selectedValuableDetails?.unit || 'unit'}`}
          value={item.weightOrQuantity === undefined ? '' : item.weightOrQuantity}
          onChange={(e) => handleFieldChange('weightOrQuantity', e.target.value)}
          min="0"
          step="0.001"
          className="h-9 text-sm text-center"
        />
      </div>

      {/* Purchase Specific Columns */}
      {isPurchase && (
        <>
          <div className="col-span-2 flex flex-col space-y-1"> {/* Net Type Select */}
            <Select 
              value={item.purchaseNetType || 'market_rate'} 
              onValueChange={(val: 'market_rate' | 'net_percentage' | 'fixed_net_price') => handleFieldChange('purchaseNetType', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market_rate">Market Rate</SelectItem>
                <SelectItem value="net_percentage">Net % Off Market</SelectItem>
                <SelectItem value="fixed_net_price">Fixed Net Rate</SelectItem>
              </SelectContent>
            </Select>
            {item.purchaseNetType === 'net_percentage' && selectedValuableDetails && (
                <p className="text-xs text-muted-foreground text-center">Mkt: {marketPriceForPurchase.toFixed(2)}</p>
            )}
          </div>
          
          <div className="col-span-1 flex flex-col space-y-1"> {/* Value Input (Rate, %, or Fixed) */}
            {item.purchaseNetType === 'market_rate' && (
              <Input type="number" placeholder="Rate" value={item.rate === undefined ? '' : item.rate} onChange={(e) => handleFieldChange('rate', e.target.value)} className="h-9 text-sm text-center" />
            )}
            {item.purchaseNetType === 'net_percentage' && (
              <Input type="number" placeholder="%" value={item.purchaseNetPercentValue === undefined ? '' : item.purchaseNetPercentValue} onChange={(e) => handleFieldChange('purchaseNetPercentValue', e.target.value)} className="h-9 text-sm text-center" />
            )}
            {item.purchaseNetType === 'fixed_net_price' && (
              <Input type="number" placeholder="Net Rate" value={item.purchaseNetFixedValue === undefined ? '' : item.purchaseNetFixedValue} onChange={(e) => handleFieldChange('purchaseNetFixedValue', e.target.value)} className="h-9 text-sm text-center" />
            )}
            {item.purchaseNetType !== 'market_rate' && (
                 <p className="text-xs text-muted-foreground text-center">Eff: {effectiveRateForPurchaseDisplay.toFixed(2)}</p>
            )}
          </div>
        </>
      )}

      {/* Sales Specific Columns */}
      {!isPurchase && (
        <>
          <div className="col-span-1"> {/* Rate for Sales */}
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
          <div className="col-span-1"> {/* Making Charge Type */}
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
          <div className="col-span-1"> {/* Making Charge Value */}
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
      
      {/* Amount Column (adjusted for purchase to take one less span if MC cols are not there) */}
      <div className={`col-span-1 text-right self-center`}>
        <span className="font-medium text-sm">{item.amount?.toFixed(2) || '0.00'}</span>
      </div>

      {/* Action Column */}
      <div className="col-span-1 text-center self-center">
        <Button variant="ghost" size="icon" onClick={onRemoveItem} className="text-destructive hover:text-destructive/80 h-9 w-9">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default BillItemRow;
