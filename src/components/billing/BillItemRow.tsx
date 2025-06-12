
"use client";
import React from 'react';
import type { BillItem, Valuable } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import ValuableIcon from '../ValuableIcon';

interface BillItemRowProps {
  item: Partial<BillItem>;
  onItemChange: (updatedItem: Partial<BillItem>) => void;
  onRemoveItem: () => void;
  availableValuables: Valuable[];
  isPurchase: boolean;
}

const BillItemRow: React.FC<BillItemRowProps> = ({ item, onItemChange, onRemoveItem, availableValuables, isPurchase }) => {
  const { getValuableById } = useAppContext();

  const handleValuableSelect = (valuableId: string) => {
    const selectedValuable = getValuableById(valuableId);
    if (selectedValuable) {
      onItemChange({
        ...item,
        valuableId,
        name: selectedValuable.name,
        rate: selectedValuable.price,
        unit: selectedValuable.unit,
        weightOrQuantity: item.weightOrQuantity || 1, // Default to 1 if not set
        makingChargeType: item.makingChargeType || 'percentage',
        makingCharge: item.makingCharge || 0,
      });
    }
  };

  const handleFieldChange = (field: keyof BillItem, value: any) => {
    let numericValue = value;
    if (field === 'weightOrQuantity' || field === 'rate' || field === 'makingCharge') {
      numericValue = parseFloat(value) || 0;
    }
    onItemChange({ ...item, [field]: numericValue });
  };
  
  const selectedValuableDetails = item.valuableId ? getValuableById(item.valuableId) : null;

  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b">
      <div className="col-span-3">
        <Select value={item.valuableId} onValueChange={handleValuableSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select Item" />
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
      <div className="col-span-2">
        <Input 
          type="number" 
          placeholder={`Qty/${selectedValuableDetails?.unit || 'unit'}`}
          value={item.weightOrQuantity || ''}
          onChange={(e) => handleFieldChange('weightOrQuantity', e.target.value)}
          min="0"
        />
      </div>
      <div className="col-span-2">
        <Input 
          type="number" 
          placeholder="Rate"
          value={item.rate || ''}
          onChange={(e) => handleFieldChange('rate', e.target.value)}
          min="0"
        />
      </div>
      {!isPurchase && ( // Making charges typically for sales
        <>
          <div className="col-span-1">
            <Select 
              value={item.makingChargeType || 'percentage'} 
              onValueChange={(val: 'percentage' | 'fixed') => onItemChange({ ...item, makingChargeType: val })}
            >
              <SelectTrigger className="text-xs px-1">
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
              value={item.makingCharge || ''}
              onChange={(e) => handleFieldChange('makingCharge', e.target.value)}
              min="0"
            />
          </div>
        </>
      )}
      <div className={`col-span-2 ${isPurchase ? 'col-start-8' : ''} text-right`}>
        <span className="font-medium">{item.amount?.toFixed(2) || '0.00'}</span>
      </div>
      <div className="col-span-1">
        <Button variant="ghost" size="icon" onClick={onRemoveItem} className="text-destructive hover:text-destructive/80">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default BillItemRow;
