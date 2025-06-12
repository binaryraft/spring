
"use client";
import React from 'react';
import type { Bill, BillItem } from '@/types'; 
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
    }, 100); // Small delay to ensure content is rendered for print
  };
  
  const displaySubTotal = bill.subTotal;
  let displayCgstAmount = bill.cgstAmount || 0;
  let displaySgstAmount = bill.sgstAmount || 0;
  let displayTotalAmount = bill.totalAmount;

  if (isEstimateView) {
    displayCgstAmount = 0; 
    displaySgstAmount = 0;
    displayTotalAmount = displaySubTotal; 
  }


  const getEffectiveRateForItem = (item: BillItem): number => {
    if (bill.type === 'purchase') {
        const valuable = getValuableById(item.valuableId);
        const marketPrice = valuable ? valuable.price : 0;
        switch (item.purchaseNetType) {
            case 'net_percentage':
                return marketPrice * (1 - ((item.purchaseNetPercentValue || 0) / 100));
            case 'fixed_net_price':
                return item.purchaseNetFixedValue || 0;
            // 'market_rate' removed for purchaseNetType
            default: // Should ideally not be reached if types are enforced
                return 0; 
        }
    }
    return item.rate; // For sales bills, item.rate is the display rate
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col print:shadow-none print:border-none print:max-h-full print:w-full print:m-0 print:p-0">
        <DialogHeader className="print:hidden">
          <DialogTitle className="font-headline text-2xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription>
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto p-1 print:p-0" id="bill-to-print">
          <div className="p-6 border rounded-lg bg-card shadow-sm print:border-gray-300 print:shadow-none print:rounded-none print:bg-white print:text-black">
            <header className="text-center mb-6 print:mb-4">
              <h1 className="text-3xl font-bold font-headline text-primary print:text-2xl print:text-black">{company.companyName}</h1>
              {company.slogan && <p className="text-sm text-muted-foreground print:text-xs print:text-gray-600">{company.slogan}</p>}
              <p className="text-xs print:text-xxs print:text-gray-500">{company.address}</p>
              <p className="text-xs print:text-xxs print:text-gray-500">Phone: {company.phoneNumber}</p>
              <h2 className="text-xl font-semibold mt-3 text-accent print:text-lg print:text-black print:mt-2">{effectiveBillType.toUpperCase()}</h2>
            </header>

            <Separator className="my-4 print:my-3 print:border-gray-400"/>

             <div className="grid grid-cols-2 gap-4 mb-4 text-sm print:text-xs print:mb-3">
                <div>
                    <h3 className="font-semibold mb-1 print:font-bold">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="print:text-gray-700">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs print:text-xxs print:text-gray-600">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs print:text-xxs print:text-gray-600">Phone: {bill.customerPhone}</p>}
                </div>
                <div className="text-right">
                    <h3 className="font-semibold mb-1 print:font-bold">
                        Details:
                    </h3>
                    <p className="print:text-gray-700">
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p className="print:text-gray-700">Date: <span className="font-medium">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm print:text-xs">
                <thead className="print:bg-gray-100">
                  <tr className="border-b print:border-gray-400">
                    <th className="py-2 px-1 text-left font-semibold print:px-2">#</th>
                    <th className="py-2 px-1 text-left font-semibold print:px-2">Item (Material)</th>
                    <th className="py-2 px-1 text-right font-semibold print:px-2">Qty/Wt</th>
                    <th className="py-2 px-1 text-right font-semibold print:px-2">Rate</th>
                    {(bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && <th className="py-2 px-1 text-right font-semibold print:px-2">Making</th>}
                    <th className="py-2 px-1 text-right font-semibold print:px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    const effectiveRate = getEffectiveRateForItem(item);
                    return (
                    <tr key={item.id} className="border-b last:border-b-0 print:border-gray-300">
                      <td className="py-2 px-1 print:py-1 print:px-2">{index + 1}</td>
                      <td className="py-2 px-1 print:py-1 print:px-2 flex items-center">
                        <ValuableIcon valuableType={valuableDetails?.icon} color={valuableDetails?.iconColor} className="w-4 h-4 mr-1.5 print:hidden"/>
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2 px-1 text-right print:py-1 print:px-2">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right print:py-1 print:px-2">{effectiveRate.toFixed(2)}</td>
                      {bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) && ( 
                        <td className="py-2 px-1 text-right print:py-1 print:px-2">
                          {item.makingCharge && item.makingCharge > 0 ? 
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2)) 
                           : '-'}
                        </td>
                      )}
                      <td className="py-2 px-1 text-right font-medium print:py-1 print:px-2 print:font-semibold">{item.amount.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <Separator className="my-4 print:my-3 print:border-gray-400"/>

            <div className="grid grid-cols-5 gap-x-4 mt-4 print:mt-3">
              <div className="col-span-3">
                {bill.notes && (
                  <>
                    <h4 className="font-semibold text-xs mb-1 print:font-bold">Notes:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line print:text-gray-600 print:text-xxs">{bill.notes}</p>
                  </>
                )}
              </div>
              <div className="col-span-2 text-sm space-y-1 text-right print:text-xs">
                <p>Subtotal: <span className="font-semibold">{displaySubTotal.toFixed(2)}</span></p>
                
                {!isEstimateView && bill.type === 'sales-bill' && displayCgstAmount > 0 && <p>CGST ({settings.cgstRate}%): <span className="font-semibold">{displayCgstAmount.toFixed(2)}</span></p>}
                {!isEstimateView && bill.type === 'sales-bill' && displaySgstAmount > 0 && <p>SGST ({settings.sgstRate}%): <span className="font-semibold">{displaySgstAmount.toFixed(2)}</span></p>}
                
                <Separator className="my-1 print:border-gray-400"/>
                <p className="text-lg font-bold print:text-base print:font-extrabold">Total: <span className="text-primary print:text-black">{displayTotalAmount.toFixed(2)}</span></p>
              </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-muted-foreground print:text-gray-500 print:text-xxs print:mt-6">
              Thank you for your business!
              <p className="print:mt-4 print:text-gray-400">--- {company.companyName} ---</p>
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
          body {
            -webkit-print-color-adjust: exact !important; /* Chrome, Safari */
            color-adjust: exact !important; /* Firefox */
            font-family: 'PT Sans', sans-serif; /* Ensure a consistent print font */
          }
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
            padding: 15px; /* Standard A4 padding */
            font-size: 10pt; 
            background-color: white !important;
          }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-700 { color: #374151 !important; }
          .print\\:text-gray-600 { color: #4B5563 !important; }
          .print\\:text-gray-500 { color: #6B7280 !important; }
          .print\\:text-gray-400 { color: #9CA3AF !important; }
          .print\\:border-gray-400 { border-color: #9CA3AF !important; }
          .print\\:border-gray-300 { border-color: #D1D5DB !important; }
          .print\\:bg-gray-100 { background-color: #F3F4F6 !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:hidden { display: none !important; }
          .print\\:text-xs { font-size: 9pt !important; }
          .print\\:text-xxs { font-size: 7.5pt !important; }
          .print\\:text-lg { font-size: 12pt !important; }
          .print\\:text-xl { font-size: 14pt !important; }
          .print\\:text-2xl { font-size: 16pt !important; }
          .print\\:font-bold { font-weight: bold !important; }
          .print\\:font-semibold { font-weight: 600 !important; }
          .print\\:font-extrabold { font-weight: 800 !important; }
          .print\\:mb-3 { margin-bottom: 0.75rem !important; }
          .print\\:mb-4 { margin-bottom: 1rem !important; }
          .print\\:mt-2 { margin-top: 0.5rem !important; }
          .print\\:mt-3 { margin-top: 0.75rem !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
          .print\\:mt-6 { margin-top: 1.5rem !important; }
          .print\\:my-3 { margin-top: 0.75rem !important; margin-bottom: 0.75rem !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
          .print\\:py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
          table { page-break-inside: auto }
          tr    { page-break-inside: avoid; page-break-after: auto }
          thead { display: table-header-group }
          tfoot { display: table-footer-group }
        }
        @page {
          size: A4;
          margin: 20mm 15mm; /* Standard A4 margins */
        }
      `}</style>
    </Dialog>
  );
};

export default BillViewModal;
