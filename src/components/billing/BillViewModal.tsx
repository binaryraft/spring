
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
    effectiveBillType = 'Estimate';
  } else {
    effectiveBillType = bill.type === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice';
  }

const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    const billContentElement = document.getElementById('bill-to-print');

    if (!billContentElement) {
        console.error('Bill content element not found for PDF generation.');
        setIsGeneratingPdf(false);
        alert("Error: Bill content element not found. PDF generation aborted.");
        return;
    }

    if (billContentElement.scrollWidth === 0 || billContentElement.scrollHeight === 0) {
        console.error('Bill content element has no dimensions. PDF generation aborted.');
        setIsGeneratingPdf(false);
        alert("Error: Could not determine content size for PDF generation. Please ensure the bill content is visible and has dimensions.");
        return;
    }
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 250)); 

    try {
        console.log(`Attempting to capture element with scrollWidth: ${billContentElement.scrollWidth}, scrollHeight: ${billContentElement.scrollHeight}`);
        
        const canvas = await html2canvas(billContentElement, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: "#ffffff",
            width: billContentElement.scrollWidth,
            height: billContentElement.scrollHeight,
            scrollX: 0, 
            scrollY: 0, 
            windowWidth: billContentElement.scrollWidth,
            windowHeight: billContentElement.scrollHeight,
            onclone: (documentClone) => {
                const clonedContent = documentClone.getElementById('bill-to-print');
                if (clonedContent) {
                    clonedContent.style.position = 'relative'; 
                    clonedContent.style.left = '0px';
                    clonedContent.style.top = '0px';
                    clonedContent.style.transform = 'none';
                    clonedContent.style.width = `${billContentElement.scrollWidth}px`; 
                    clonedContent.style.height = `${billContentElement.scrollHeight}px`; 
                    clonedContent.style.overflow = 'visible'; 
                    clonedContent.style.display = 'block'; 
                    clonedContent.style.backgroundColor = '#ffffff';
                    clonedContent.style.color = '#000000';
                    clonedContent.style.zIndex = '9999'; 
                    
                    const allElements = clonedContent.querySelectorAll('*');
                    allElements.forEach((el) => {
                        const htmlEl = el as HTMLElement;
                        htmlEl.style.color = '#000000';
                        htmlEl.style.backgroundColor = 'transparent';
                        htmlEl.style.boxShadow = 'none';
                        htmlEl.style.borderColor = '#cccccc'; 
                         htmlEl.style.printColorAdjust = 'exact';
                    });

                    const logo = clonedContent.querySelector('.print-logo') as HTMLImageElement;
                    if (logo) {
                        logo.style.filter = 'grayscale(100%) contrast(120%)';
                    }
                    const placeholderLogoSvg = clonedContent.querySelector('.print-placeholder-logo svg') as HTMLElement;
                    if (placeholderLogoSvg && placeholderLogoSvg.style) {
                        placeholderLogoSvg.style.fill = '#000000';
                        placeholderLogoSvg.style.stroke = '#000000';
                    }
                } else {
                    console.error("Cloned content #bill-to-print not found in onclone");
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 200 || imgData === 'data:,') {
             console.error("Generated canvas image is too small or empty. Length:", imgData.length);
             alert("Error: Failed to capture bill content for PDF. The generated image was empty. This might be due to content visibility issues.");
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
        
        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            console.error("Canvas image properties report zero width or height.");
            alert("Error: Captured image for PDF has no dimensions.");
            setIsGeneratingPdf(false);
            return;
        }

        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;

        let ratio = Math.min(availableWidth / canvasImgWidth, availableHeight / canvasImgHeight);
        
        const finalPdfImgWidth = canvasImgWidth * ratio;
        const finalPdfImgHeight = canvasImgHeight * ratio;

        const x = margin + (availableWidth - finalPdfImgWidth) / 2;
        const y = margin + (availableHeight - finalPdfImgHeight) / 2;
        
        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            console.error("Calculated PDF image dimensions are invalid (<=0). Width:", finalPdfImgWidth, "Height:", finalPdfImgHeight);
            alert("Error: Calculated PDF dimensions are invalid.");
            setIsGeneratingPdf(false);
            return;
        }

        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        pdf.output('dataurlnewwindow');

    } catch (error) {
        console.error("Error generating PDF with html2canvas and jspdf:", error);
        alert(`An error occurred while generating the PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsGeneratingPdf(false);
    }
};


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
      <Building className="w-8 h-8 text-muted-foreground" />
    </div>
  );

  const showItemLevelGstColumns = bill.type === 'sales-bill' && !isEstimateView;
  const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="print-hidden">
          <DialogTitle className="font-headline text-2xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription>
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1"> 
          <div id="bill-to-print" className="p-6 border rounded-lg bg-card shadow-sm text-foreground">
            <style jsx global>{`
                body.print-capture-active #bill-to-print {
                    // Styles to ensure #bill-to-print is fully visible and sized correctly for capture
                    // This might not be needed if onclone handles it well
                }
                @media print {
                    body, html {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'PT Sans', Arial, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body > *:not(#bill-to-print-wrapper):not(#bill-to-print-wrapper *) {
                         display: none !important; 
                    }
                    #bill-to-print-wrapper, #bill-to-print {
                        display: block !important;
                    }

                    #bill-to-print {
                        margin: 0 !important;
                        padding: 15mm !important; 
                        border: none !important;
                        box-shadow: none !important;
                        width: 100% !important; 
                        min-height: auto !important; 
                        box-sizing: border-box !important;
                        color: #000000 !important;
                        background-color: #ffffff !important;
                        position: static !important;
                        transform: none !important;
                        left: auto !important;
                        top: auto !important;

                    }
                    #bill-to-print * {
                        color: #000000 !important;
                        background-color: transparent !important;
                        border-color: #cccccc !important; 
                        box-shadow: none !important;
                        text-shadow: none !important;
                        print-color-adjust: exact !important;
                    }
                    #bill-to-print .flex { display: flex !important; }
                    #bill-to-print .grid { display: grid !important; }
                    #bill-to-print .justify-between { justify-content: space-between !important; }
                    #bill-to-print .items-start { align-items: flex-start !important; }
                    #bill-to-print .text-left { text-align: left !important; }
                    #bill-to-print .text-right { text-align: right !important; }
                    #bill-to-print .text-center { text-align: center !important; }
                    #bill-to-print .font-headline { font-family: 'Playfair Display', serif !important; }

                    #bill-to-print header, 
                    #bill-to-print .grid.grid-cols-2,
                    #bill-to-print .grid.grid-cols-5 {
                         width: 100% !important; 
                    }
                    #bill-to-print .grid.grid-cols-2 > div:first-child,
                    #bill-to-print .grid.grid-cols-5 > .col-span-3 {
                        width: 60% !important; /* Adjust as needed */
                        padding-right: 10px !important;
                    }
                     #bill-to-print .grid.grid-cols-2 > div:last-child,
                    #bill-to-print .grid.grid-cols-5 > .col-span-2 {
                        width: 38% !important; /* Adjust as needed */
                    }


                    #bill-to-print a {
                        text-decoration: none !important;
                    }
                    #bill-to-print table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-bottom: 1rem !important;
                    }
                    #bill-to-print th, #bill-to-print td {
                        border: 1px solid #cccccc !important;
                        padding: 4px 6px !important;
                        text-align: left !important;
                        font-size: 9pt !important;
                    }
                    #bill-to-print th {
                        background-color: #f0f0f0 !important; 
                        font-weight: bold !important;
                    }
                    #bill-to-print .print-logo {
                        max-width: 60px !important; 
                        max-height: 30px !important;
                        object-fit: contain !important;
                        filter: grayscale(100%) contrast(150%) !important;
                    }
                    #bill-to-print .print-placeholder-logo svg {
                        fill: #000000 !important;
                        stroke: #000000 !important;
                        width: 30px !important;
                        height: 30px !important;
                    }
                    #bill-to-print .print-placeholder-logo {
                         border: 1px solid #000000 !important;
                         width: auto !important; height: auto !important; padding: 5px !important;
                    }
                    #bill-to-print hr, #bill-to-print [role="separator"] {
                        border-top: 1px solid #cccccc !important;
                        background-color: #cccccc !important;
                        height: 1px !important;
                        margin: 0.5rem 0 !important;
                    }
                    .print-hidden { display: none !important; }
                    @page {
                        size: A4 portrait;
                        margin: 10mm;
                    }
                }
            `}</style>
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
                    <th className="py-2 px-1 text-right font-semibold border border-border">
                        Rate / {isEstimateView && bill.items.length > 0 ? bill.items[0].unit : isEstimateView ? 'unit' : 'unit'}
                    </th>
                    {showMakingChargeColumn && <th className="py-2 px-1 text-right font-semibold border border-border">Making</th>}
                    {!isEstimateView && <th className="py-2 px-1 text-right font-semibold border border-border">Taxable Amt</th>}
                    {showItemLevelGstColumns && (
                        <>
                            <th className="py-2 px-1 text-right font-semibold border border-border">CGST ({settings.cgstRate}%)</th>
                            <th className="py-2 px-1 text-right font-semibold border border-border">SGST ({settings.sgstRate}%)</th>
                        </>
                    )}
                    <th className="py-2 px-1 text-right font-semibold border border-border">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    const effectiveRate = getEffectiveRateForItem(item);
                    const taxableAmount = item.amount; 
                    
                    let itemCgst = 0;
                    let itemSgst = 0;
                    let lineTotal = taxableAmount;

                    if (showItemLevelGstColumns) { 
                        itemCgst = item.itemCgstAmount || 0;
                        itemSgst = item.itemSgstAmount || 0;
                        lineTotal = taxableAmount + itemCgst + itemSgst;
                    }


                    return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="py-2 px-1 border border-border">{index + 1}</td>
                      <td className="py-2 px-1 border border-border">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2 px-1 text-right border border-border">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right border border-border">{effectiveRate.toFixed(2)}</td>
                      {showMakingChargeColumn && (
                        <td className="py-2 px-1 text-right border border-border">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      {!isEstimateView && <td className="py-2 px-1 text-right border border-border">{taxableAmount.toFixed(2)}</td>}
                      {showItemLevelGstColumns && (
                        <>
                            <td className="py-2 px-1 text-right border border-border">{itemCgst.toFixed(2)}</td>
                            <td className="py-2 px-1 text-right border border-border">{itemSgst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-2 px-1 text-right font-medium border border-border">{lineTotal.toFixed(2)}</td>
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
                <p>Subtotal {!isEstimateView && '(Taxable)'}: <span className="font-semibold">{bill.subTotal.toFixed(2)}</span></p>

                {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold">{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold">{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                
                {isEstimateView && <p className="text-xs text-muted-foreground">(GST not applicable for estimates)</p>}

                <Separator className="my-1"/>
                <p className="text-lg font-bold">Total: <span className="text-primary">{bill.totalAmount.toFixed(2)}</span></p>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground">
              Thank you for your business!
              <p className="mt-4">--- {company.companyName} ---</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto print-hidden">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4"/>
            )}
            Generate &amp; View PDF
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf}>Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;
    

    