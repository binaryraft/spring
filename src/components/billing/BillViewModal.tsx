
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
        console.error('Bill content element not found for PDF generation.');
        setIsGeneratingPdf(false);
        return;
    }

    // Ensure the element is visible and has dimensions before capture
    const rect = billContentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        console.warn("Bill content element has zero dimensions. Attempting capture anyway, but this might result in a blank PDF.", rect);
    }

    try {
        const canvas = await html2canvas(billContentElement, {
            scale: 2, 
            useCORS: true,
            logging: true, 
            backgroundColor: "#ffffff", 
            onclone: (documentClone) => {
                const clonedContent = documentClone.getElementById('bill-to-print');
                if (clonedContent) {
                    clonedContent.style.backgroundColor = '#ffffff';
                    clonedContent.style.padding = '10mm'; 
                    clonedContent.style.width = 'auto'; // Let content determine width, or set fixed e.g. '800px'
                    clonedContent.style.boxSizing = 'border-box';

                    const allElements = clonedContent.getElementsByTagName('*');
                    for (let i = 0; i < allElements.length; i++) {
                        const el = allElements[i] as HTMLElement;
                        if (el.style) { 
                            el.style.color = '#000000';
                            el.style.backgroundColor = 'transparent'; 
                            el.style.webkitPrintColorAdjust = 'exact';
                            el.style.printColorAdjust = 'exact';
                            // Avoid removing all borders, some are needed for tables
                            // el.style.border = 'none'; 
                            el.style.boxShadow = 'none';
                        }
                    }
                    
                    // Style specific elements like tables for print within the clone
                    const tables = clonedContent.getElementsByTagName('table');
                    for (let i = 0; i < tables.length; i++) {
                        tables[i].style.borderCollapse = 'collapse';
                        tables[i].style.width = '100%';
                    }
                    const ths = clonedContent.getElementsByTagName('th');
                    for (let i = 0; i < ths.length; i++) {
                        ths[i].style.border = '1px solid #ccc';
                        ths[i].style.padding = '4px';
                        ths[i].style.backgroundColor = '#f0f0f0'; // Light grey for header
                    }
                    const tds = clonedContent.getElementsByTagName('td');
                    for (let i = 0; i < tds.length; i++) {
                        tds[i].style.border = '1px solid #ccc';
                        tds[i].style.padding = '4px';
                    }


                    const logo = clonedContent.querySelector('.print-logo') as HTMLElement;
                    if (logo) {
                        logo.style.filter = 'grayscale(100%) contrast(150%)';
                        (logo as HTMLImageElement).style.maxWidth = '100px';
                        (logo as HTMLImageElement).style.maxHeight = '50px';
                        (logo as HTMLImageElement).style.objectFit = 'contain';
                    }
                    const placeholderLogoSvg = clonedContent.querySelector('.print-placeholder-logo svg');
                    if (placeholderLogoSvg) {
                        (placeholderLogoSvg as HTMLElement).style.fill = '#000000';
                        (placeholderLogoSvg as HTMLElement).style.stroke = '#000000';
                         const parentPlaceholder = placeholderLogoSvg.parentElement;
                         if(parentPlaceholder){
                            parentPlaceholder.style.border = '1px solid #000000';
                         }
                    }
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 200) { 
             console.error("Generated canvas image is too small or empty.");
             setIsGeneratingPdf(false);
             return;
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10; 

        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        const maxPdfPageImgWidth = pdfWidth - 2 * margin;
        const maxPdfPageImgHeight = pdfHeight - 2 * margin;

        let ratio = Math.min(maxPdfPageImgWidth / canvasImgWidth, maxPdfPageImgHeight / canvasImgHeight);
        
        const finalPdfImgWidth = canvasImgWidth * ratio;
        const finalPdfImgHeight = canvasImgHeight * ratio;

        const x = margin + (maxPdfPageImgWidth - finalPdfImgWidth) / 2;
        const y = margin + (maxPdfPageImgHeight - finalPdfImgHeight) / 2;
        
        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            console.error("Calculated PDF image dimensions are invalid (<=0).");
            setIsGeneratingPdf(false);
            return;
        }

        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
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
            // Removed 'market_rate' as it's no longer a type for purchase
            default: 
                 // Fallback or error if unexpected type, though types should restrict this
                return item.rate || 0;
        }
    }
    return item.rate || 0;
  };

  const PlaceholderLogo = () => (
    <div className="w-16 h-16 bg-muted/50 flex items-center justify-center rounded print-placeholder-logo">
      <Building className="w-8 h-8 text-muted-foreground" />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription>
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1">
          <div id="bill-to-print" className="p-6 border rounded-lg bg-card shadow-sm text-foreground"> {/* Base text color */}
            <header className="mb-6">
              <div className="flex justify-between items-start">
                  <div className="text-left">
                      <h1 className="text-3xl font-bold font-headline text-primary">{company.companyName}</h1>
                      {company.slogan && <p className="text-sm text-muted-foreground">{company.slogan}</p>}
                      <p className="text-xs">{company.address}</p>
                      <p className="text-xs">Phone: {company.phoneNumber}</p>
                  </div>
                  {company.showCompanyLogo && (
                    <div className="w-20 h-20 flex-shrink-0">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={80} height={80} className="object-contain print-logo" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                  )}
              </div>
              <h2 className="text-xl font-semibold mt-3 text-accent text-center">{effectiveBillType.toUpperCase()}</h2>
            </header>

            <Separator className="my-4"/>

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
                        Details:
                    </h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-1 text-left font-semibold border border-border">#</th>
                    <th className="py-2 px-1 text-left font-semibold border border-border">Item (Material)</th>
                    <th className="py-2 px-1 text-right font-semibold border border-border">Qty/Wt</th>
                    <th className="py-2 px-1 text-right font-semibold border border-border">Rate</th>
                    {(bill.type === 'sales-bill' && !isEstimateView && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && <th className="py-2 px-1 text-right font-semibold border border-border">Making</th>}
                    <th className="py-2 px-1 text-right font-semibold border border-border">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    const effectiveRate = getEffectiveRateForItem(item);
                    return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="py-2 px-1 border border-border">{index + 1}</td>
                      <td className="py-2 px-1 border border-border">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2 px-1 text-right border border-border">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right border border-border">{effectiveRate.toFixed(2)}</td>
                      {(bill.type === 'sales-bill' && !isEstimateView && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && (
                        <td className="py-2 px-1 text-right border border-border">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      <td className="py-2 px-1 text-right font-medium border border-border">{item.amount.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>

            <Separator className="my-4"/>

            <div className="grid grid-cols-5 gap-x-4 mt-4">
              <div className="col-span-3">
                {bill.notes && (
                  <>
                    <h4 className="font-semibold text-xs mb-1">Notes:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{bill.notes}</p>
                  </>
                )}
              </div>
              <div className="col-span-2 text-sm space-y-1 text-right">
                <p>Subtotal: <span className="font-semibold">{displaySubTotal.toFixed(2)}</span></p>

                {!isEstimateView && bill.type === 'sales-bill' && displayCgstAmount > 0 && <p>CGST ({settings.cgstRate}%): <span className="font-semibold">{displayCgstAmount.toFixed(2)}</span></p>}
                {!isEstimateView && bill.type === 'sales-bill' && displaySgstAmount > 0 && <p>SGST ({settings.sgstRate}%): <span className="font-semibold">{displaySgstAmount.toFixed(2)}</span></p>}

                <Separator className="my-1"/>
                <p className="text-lg font-bold">Total: <span className="text-primary">{displayTotalAmount.toFixed(2)}</span></p>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground">
              Thank you for your business!
              <p className="mt-4">--- {company.companyName} ---</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto">
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

export default BillViewModal;
