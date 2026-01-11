
"use client";

import type { BillItem } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format } from 'date-fns';

type GstReportItem = BillItem & {
    billDate: string;
    billNumber: string;
    customerName?: string;
};

interface GstReportTableProps {
  items: GstReportItem[];
}

const GstReportTable: React.FC<GstReportTableProps> = ({ items }) => {
  const { settings } = useAppContext();

  if (items.length === 0) {
    return <p className="text-muted-foreground p-6 text-center text-lg">No sales items found for the selected period.</p>;
  }

  const totals = items.reduce((acc, item) => {
    acc.taxable += item.amount;
    acc.cgst += item.itemCgstAmount || 0;
    acc.sgst += item.itemSgstAmount || 0;
    acc.totalTax += (item.itemCgstAmount || 0) + (item.itemSgstAmount || 0);
    return acc;
  }, { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 });

  return (
    <div className="rounded-lg border shadow-md overflow-hidden bg-card mt-6">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-base">Date</TableHead>
            <TableHead className="text-base">Product (HSN)</TableHead>
            <TableHead className="text-base">Bill No.</TableHead>
            <TableHead className="text-right text-base">Taxable</TableHead>
            <TableHead className="text-right text-base">CGST (${settings.cgstRate}%)</TableHead>
            <TableHead className="text-right text-base">SGST (${settings.sgstRate}%)</TableHead>
            <TableHead className="text-right text-base">Total Tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const totalTax = (item.itemCgstAmount || 0) + (item.itemSgstAmount || 0);
            return (
              <TableRow key={item.id} className="text-base hover:bg-primary/5">
                <TableCell>{format(new Date(item.billDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{item.name}{item.hsnCode ? ` (${item.hsnCode})`: ''}</TableCell>
                <TableCell>{item.billNumber || 'N/A'}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{item.amount.toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{(item.itemCgstAmount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{(item.itemSgstAmount || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{totalTax.toFixed(2)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter className="bg-muted font-bold text-base">
            <TableRow>
                <TableCell colSpan={3}>Totals</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{totals.taxable.toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{totals.cgst.toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{totals.sgst.toFixed(2)}</TableCell>
                <TableCell className="text-right">{settings.currencySymbol}{totals.totalTax.toFixed(2)}</TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default GstReportTable;
