
"use client";
import React, { useState } from 'react';
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
import { Printer, Building, Loader2 } from 'lucide-react';
import Image from 'next/image';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface BillViewModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  isEstimateView?: boolean;
}

const BillViewModal: React.FC<BillViewModalProps> = ({ bill, isOpen, onClose, isEstimateView = false }) => {
  const { settings, getValuableById } = useAppContext();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!bill) return null;

  const company = settings;

  let effectiveBillType = '';
  if (isEstimateView) {
    effectiveBillType = bill.type === 'purchase' ? 'Purchase Estimate' : 'Sales Estimate';
  } else {
    effectiveBillType = bill.type === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice';
  }

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    const billContentElement = document.getElementById('bill-to-print');
    if (!billContentElement) {
      console.error('Bill content element not found.');
      setIsGeneratingPdf(false);
      return;
    }

    // Temporarily adjust styles for html2canvas capture for better quality
    const originalStyles = {
      transform: billContentElement.style.transform,
      width: billContentElement.style.width,
      border: billContentElement.style.border,
      boxShadow: billContentElement.style.boxShadow,
    };
    billContentElement.style.transform = 'scale(1)'; // Ensure no scaling during capture
    billContentElement.style.width = '210mm'; // A4 width
    billContentElement.style.border = 'none';
    billContentElement.style.boxShadow = 'none';


    try {
      const canvas = await html2canvas(billContentElement, {
        scale: 2, // Increase scale for better resolution
        useCORS: true, // For external images if any (logo)
        logging: false,
        onclone: (document) => {
          // Apply print styles directly to the cloned document for html2canvas
          const style = document.createElement('style');
          style.innerHTML = printStyles; // printStyles defined below
          document.head.appendChild(style);
          // Ensure the specific element is targeted
          const clonedContent = document.getElementById('bill-to-print');
          if (clonedContent) {
            // You can force additional styles here if needed for the capture
             clonedContent.style.backgroundColor = '#ffffff';
          }
        }
      });

      // Restore original styles after capture
      billContentElement.style.transform = originalStyles.transform;
      billContentElement.style.width = originalStyles.width;
      billContentElement.style.border = originalStyles.border;
      billContentElement.style.boxShadow = originalStyles.boxShadow;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const aspectRatio = canvasWidth / canvasHeight;

      let imgWidth = pdfWidth - 20; // A4 width in mm minus 10mm margin on each side
      let imgHeight = imgWidth / aspectRatio;
      
      let position = 0; // For multi-page, not fully implemented here

      if (imgHeight > pdfHeight - 20) { // check if image is taller than page
        imgHeight = pdfHeight - 20; // max height with margin
        imgWidth = imgHeight * aspectRatio;
      }

      const xOffset = (pdfWidth - imgWidth) / 2;
      const yOffset = 10; // 10mm margin from top

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
      
      // Open PDF in a new tab
      pdf.output('dataurlnewwindow');

    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
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
                return item.rate || 0;
        }
    }
    return item.rate || 0;
  };

  const PlaceholderLogo = () => (
    <div className="w-16 h-16 bg-muted/50 flex items-center justify-center rounded print-placeholder-logo">
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

        <div className="flex-grow overflow-y-auto p-1 print:overflow-visible print:p-0">
          {/* This is the div that will be captured for PDF */}
          <div id="bill-to-print" className="p-6 border rounded-lg bg-card shadow-sm print:border-gray-300 print:shadow-none print:rounded-none print:bg-white print:text-black">
            <header className="mb-6 print:mb-4">
              <div className="flex justify-between items-start">
                  <div className="text-left">
                      <h1 className="text-3xl font-bold font-headline text-primary print:text-2xl print:text-black print:font-bold">{company.companyName}</h1>
                      {company.slogan && <p className="text-sm text-muted-foreground print:text-xs print:text-gray-700">{company.slogan}</p>}
                      <p className="text-xs print:text-xxs print:text-gray-600">{company.address}</p>
                      <p className="text-xs print:text-xxs print:text-gray-600">Phone: {company.phoneNumber}</p>
                  </div>
                  {company.showCompanyLogo && (
                    <div className="w-20 h-20 flex-shrink-0 print:w-auto print:h-auto print:max-w-[120px] print:max-h-[60px]">
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
                    {(bill.type === 'sales-bill' && !isEstimateView && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && <th className="py-2 px-1 text-right font-semibold print:px-2 print:py-1.5 print:font-bold print:text-black">Making</th>}
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
                      {(bill.type === 'sales-bill' && !isEstimateView && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && (
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
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4"/>
            )}
            Generate & View PDF
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf}>Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

// Define printStyles as a template literal string to be injected
const printStyles = \`
  body, html {
    background-color: #ffffff !important;
    color: #000000 !important;
    font-family: 'PT Sans', Arial, sans-serif !important;
    font-size: 10pt !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Hide everything except the bill content for html2canvas capture */
  body > *:not(#bill-to-print-wrapper), /* If you wrap #bill-to-print for capture */
  body > *:not(.fixed.inset-0.z-50) > *:not(#bill-to-print) /* More specific if needed */
   {
    /* visibility: hidden !important; */ /* May not be needed if html2canvas targets specific element */
  }
  
  #bill-to-print {
    position: static !important; /* Reset any fixed/absolute positioning for capture */
    width: 100% !important; /* Or specific width like 210mm if scaling for A4 */
    height: auto !important;
    margin: 0 !important;
    padding: 15mm !important; /* Page margins for content */
    background-color: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
    color: #000000 !important; /* Ensure base text color is black */
  }

  #bill-to-print * {
    color: #000000 !important;
    background-color: transparent !important;
    border-color: #aaaaaa !important;
    box-shadow: none !important;
    text-shadow: none !important;
    visibility: visible !important; /* Ensure all children are visible */
  }
  
  #bill-to-print .text-primary,
  #bill-to-print .text-accent,
  #bill-to-print .text-muted-foreground,
  #bill-to-print [class*="text-gray-"] {
      color: #000000 !important;
  }

  #bill-to-print .font-headline {
    font-family: 'Playfair Display', 'Times New Roman', serif !important;
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
  #bill-to-print th, #bill-to-print td {
    font-weight: normal !important;
    text-align: left !important;
    border: 1px solid #cccccc !important;
    padding: 4px 6px !important;
    word-break: break-word;
  }
  #bill-to-print th {
    font-weight: bold !important;
    background-color: #e9e9e9 !important;
  }
  
  #bill-to-print .print\\:font-bold { font-weight: bold !important; }
  #bill-to-print .print\\:font-semibold { font-weight: 600 !important; }
  #bill-to-print .print\\:text-xs { font-size: 0.8rem !important; line-height: 1.2 !important; }
  #bill-to-print .print\\:text-xxs { font-size: 0.7rem !important; line-height: 1.1 !important; }

  .print-logo {
    filter: grayscale(100%) contrast(120%) !important;
    max-width: 100px !important; 
    max-height: 50px !important;
    object-fit: contain !important;
    display: block !important;
  }
  .print-placeholder-logo {
    background-color: transparent !important;
    border: 1px solid #bbbbbb !important;
    width: 60px !important;
    height: 50px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 5px !important;
  }
  .print-placeholder-logo svg {
      width: 30px !important;
      height: 30px !important;
      fill: #000000 !important;
      stroke: #000000 !important;
  }

  #bill-to-print hr,
  #bill-to-print .print\\:border-gray-400,
  #bill-to-print .print\\:border-gray-300,
  #bill-to-print .border-t,
  #bill-to-print .border-b {
    border-color: #cccccc !important;
    background-color: #cccccc !important; 
    height: 1px !important;
    border-style: solid !important;
    border-width: 1px 0 0 0 !important;
  }
  #bill-to-print .whitespace-pre-line {
      white-space: pre-wrap !important;
      word-break: break-word !important;
  }
  
  #bill-to-print .print\\:hidden, .print\\:hidden * { 
    display: none !important; 
  }
  
  /* Specific layout adjustments */
  #bill-to-print header > div.flex { display: flex !important; justify-content: space-between !important; align-items: flex-start !important; }
  #bill-to-print header > div.flex > div.text-left { flex-grow: 1; }
  #bill-to-print header > div.flex > div.w-20 { flex-shrink: 0; }
  
  #bill-to-print .grid.grid-cols-2.gap-4 { display: flex !important; justify-content: space-between !important; }
  #bill-to-print .grid.grid-cols-2.gap-4 > div { width: 48% !important; }
  
  #bill-to-print .grid.grid-cols-5.gap-x-4 { display: flex !important; justify-content: space-between !important; }
  #bill-to-print .grid.grid-cols-5.gap-x-4 > div.col-span-3 { width: 60% !important; }
  #bill-to-print .grid.grid-cols-5.gap-x-4 > div.col-span-2 { width: 35% !important; text-align: right !important; }

\`;

export default BillViewModal;
