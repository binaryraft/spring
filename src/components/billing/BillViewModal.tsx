
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
    
    document.body.classList.add('print-capture-active');
    
    // Ensure styles are applied and layout is stable
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 300)); // Slightly increased delay

    if (billContentElement.scrollWidth === 0 || billContentElement.scrollHeight === 0) {
        console.error('Bill content element has no dimensions for capture. Width:', billContentElement.scrollWidth, 'Height:', billContentElement.scrollHeight);
        alert("Error: Bill content not rendered with dimensions. PDF generation aborted.");
        document.body.classList.remove('print-capture-active');
        setIsGeneratingPdf(false);
        return;
    }

    try {
        console.log(`Attempting to capture element: #bill-to-print. Element OffsetWidth: ${billContentElement.offsetWidth}, OffsetHeight: ${billContentElement.offsetHeight}, ScrollWidth: ${billContentElement.scrollWidth}, ScrollHeight: ${billContentElement.scrollHeight}`);
        
        const canvas = await html2canvas(billContentElement, {
            scale: 2, 
            useCORS: true,
            logging: true, 
            backgroundColor: "#ffffff", // Ensure canvas background is white
            // Let html2canvas derive width/height from the element's computed styles
        });

        const imgData = canvas.toDataURL('image/png');
        console.log('Canvas toDataURL length:', imgData.length);

        if (imgData.length < 200 || imgData === 'data:,') { 
             console.error("Generated canvas image is too small or empty. Data (first 100 chars):", imgData.substring(0,100));
             alert("Error: Failed to capture bill content for PDF. The generated image was empty or too small. Check console for details.");
             setIsGeneratingPdf(false);
             document.body.classList.remove('print-capture-active');
             return;
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10; // mm

        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        console.log('Captured image properties from PDF lib: Width:', canvasImgWidth, 'Height:', canvasImgHeight);

        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            console.error("Canvas image properties (from PDF lib) report zero width or height.");
            alert("Error: Captured image for PDF has no dimensions according to PDF library.");
            setIsGeneratingPdf(false);
            document.body.classList.remove('print-capture-active');
            return;
        }

        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;

        let ratio = Math.min(availableWidth / canvasImgWidth, availableHeight / canvasImgHeight);
        
        const finalPdfImgWidth = canvasImgWidth * ratio;
        const finalPdfImgHeight = canvasImgHeight * ratio;

        console.log('Final PDF image dimensions: Width:', finalPdfImgWidth, 'Height:', finalPdfImgHeight);
        
        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            console.error("Calculated PDF image dimensions are invalid (<=0). Width:", finalPdfImgWidth, "Height:", finalPdfImgHeight);
            alert("Error: Calculated PDF dimensions are invalid.");
            setIsGeneratingPdf(false);
            document.body.classList.remove('print-capture-active');
            return;
        }

        const x = margin + (availableWidth - finalPdfImgWidth) / 2; 
        const y = margin + (availableHeight - finalPdfImgHeight) / 2; 
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        pdf.output('dataurlnewwindow');

    } catch (error) {
        console.error("Error generating PDF with html2canvas and jspdf:", error);
        alert(`An error occurred while generating the PDF: ${error instanceof Error ? error.message : String(error)}. Check console for details.`);
    } finally {
        document.body.classList.remove('print-capture-active');
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
          <div id="bill-to-print" className="bg-card text-foreground"> {/* Removed border, shadow, rounded for capture */}
           <style jsx global>{`
                /* Styles applied when body.print-capture-active is present for html2canvas */
                body.print-capture-active {
                    background: white !important; /* Ensure body background is white for capture */
                }
                body.print-capture-active #bill-to-print {
                    background-color: #ffffff !important;
                    padding: 0 !important; /* NO PADDING for the capture element itself */
                    margin: 0 auto !important; /* Centering if a fixed width is used */
                    border: none !important;
                    box-shadow: none !important;
                    width: 780px !important; /* A4-like width for html2canvas rendering consistency */
                    /* height: auto; /* Let content determine height */
                    box-sizing: border-box !important;
                    overflow: visible !important;
                }

                /* Hide elements not part of the bill during capture */
                body.print-capture-active .print-hidden {
                    display: none !important;
                }
                 body.print-capture-active [role="dialog"] > button[class*="absolute"] { /* ShadCN Dialog Close button */
                    display: none !important;
                }


                /* Common styles for both actual print and html2canvas capture (triggered by body.print-capture-active) */
                @media print, body.print-capture-active {
                    html, body { 
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'PT Sans', Arial, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Actual print specific: Hide everything not part of the bill */
                    @media print {
                        body > *:not(#bill-to-print-wrapper):not(#bill-to-print-wrapper *) { /* This needs a wrapper if #bill-to-print is deep */
                            display: none !important; 
                        }
                         /* Hide Radix Dialog's default close X button for actual print */
                        [role="dialog"] > button[class*="absolute"][class*="right-4"][class*="top-4"] {
                           display: none !important;
                        }
                    }
                    
                    /* Ensure the #bill-to-print element itself is styled for print/capture */
                    /* Styles for #bill-to-print when @media print (browser printing) */
                    @media print {
                      #bill-to-print {
                        padding: 15mm !important; /* Page margins for browser printing */
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        width: auto !important; /* Browser print handles width */
                        background-color: #ffffff !important;
                      }
                    }
                   
                    #bill-to-print *,
                    body.print-capture-active #bill-to-print * { 
                        color: #000000 !important;
                        background-color: transparent !important;
                        border-color: #cccccc !important; 
                        box-shadow: none !important;
                        text-shadow: none !important;
                        print-color-adjust: exact !important;
                    }

                    #bill-to-print header, 
                    body.print-capture-active #bill-to-print header,
                    #bill-to-print .bill-section-grid,
                    body.print-capture-active #bill-to-print .bill-section-grid {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: flex-start !important;
                        width: 100% !important; 
                    }
                    
                    #bill-to-print .company-details, body.print-capture-active #bill-to-print .company-details { width: 60% !important; }
                    #bill-to-print .company-logo-container, body.print-capture-active #bill-to-print .company-logo-container { width: auto !important; flex-shrink: 0 !important; }

                    #bill-to-print .customer-details-column, body.print-capture-active #bill-to-print .customer-details-column,
                    #bill-to-print .bill-details-column, body.print-capture-active #bill-to-print .bill-details-column {
                        width: 48% !important; 
                    }
                     #bill-to-print .bill-details-column, body.print-capture-active #bill-to-print .bill-details-column { text-align: right !important; }


                    #bill-to-print h1, body.print-capture-active #bill-to-print h1 { font-family: 'Playfair Display', serif !important; font-size: 22pt !important; margin-bottom: 4px !important; }
                    #bill-to-print h2, body.print-capture-active #bill-to-print h2 { font-family: 'Playfair Display', serif !important; font-size: 14pt !important; margin-top: 8px !important; margin-bottom: 8px !important; }
                    #bill-to-print p, #bill-to-print td, #bill-to-print th, 
                    body.print-capture-active #bill-to-print p, 
                    body.print-capture-active #bill-to-print td, 
                    body.print-capture-active #bill-to-print th { font-size: 9pt !important; line-height: 1.3 !important; }
                    
                    #bill-to-print table, body.print-capture-active #bill-to-print table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 0.8rem !important;
                        margin-bottom: 0.8rem !important;
                    }
                    #bill-to-print th, body.print-capture-active #bill-to-print th,
                    #bill-to-print td, body.print-capture-active #bill-to-print td {
                        border: 1px solid #b0b0b0 !important; /* Slightly darker for clarity */
                        padding: 3px 5px !important;
                        text-align: left !important;
                    }
                    #bill-to-print th, body.print-capture-active #bill-to-print th {
                        background-color: #eeeeee !important; 
                        font-weight: bold !important;
                    }
                    #bill-to-print .text-right, body.print-capture-active #bill-to-print .text-right { text-align: right !important; }
                    #bill-to-print .text-center, body.print-capture-active #bill-to-print .text-center { text-align: center !important; }
                    #bill-to-print .font-semibold, body.print-capture-active #bill-to-print .font-semibold { font-weight: 600 !important; }
                    #bill-to-print .font-bold, body.print-capture-active #bill-to-print .font-bold { font-weight: 700 !important; }

                    #bill-to-print .print-logo, body.print-capture-active #bill-to-print .print-logo {
                        max-width: 50px !important; 
                        max-height: 25px !important; /* Adjusted for smaller print */
                        object-fit: contain !important;
                        filter: grayscale(100%) contrast(150%) !important;
                    }
                    #bill-to-print .print-placeholder-logo, body.print-capture-active #bill-to-print .print-placeholder-logo {
                         border: 1px solid #000000 !important;
                         background-color: #f0f0f0 !important;
                         width: 50px !important; height: 25px !important; padding: 2px !important;
                         display: flex !important; align-items: center !important; justify-content: center !important;
                    }
                     #bill-to-print .print-placeholder-logo svg, body.print-capture-active #bill-to-print .print-placeholder-logo svg {
                        fill: #000000 !important;
                        stroke: #000000 !important;
                        width: 20px !important; /* Adjusted for smaller placeholder */
                        height: 20px !important;
                    }

                    #bill-to-print hr, #bill-to-print [role="separator"], 
                    body.print-capture-active #bill-to-print hr, 
                    body.print-capture-active #bill-to-print [role="separator"] {
                        border-top: 1px solid #b0b0b0 !important;
                        background-color: #b0b0b0 !important; 
                        height: 1px !important;
                        margin: 0.4rem 0 !important;
                    }
                }

                @media print { /* @page is only for actual browser printing */
                    @page {
                        size: A4 portrait;
                        margin: 10mm; /* Browser print margins */
                    }
                }
            `}</style>
            {/* Assign classes to top-level flex containers for easier targeting in print CSS */}
            <header className="mb-6 bill-section-grid">
              <div className="text-left company-details">
                  <h1 className="text-primary">{company.companyName}</h1> {/* Tailwind class for screen, print CSS overrides */}
                  {company.slogan && <p className="text-muted-foreground">{company.slogan}</p>}
                  <p className="text-xs">{company.address}</p>
                  <p className="text-xs">Phone: {company.phoneNumber}</p>
              </div>
              {company.showCompanyLogo && (
                <div className="w-20 h-20 flex-shrink-0 company-logo-container">
                    {company.companyLogo ? (
                        <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={80} height={80} className="object-contain print-logo" />
                    ) : (
                        <PlaceholderLogo />
                    )}
                </div>
              )}
            </header>
            <h2 className="text-accent text-center">{effectiveBillType.toUpperCase()}</h2> {/* Tailwind class for screen, print CSS overrides */}

            <Separator className="my-4"/>

             <div className="bill-section-grid gap-4 mb-4 text-sm">
                <div className="customer-details-column">
                    <h3 className="font-semibold mb-1">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p>{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs">Phone: {bill.customerPhone}</p>}
                </div>
                <div className="bill-details-column">
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
                        Rate {isEstimateView && bill.items.length > 0 ? `/ ${bill.items[0].unit}` : isEstimateView ? '/ unit' : '/ unit'}
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

             {/* Assign bill-section-grid for notes/totals too */}
            <div className="bill-section-grid gap-x-4 mt-4">
              <div className="col-span-3 customer-details-column"> 
                {bill.notes && (
                  <>
                    <h4 className="font-semibold text-xs mb-1">Notes:</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{bill.notes}</p>
                  </>
                )}
              </div>
              <div className="col-span-2 text-sm space-y-1 text-right bill-details-column"> 
                <p>Subtotal {!isEstimateView && bill.type === 'sales-bill' ? '(Taxable Value)' : ''}: <span className="font-semibold">{bill.subTotal.toFixed(2)}</span></p>

                {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold">{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold">{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                
                {isEstimateView && <p className="text-xs text-muted-foreground">(GST not applicable for estimates)</p>}

                <Separator className="my-1"/>
                <p className="text-lg font-bold">Total: <span className="text-primary">{bill.totalAmount.toFixed(2)}</span></p> {/* Tailwind class for screen, print CSS overrides */}
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
    
