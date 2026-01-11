
"use client";

import type { ReportItem } from '@/app/(main)/reports/page';
import { useAppContext } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format } from 'date-fns';

interface PurchaseReportTableProps {
  items: ReportItem[];
}

const PurchaseReportTable: React.FC<PurchaseReportTableProps> = ({ items }) => {
  const { settings } = useAppContext();

  if (items.length === 0) {
    return <p className="text-muted-foreground p-6 text-center text-lg">No purchase items found for the selected period.</p>;
  }

  const totals = items.reduce((acc, item) => {
    acc.totalAmount += item.amount;
    return acc;
  }, { totalAmount: 0 });

  return (
    <div className="rounded-lg border shadow-md overflow-hidden bg-card mt-6">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-base">Date</TableHead>
            <TableHead className="text-base">Product</TableHead>
            <TableHead className="text-base">Material</TableHead>
            <TableHead className="text-base">Bill No.</TableHead>
            <TableHead className="text-right text-base">Qty/Wt</TableHead>
            <TableHead className="text-right text-base">Rate</TableHead>
            <TableHead className="text-right text-base">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const weightDisplay = `${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}`;
            return (
              <TableRow key={item.id} className="text-base hover:bg-destructive/5">
                <TableCell>{format(new Date(item.billDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.valuableName}</TableCell>
                <TableCell>{item.billNumber || 'N/A'}</TableCell>
                <TableCell className="text-right">{weightDisplay}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{item.rate.toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{item.amount.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter className="bg-muted font-bold text-base">
            <TableRow>
                <TableCell colSpan={6}>Total Purchase Value</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{totals.totalAmount.toFixed(2)}</TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default PurchaseReportTable;
