
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
import { Printer } from 'lucide-react';

interface BillViewModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  isEstimateView?: boolean;
}

const BillViewModal: React.FC<BillViewModalProps> = ({ bill, isOpen, onClose, isEstimateView = false }) => {
  const { settings, getValuableById } = useAppContext();

  if (!bill) return null;

  const company = settings;
  
  let effectiveBillType = '';
  if (isEstimateView) {
    effectiveBillType = bill.type === 'purchase' ? 'Purchase Estimate' : 'Sales Estimate';
  } else {
    effectiveBillType = bill.type === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice';
  }

  const handlePrint = () => {
    setTimeout(() => {
        window.print();
    }, 100);
  };
  
  // Determine displayed totals based on whether it's an estimate or a final bill
  const displaySubTotal = bill.subTotal;
  let displayCgstAmount = bill.cgstAmount || 0;
  let displaySgstAmount = bill.sgstAmount || 0;
  let displayTotalAmount = bill.totalAmount;
  let purchaseDiscountAmount = 0;

  if (isEstimateView) {
    displayCgstAmount = 0; // No GST on estimates
    displaySgstAmount = 0;
    displayTotalAmount = displaySubTotal; // For estimates, total is subtotal (includes MC for sales, raw for purchase)
  } else if (bill.type === 'purchase' && bill.purchaseNetApplied && bill.purchaseNetValueApplied !== undefined) {
    // For final purchase invoices, calculate the discount shown
    if (bill.purchaseNetApplied === 'percentage') {
      purchaseDiscountAmount = bill.subTotal * (bill.purchaseNetValueApplied / 100);
    } else { // fixed_price
      // If fixed price, the "discount" is the difference from subtotal to reach that fixed price
      // but totalAmount already reflects the fixed price.
      // The line item in totals will just show "Net (Fixed Price)"
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col print:shadow-none print:border-none print:max-h-full print:w-full print:m-0 print:p-0">
        <DialogHeader className="print:hidden">
          <DialogTitle className="font-headline text-2xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription>
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-1" id="bill-to-print">
          <div className="p-6 border rounded-lg bg-card shadow-sm print:border-none print:shadow-none print:rounded-none">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold font-headline text-primary print:text-black">{company.companyName}</h1>
              <p className="text-sm text-muted-foreground print:text-gray-600">{company.slogan}</p>
              <p className="text-xs print:text-gray-500">{company.address}</p>
              <p className="text-xs print:text-gray-500">Phone: {company.phoneNumber}</p>
              {isEstimateView && <p className="text-lg font-semibold mt-2 text-accent print:text-black">ESTIMATE</p>}
            </div>

            <Separator className="my-4 print:border-gray-400"/>

             <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                    <h3 className="font-semibold mb-1">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p>{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs">Phone: {bill.customerPhone}</p>}
                </div>
                <div className="text-right">
                    <h3 className="font-semibold mb-1">
                        {isEstimateView ? (bill.type === 'purchase' ? 'Purchase Estimate Details:' : 'Sales Estimate Details:') : (bill.type === 'purchase' ? 'Purchase Details:' : 'Invoice Details:')}
                    </h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b print:border-gray-400">
                    <th className="py-2 px-1 text-left font-semibold">#</th>
                    <th className="py-2 px-1 text-left font-semibold">Item Description</th>
                    <th className="py-2 px-1 text-right font-semibold">Qty/Wt</th>
                    <th className="py-2 px-1 text-right font-semibold">Rate</th>
                    {(bill.type !== 'purchase' || (isEstimateView && bill.items.some(i => i.makingCharge))) && !isEstimateView && <th className="py-2 px-1 text-right font-semibold">Making</th>}
                     {bill.type === 'sales-bill' && isEstimateView && bill.items.some(i => i.makingCharge) && <th className="py-2 px-1 text-right font-semibold">Making</th>}
                    <th className="py-2 px-1 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    return (
                    <tr key={item.id} className="border-b last:border-b-0 print:border-gray-300">
                      <td className="py-2 px-1">{index + 1}</td>
                      <td className="py-2 px-1 flex items-center">
                        {valuableDetails && <ValuableIcon valuableType={valuableDetails.icon} color={valuableDetails.iconColor} className="w-4 h-4 mr-2 print:hidden"/>}
                        {item.name} ({valuableDetails?.name || 'Custom Item'})
                      </td>
                      <td className="py-2 px-1 text-right">{item.weightOrQuantity.toFixed(item.unit === 'carat' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right">{item.rate.toFixed(2)}</td>
                      {(bill.type !== 'purchase' || (isEstimateView && item.makingCharge)) && !isEstimateView && (
                        <td className="py-2 px-1 text-right">
                          {item.makingCharge && item.makingCharge > 0 ? 
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2)) 
                           : '-'}
                        </td>
                      )}
                      {bill.type === 'sales-bill' && isEstimateView && item.makingCharge && (
                         <td className="py-2 px-1 text-right">
                          {item.makingCharge && item.makingCharge > 0 ? 
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2)) 
                           : '-'}
                        </td>
                      )}
                      <td className="py-2 px-1 text-right font-medium">{item.amount.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <Separator className="my-4 print:border-gray-400"/>

            <div className="grid grid-cols-5 gap-x-4 mt-4">
              <div className="col-span-3">
                {bill.notes && (
                  <>
                    <h4 className="font-semibold text-xs mb-1">Notes:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line print:text-gray-600">{bill.notes}</p>
                  </>
                )}
              </div>
              <div className="col-span-2 text-sm space-y-1 text-right">
                <p>Subtotal: <span className="font-semibold">{displaySubTotal.toFixed(2)}</span></p>
                
                {!isEstimateView && bill.type === 'purchase' && bill.purchaseNetApplied && bill.purchaseNetValueApplied !== undefined && (
                  <p>
                    {bill.purchaseNetApplied === 'percentage' 
                      ? `Net Discount (${bill.purchaseNetValueApplied}%)` 
                      : `Net (Fixed Price Bill)`}: 
                    <span className="font-semibold">
                      {bill.purchaseNetApplied === 'percentage' 
                        ? `-${purchaseDiscountAmount.toFixed(2)}`
                        : `${bill.totalAmount.toFixed(2)} (Final)`}
                    </span>
                  </p>
                )}

                {displayCgstAmount > 0 && <p>CGST ({settings.cgstRate}%): <span className="font-semibold">{displayCgstAmount.toFixed(2)}</span></p>}
                {displaySgstAmount > 0 && <p>SGST ({settings.sgstRate}%): <span className="font-semibold">{displaySgstAmount.toFixed(2)}</span></p>}
                
                <Separator className="my-1 print:border-gray-400"/>
                <p className="text-lg font-bold">Total: <span className="text-primary print:text-black">{displayTotalAmount.toFixed(2)}</span></p>
              </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-muted-foreground print:text-gray-500">
              Thank you for your business!
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4"/> Print {isEstimateView ? "Estimate" : "Bill"}
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #bill-to-print, #bill-to-print * {
            visibility: visible;
          }
          #bill-to-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 10px; 
            font-size: 10pt; 
          }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-600 { color: #4B5563 !important; }
          .print\\:text-gray-500 { color: #6B7280 !important; }
          .print\\:border-gray-400 { border-color: #9CA3AF !important; }
          .print\\:border-gray-300 { border-color: #D1D5DB !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </Dialog>
  );
};

export default BillViewModal;
