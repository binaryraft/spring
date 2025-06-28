
"use client";
import React, { useMemo } from 'react';
import type { Bill, BillType } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, FileCheck, ShoppingCart, Truck } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format } from 'date-fns';


interface BillHistoryListProps {
  billType: BillType;
  bills: Bill[];
  onEditBill: (bill: Bill) => void; 
  onViewBill: (bill: Bill) => void; 
}

const BillHistoryList: React.FC<BillHistoryListProps> = ({ billType, bills, onEditBill, onViewBill }) => {
  const { settings, deleteBill } = useAppContext();
  const isDeliveryVoucher = billType === 'delivery-voucher';

  const getBillTypeIcon = (type: BillType) => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="h-5 w-5 text-destructive" />;
      case 'sales-bill': return <FileCheck className="h-5 w-5 text-success" />;
      case 'delivery-voucher': return <Truck className="h-5 w-5 text-warning" />;
      default: return null;
    }
  };

  const historyTitle = useMemo(() => {
    switch(billType) {
        case 'purchase': return 'Purchase Invoice History';
        case 'sales-bill': return 'Sales Bill History';
        case 'delivery-voucher': return 'Delivery Voucher History';
        default: return 'History';
    }
  }, [billType]);
  
  const customerLabel = useMemo(() => {
    switch(billType) {
        case 'purchase': return 'Supplier';
        case 'sales-bill': return 'Customer';
        case 'delivery-voucher': return 'Recipient';
        default: return 'Party';
    }
  }, [billType]);
  
  if (bills.length === 0) {
    return <p className="text-muted-foreground p-6 text-center text-lg">No {billType === 'purchase' ? 'invoices' : billType === 'sales-bill' ? 'sales' : 'vouchers'} found for the selected period.</p>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl lg:text-3xl font-headline mb-6 text-primary">
        {historyTitle}
      </h3>
      <div className="rounded-lg border shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[60px] text-base pl-4">Type</TableHead>
              <TableHead className="text-base">Bill No.</TableHead>
              <TableHead className="text-base">Date</TableHead>
              <TableHead className="text-base">{customerLabel}</TableHead>
              {!isDeliveryVoucher && <TableHead className="text-right text-base">Total Amount</TableHead>}
              <TableHead className="text-center w-[180px] text-base pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id} className="text-base hover:bg-primary/5">
                <TableCell className="pl-4 py-3">{getBillTypeIcon(bill.type)}</TableCell>
                <TableCell className="font-medium py-3">{bill.billNumber || 'N/A'}</TableCell>
                <TableCell className="py-3">{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="py-3">{bill.customerName || 'N/A'}</TableCell>
                {!isDeliveryVoucher && <TableCell className="text-right py-3">{settings.currencySymbol}{bill.totalAmount.toFixed(2)}</TableCell>}
                <TableCell className="text-center space-x-1.5 py-3 pr-4">
                  <Button variant="ghost" size="icon" onClick={() => onViewBill(bill)} title="View Bill" className="hover:bg-accent">
                    <Eye className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEditBill(bill)} title="Edit Bill" className="hover:bg-accent">
                    <Edit3 className="h-5 w-5 text-primary" />
                  </Button>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete Bill" className="hover:bg-destructive/10">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                          This action cannot be undone. This will permanently delete this record ({bill.billNumber || bill.id}).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="text-base px-4 py-2 h-auto">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteBill(bill.id)} className="bg-destructive hover:bg-destructive/90 text-base px-4 py-2 h-auto">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BillHistoryList;
