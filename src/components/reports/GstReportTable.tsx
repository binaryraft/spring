
"use client";

import type { Bill } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { format } from 'date-fns';

interface GstReportTableProps {
  bills: Bill[];
}

const GstReportTable: React.FC<GstReportTableProps> = ({ bills }) => {
  const { settings } = useAppContext();

  if (bills.length === 0) {
    return <p className="text-muted-foreground p-6 text-center text-lg">No sales bills found for the selected period.</p>;
  }

  const totals = bills.reduce((acc, bill) => {
    acc.taxable += bill.subTotal;
    acc.cgst += bill.cgstAmount || 0;
    acc.sgst += bill.sgstAmount || 0;
    acc.totalTax += (bill.cgstAmount || 0) + (bill.sgstAmount || 0);
    return acc;
  }, { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 });

  return (
    <div className="rounded-lg border shadow-md overflow-hidden bg-card mt-6">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="text-base">Bill No.</TableHead>
            <TableHead className="text-base">Date</TableHead>
            <TableHead className="text-base">Customer</TableHead>
            <TableHead className="text-right text-base">Taxable Amount</TableHead>
            <TableHead className="text-right text-base">CGST (${settings.cgstRate}%)</TableHead>
            <TableHead className="text-right text-base">SGST (${settings.sgstRate}%)</TableHead>
            <TableHead className="text-right text-base">Total Tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id} className="text-base hover:bg-primary/5">
              <TableCell className="font-medium">{bill.billNumber || 'N/A'}</TableCell>
              <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
              <TableCell>{bill.customerName || 'N/A'}</TableCell>
              <TableCell className="text-right">{settings.currencySymbol}{bill.subTotal.toFixed(2)}</TableCell>
              <TableCell className="text-right">{settings.currencySymbol}{(bill.cgstAmount || 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">{settings.currencySymbol}{(bill.sgstAmount || 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">{settings.currencySymbol}{((bill.cgstAmount || 0) + (bill.sgstAmount || 0)).toFixed(2)}</TableCell>
            </TableRow>
          ))}
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
