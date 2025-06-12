
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
import { Printer, Building } from 'lucide-react';
import Image from 'next/image';

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
            default:
                // This case should ideally not be reached if purchaseNetType is always set for purchase items.
                // Fallback to item.rate if available, otherwise 0.
                return item.rate || 0;
        }
    }
    return item.rate || 0; // For sales bills
  };

  const PlaceholderLogo = () => (
    <div className="w-16 h-16 bg-muted/50 flex items-center justify-center rounded print:bg-transparent print-placeholder-logo">
      <Building className="w-8 h-8 text-muted-foreground print:fill-black" />
    </div>
  );

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

        <div className="flex-grow overflow-y-auto p-1 print:overflow-visible print:p-0" id="bill-to-print">
          <div className="p-6 border rounded-lg bg-card shadow-sm print:border-gray-300 print:shadow-none print:rounded-none print:bg-white print:text-black">
            <header className="mb-6 print:mb-4">
              <div className="flex justify-between items-start">
                  <div className="text-left">
                      <h1 className="text-3xl font-bold font-headline text-primary print:text-2xl print:text-black print:font-bold">{company.companyName}</h1>
                      {company.slogan && <p className="text-sm text-muted-foreground print:text-xs print:text-gray-700">{company.slogan}</p>}
                      <p className="text-xs print:text-xxs print:text-gray-600">{company.address}</p>
                      <p className="text-xs print:text-xxs print:text-gray-600">Phone: {company.phoneNumber}</p>
                  </div>
                  {company.showCompanyLogo && (
                    <div className="w-20 h-20 flex-shrink-0 print:w-auto print:h-auto print:max-w-[150px] print:max-h-[75px]">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={80} height={80} className="object-contain print-logo" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                  )}
              </div>
              <h2 className="text-xl font-semibold mt-3 text-accent text-center print:text-lg print:text-black print:font-semibold print:mt-2">{effectiveBillType.toUpperCase()}</h2>
            </header>

            <Separator className="my-4 print:my-3 print:border-gray-400"/>

             <div className="grid grid-cols-2 gap-4 mb-4 text-sm print:text-xs print:mb-3">
                <div>
                    <h3 className="font-semibold mb-1 print:font-bold">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="print:text-gray-800">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs print:text-xxs print:text-gray-700">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs print:text-xxs print:text-gray-700">Phone: {bill.customerPhone}</p>}
                </div>
                <div className="text-right">
                    <h3 className="font-semibold mb-1 print:font-bold">
                        Details:
                    </h3>
                    <p className="print:text-gray-800">
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p className="print:text-gray-800">Date: <span className="font-medium">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-sm print:text-xs print:border-collapse">
                <thead className="print:bg-gray-100">
                  <tr className="border-b print:border-b-2 print:border-gray-400">
                    <th className="py-2 px-1 text-left font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">#</th>
                    <th className="py-2 px-1 text-left font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">Item (Material)</th>
                    <th className="py-2 px-1 text-right font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">Qty/Wt</th>
                    <th className="py-2 px-1 text-right font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">Rate</th>
                    {(bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && <th className="py-2 px-1 text-right font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">Making</th>}
                    <th className="py-2 px-1 text-right font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    const effectiveRate = getEffectiveRateForItem(item);
                    return (
                    <tr key={item.id} className="border-b last:border-b-0 print:border-b print:border-gray-300">
                      <td className="py-2 px-1 print:py-1 print:px-2 print:text-black">{index + 1}</td>
                      <td className="py-2 px-1 print:py-1 print:px-2 print:text-black">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2 px-1 text-right print:py-1 print:px-2 print:text-black">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right print:py-1 print:px-2 print:text-black">{effectiveRate.toFixed(2)}</td>
                      {bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) && (
                        <td className="py-2 px-1 text-right print:py-1 print:px-2 print:text-black">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      <td className="py-2 px-1 text-right font-medium print:py-1 print:px-2 print:font-semibold print:text-black">{item.amount.toFixed(2)}</td>
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
                    <h4 className="font-semibold text-xs mb-1 print:font-bold print:text-black">Notes:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line print:text-gray-700 print:text-xxs">{bill.notes}</p>
                  </>
                )}
              </div>
              <div className="col-span-2 text-sm space-y-1 text-right print:text-xs">
                <p className="print:text-black">Subtotal: <span className="font-semibold print:text-black">{displaySubTotal.toFixed(2)}</span></p>

                {!isEstimateView && bill.type === 'sales-bill' && displayCgstAmount > 0 && <p className="print:text-black">CGST ({settings.cgstRate}%): <span className="font-semibold print:text-black">{displayCgstAmount.toFixed(2)}</span></p>}
                {!isEstimateView && bill.type === 'sales-bill' && displaySgstAmount > 0 && <p className="print:text-black">SGST ({settings.sgstRate}%): <span className="font-semibold print:text-black">{displaySgstAmount.toFixed(2)}</span></p>}

                <Separator className="my-1 print:border-gray-300"/>
                <p className="text-lg font-bold print:text-base print:font-extrabold print:text-black">Total: <span className="text-primary print:text-black">{displayTotalAmount.toFixed(2)}</span></p>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground print:text-gray-600 print:text-xxs print:mt-6">
              Thank you for your business!
              <p className="print:mt-4 print:text-gray-500">--- {company.companyName} ---</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4"/> Print {isEstimateView ? "Estimate" : "Bill"}
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      <style jsx global>{`
        @media print {
          html, body {
            font-family: 'PT Sans', sans-serif !important;
            font-size: 10pt !important;
            color: #000000 !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
            color: #000000 !important;
            background-color: transparent !important;
            border-color: #aaaaaa !important;
            box-shadow: none !important;
            text-shadow: none !important;
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
            padding: 0;
            background-color: #ffffff !important;
            border: none !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          #bill-to-print p,
          #bill-to-print span,
          #bill-to-print div,
          #bill-to-print th,
          #bill-to-print td,
          #bill-to-print li,
          #bill-to-print h1,
          #bill-to-print h2,
          #bill-to-print h3,
          #bill-to-print h4,
          #bill-to-print h5,
          #bill-to-print h6 {
            color: #000000 !important;
            background-color: transparent !important;
          }

          #bill-to-print .text-primary,
          #bill-to-print .text-accent,
          #bill-to-print .text-muted-foreground,
          #bill-to-print .text-destructive,
          #bill-to-print .text-gray-800,
          #bill-to-print .text-gray-700,
          #bill-to-print .text-gray-600,
          #bill-to-print .text-gray-500 {
             color: #000000 !important;
           }

          #bill-to-print .font-headline {
            font-family: 'Playfair Display', serif !important;
          }
          #bill-to-print .font-body {
            font-family: 'PT Sans', sans-serif !important;
          }

          #bill-to-print table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          #bill-to-print tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          #bill-to-print thead {
            display: table-header-group !important;
            background-color: #f0f0f0 !important;
          }
           #bill-to-print th {
            font-weight: bold !important;
            text-align: left !important;
            background-color: #f0f0f0 !important;
            color: #000000 !important;
            border: 1px solid #aaaaaa !important;
            padding: 4px 6px !important;
          }
          #bill-to-print td {
             border: 1px solid #aaaaaa !important;
             padding: 4px 6px !important;
             color: #000000 !important;
          }
          #bill-to-print .print\\:font-bold { font-weight: bold !important; }
          #bill-to-print .print\\:font-semibold { font-weight: 600 !important; }
          #bill-to-print .print\\:text-xs { font-size: 0.8rem !important; }
          #bill-to-print .print\\:text-xxs { font-size: 0.7rem !important; }

          .print-logo {
            filter: grayscale(100%) contrast(150%) !important;
            max-width: 120px !important;
            max-height: 60px !important;
            object-fit: contain !important;
            display: block !important;
          }
          .print-placeholder-logo {
            background-color: transparent !important;
            border: 1px solid #aaaaaa !important;
            width: 60px !important;
            height: 60px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .print-placeholder-logo svg {
             width: 35px !important;
             height: 35px !important;
             fill: #000000 !important;
             stroke: #000000 !important;
          }

          #bill-to-print hr,
          #bill-to-print .print\\:border-gray-400,
          #bill-to-print .print\\:border-gray-300,
          #bill-to-print .border-t,
          #bill-to-print .border-b {
            border-color: #aaaaaa !important;
            background-color: #aaaaaa !important; /* For hr elements */
          }
           #bill-to-print .whitespace-pre-line {
             white-space: pre-wrap !important;
             word-break: break-word;
          }
          .print\\:hidden { display: none !important; }
        }
        @page {
          size: A4;
          margin: 10mm 15mm;
        }
      `}</style>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;

    