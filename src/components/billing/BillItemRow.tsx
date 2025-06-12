
"use client";
import React from 'react';
import type { BillItem, Valuable, MakingChargeSetting } from '@/types';
import { useAppContext } from '@/contexts/AppContext'; // Not directly used, but good for context
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
  defaultPurchaseNetFixedValue: number; // New prop
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
  defaultPurchaseNetFixedValue, // Destructure new prop
  getValuablePrice,
}) => {

  const handleValuableSelect = (valuableId: string) => {
    const selectedValuable = availableValuables.find(v => v.id === valuableId);
    if (selectedValuable) {
      const updates: Partial<BillItem> = {
        valuableId,
        name: item.name && item.valuableId === valuableId && item.name !== availableValuables.find(v => v.id === item.valuableId)?.name ? item.name : selectedValuable.name,
        unit: selectedValuable.unit,
        rate: selectedValuable.price, 
      };
      if (isPurchase) {
        updates.purchaseNetType = item.purchaseNetType || 'market_rate'; 
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
         // For weight/qty, default to 0 if invalid, otherwise keep existing or 0 for other numeric fields.
        numericValue = field === 'weightOrQuantity' ? 0 : (item[field] as number || 0);
      }
    }
    
    const updates: Partial<BillItem> = { [field]: numericValue };

    if (field === 'purchaseNetType' && isPurchase) {
        updates.purchaseNetPercentValue = value === 'net_percentage' ? (item.purchaseNetPercentValue ?? defaultPurchaseNetPercentage) : undefined;
        updates.purchaseNetFixedValue = value === 'fixed_net_price' ? (item.purchaseNetFixedValue ?? defaultPurchaseNetFixedValue) : undefined; // Use default
        updates.rate = value === 'market_rate' ? (item.rate ?? getValuablePrice(item.valuableId || '')) : (item.rate || 0); // Keep rate if switching away from market_rate unless it was not set
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
                  {v.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
          
          <div className="col-span-1 flex flex-col space-y-1"> 
            {item.purchaseNetType === 'market_rate' && (
              <Input type="number" placeholder="Rate" value={item.rate === undefined ? '' : item.rate} onChange={(e) => handleFieldChange('rate', e.target.value)} className="h-9 text-sm text-center" min="0" step="0.01"/>
            )}
            {item.purchaseNetType === 'net_percentage' && (
              <Input type="number" placeholder="%" value={item.purchaseNetPercentValue === undefined ? '' : item.purchaseNetPercentValue} onChange={(e) => handleFieldChange('purchaseNetPercentValue', e.target.value)} className="h-9 text-sm text-center" min="0" step="0.01"/>
            )}
            {item.purchaseNetType === 'fixed_net_price' && (
              <Input type="number" placeholder="Net Rate" value={item.purchaseNetFixedValue === undefined ? '' : item.purchaseNetFixedValue} onChange={(e) => handleFieldChange('purchaseNetFixedValue', e.target.value)} className="h-9 text-sm text-center" min="0" step="0.01"/>
            )}
            {item.purchaseNetType !== 'market_rate' && (
                 <p className="text-xs text-muted-foreground text-center">Eff: {effectiveRateForPurchaseDisplay.toFixed(2)}</p>
            )}
          </div>
        </>
      )}

      {!isPurchase && (
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
              onValueChange={(val: 'percentage' | 'fixed') => onItemChange({ ...item, makingChargeType: val })} // No need to call handleFieldChange for this
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
