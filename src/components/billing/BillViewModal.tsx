
"use client";
import React from 'react';
import type { Bill } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import ValuableIcon from '../ValuableIcon';

interface BillViewModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

const BillViewModal: React.FC<BillViewModalProps> = ({ bill, isOpen, onClose }) => {
  const { settings, getValuableById } = useAppContext();

  if (!bill) return null;

  const company = settings;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            {bill.type === 'purchase' ? 'Purchase Invoice' : bill.type === 'sales-estimate' ? 'Sales Estimate' : 'Sales Invoice'}
          </DialogTitle>
          <DialogDescription>
            Bill No: {bill.billNumber || 'N/A'} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-1">
          <div className="p-6 border rounded-lg bg-card shadow-sm">
            {/* Company Details */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-headline">{company.companyName}</h2>
              <p className="text-sm text-muted-foreground">{company.slogan}</p>
              <p className="text-xs">{company.address}</p>
              <p className="text-xs">Phone: {company.phoneNumber}</p>
            </div>

            <Separator className="my-4"/>

            {/* Customer Details */}
            {bill.customerName && (
              <div className="mb-4">
                <h3 className="font-semibold mb-1">Billed To:</h3>
                <p className="text-sm">{bill.customerName}</p>
                {bill.customerAddress && <p className="text-xs">{bill.customerAddress}</p>}
                {bill.customerPhone && <p className="text-xs">Phone: {bill.customerPhone}</p>}
              </div>
            )}

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-1 text-left">#</th>
                    <th className="py-2 px-1 text-left">Item</th>
                    <th className="py-2 px-1 text-right">Qty/Wt</th>
                    <th className="py-2 px-1 text-right">Rate</th>
                    {bill.type !== 'purchase' && <th className="py-2 px-1 text-right">Making</th>}
                    <th className="py-2 px-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="py-2 px-1">{index + 1}</td>
                      <td className="py-2 px-1 flex items-center">
                        {valuableDetails && <ValuableIcon valuableType={valuableDetails.icon} color={valuableDetails.iconColor} className="w-4 h-4 mr-2"/>}
                        {item.name}
                      </td>
                      <td className="py-2 px-1 text-right">{item.weightOrQuantity.toFixed(2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right">{item.rate.toFixed(2)}</td>
                      {bill.type !== 'purchase' && (
                        <td className="py-2 px-1 text-right">
                          {item.makingCharge ? 
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2)) 
                           : '-'}
                        </td>
                      )}
                      <td className="py-2 px-1 text-right">{item.amount.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <Separator className="my-4"/>

            {/* Totals Section */}
            <div className="grid grid-cols-2 gap-x-4 mt-4">
              <div className="col-span-1">
                {bill.notes && (
                  <>
                    <h4 className="font-semibold text-xs mb-1">Notes:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{bill.notes}</p>
                  </>
                )}
              </div>
              <div className="col-span-1 text-sm space-y-1 text-right">
                <p>Subtotal: <span className="font-semibold">{bill.subTotal.toFixed(2)}</span></p>
                {bill.type === 'purchase' && bill.purchaseNetApplied && (
                  <p>
                    Net {bill.purchaseNetApplied === 'percentage' ? `(${bill.purchaseNetValueApplied}%)` : `(Fixed)`}:
                    <span className="font-semibold">
                      {bill.purchaseNetApplied === 'percentage' ? (bill.subTotal * (bill.purchaseNetValueApplied || 0) / 100).toFixed(2) : bill.purchaseNetValueApplied?.toFixed(2) }
                    </span>
                  </p>
                )}
                {bill.cgstAmount !== undefined && bill.sgstAmount !== undefined && bill.type !== 'sales-estimate' && (
                  <>
                    <p>CGST ({settings.cgstRate}%): <span className="font-semibold">{bill.cgstAmount.toFixed(2)}</span></p>
                    <p>SGST ({settings.sgstRate}%): <span className="font-semibold">{bill.sgstAmount.toFixed(2)}</span></p>
                  </>
                )}
                <Separator className="my-1"/>
                <p className="text-lg font-bold">Total: <span className="text-primary">{bill.totalAmount.toFixed(2)}</span></p>
              </div>
            </div>
            
            {/* Footer area for print or other actions if needed */}
            {/* <div className="mt-8 text-center text-xs text-muted-foreground">
              Thank you for your business!
            </div> */}
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {/* Add Print button functionality if required */}
          {/* <Button>Print</Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BillViewModal;
