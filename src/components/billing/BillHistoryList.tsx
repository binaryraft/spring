
"use client";
import React from 'react';
import type { Bill, BillType } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit3, Trash2, FileCheck, ShoppingCart } from 'lucide-react';
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
  onEditBill: (bill: Bill) => void; 
  onViewBill: (bill: Bill) => void; 
}

const BillHistoryList: React.FC<BillHistoryListProps> = ({ billType, onEditBill, onViewBill }) => {
  const { bills, deleteBill } = useAppContext();

  const filteredBills = bills.filter(bill => bill.type === billType).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getBillTypeIcon = (type: BillType) => {
    switch (type) {
      case 'purchase': return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      // case 'sales-estimate': return <FileText className="h-4 w-4 text-yellow-500" />; // Removed
      case 'sales-bill': return <FileCheck className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };
  
  if (filteredBills.length === 0) {
    return <p className="text-muted-foreground p-4 text-center">No {billType === 'purchase' ? 'purchases' : 'sales'} found.</p>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-xl font-headline mb-4 text-primary">
        {billType === 'purchase' ? 'Purchase History' : 'Sales Bill History'}
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Type</TableHead>
              <TableHead>Bill No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>{billType === 'purchase' ? 'Supplier' : 'Customer'}</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-center w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.map((bill) => (
              <TableRow key={bill.id}>
                <TableCell>{getBillTypeIcon(bill.type)}</TableCell>
                <TableCell className="font-medium">{bill.billNumber || 'N/A'}</TableCell>
                <TableCell>{format(new Date(bill.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>{bill.customerName || 'N/A'}</TableCell>
                <TableCell className="text-right">{bill.totalAmount.toFixed(2)}</TableCell>
                <TableCell className="text-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => onViewBill(bill)} title="View Bill">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEditBill(bill)} title="Edit Bill">
                    <Edit3 className="h-4 w-4 text-accent" />
                  </Button>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="Delete Bill">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the bill ({bill.billNumber || bill.id}).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteBill(bill.id)} className="bg-destructive hover:bg-destructive/90">
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
