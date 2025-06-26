
"use client";
import type { BillItem } from '@/types';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface BillItemPreviewRowProps {
  item: BillItem;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isSalesBill: boolean;
}

export default function BillItemPreviewRow({ item, index, onEdit, onDelete, isSalesBill }: BillItemPreviewRowProps) {
  const { settings, getValuableById } = useAppContext();
  const valuable = getValuableById(item.valuableId);

  const effectiveRate = (() => {
    if (!isSalesBill) {
      const marketPrice = valuable?.price || 0;
      switch (item.purchaseNetType) {
        case 'net_percentage':
          return marketPrice * (1 - ((item.purchaseNetPercentValue || 0) / 100));
        case 'fixed_net_price':
          return item.purchaseNetFixedValue || 0;
        default:
          return item.rate || 0;
      }
    }
    return item.rate || 0;
  })();

  const makingChargeDisplay = () => {
    if (!isSalesBill || item.makingCharge === undefined || item.makingCharge === null) return 'N/A';
    if (item.makingChargeType === 'percentage') {
        return `${item.makingCharge}%`;
    }
    return `${settings.currencySymbol}${(item.makingCharge || 0).toFixed(2)}`;
  }

  const weightDisplay = () => {
    const precision = (valuable?.unit === 'carat' || valuable?.unit === 'ct') ? 3 : 2;
    return `${item.weightOrQuantity.toFixed(precision)} ${item.unit}`;
  }

  return (
    <TableRow className="font-sans">
      <TableCell className="font-medium">{index + 1}</TableCell>
      <TableCell>
        <div className="font-bold text-base">{item.name}</div>
        <div className="text-sm text-muted-foreground">{valuable?.name}</div>
      </TableCell>
      {isSalesBill && settings.enableHsnCode && <TableCell className="text-sm">{item.hsnCode || '-'}</TableCell>}
      <TableCell className="text-right text-sm">{weightDisplay()}</TableCell>
      <TableCell className="text-right text-sm">{settings.currencySymbol}{effectiveRate.toFixed(2)}</TableCell>
      {isSalesBill && <TableCell className="text-right text-sm">{makingChargeDisplay()}</TableCell>}
      <TableCell className="text-right font-bold text-base">{settings.currencySymbol}{item.amount.toFixed(2)}</TableCell>
      <TableCell className="text-center">
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}
