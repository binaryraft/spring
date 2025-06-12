
"use client";
import React, { useState, useRef } from 'react';
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
  const billContentRef = useRef<HTMLDivElement>(null); // Ref for the original bill content placeholder

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
      alert("Error: Bill content element (#bill-to-print) not found. PDF generation aborted.");
      setIsGeneratingPdf(false);
      return;
    }

    const originalParent = billContentElement.parentNode;
    const originalNextSibling = billContentElement.nextSibling;

    const captureWrapper = document.createElement('div');
    captureWrapper.id = 'pdf-capture-wrapper';
    Object.assign(captureWrapper.style, {
      position: 'absolute',
      left: '-9999px', // Position off-screen
      top: '-9999px',   // Position off-screen
      zIndex: '-1',     // Ensure it's not interactive
      width: '794px', // A4-like width for consistent capture base (approx 210mm at 96dpi)
      backgroundColor: 'white', // Should be overridden by #bill-to-print styles
      // border: '1px dashed #ccc' // For debugging visibility if left/top are 0px
    });
    document.body.appendChild(captureWrapper);
    captureWrapper.appendChild(billContentElement);
    document.body.classList.add('print-capture-active');
    
    // Give the browser a moment to apply styles and render the element in its new (hidden) location
    await new Promise(resolve => setTimeout(resolve, 300));


    if (billContentElement.offsetWidth === 0 || billContentElement.offsetHeight === 0) {
        alert(`Error: Bill content element for PDF capture has no dimensions (W: ${billContentElement.offsetWidth}, H: ${billContentElement.offsetHeight}). PDF generation aborted. The capture wrapper will remain for inspection if not hidden.`);
        // Potentially don't restore here to allow inspection if wrapper is off-screen.
        setIsGeneratingPdf(false);
        if (captureWrapper.parentNode === document.body && (captureWrapper.style.left !== '-9999px')) {
          // Only remove if it was made visible for debug
        } else if (captureWrapper.parentNode === document.body) {
            document.body.removeChild(captureWrapper);
        }
        document.body.classList.remove('print-capture-active');
        // Attempt to restore the original element even on error
        if (originalParent && billContentElement.parentNode === captureWrapper) {
            if (originalNextSibling) {
                originalParent.insertBefore(billContentElement, originalNextSibling);
            } else {
                originalParent.appendChild(billContentElement);
            }
        }
        return;
    }

    try {
        const canvas = await html2canvas(billContentElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: true, // Keep for diagnostics
            backgroundColor: "#ffffff", // Canvas background
            width: billContentElement.offsetWidth, // Capture based on styled width
            height: billContentElement.offsetHeight, // Capture based on styled height
            scrollX: 0,
            scrollY: 0,
            windowWidth: billContentElement.scrollWidth,
            windowHeight: billContentElement.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 250 || imgData === 'data:,') {
             alert("Error: Failed to capture bill content for PDF. The generated image was empty or too small. The capture wrapper (if not hidden) may show the problematic element.");
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
        const margin = 10; // mm

        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            alert("Error: Captured image for PDF has no dimensions according to PDF library.");
            setIsGeneratingPdf(false);
            return;
        }

        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;
        let ratio = Math.min(availableWidth / canvasImgWidth, availableHeight / canvasImgHeight);
        const finalPdfImgWidth = canvasImgWidth * ratio;
        const finalPdfImgHeight = canvasImgHeight * ratio;

        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            alert("Error: Calculated PDF dimensions are invalid (<=0).");
            setIsGeneratingPdf(false);
            return;
        }

        const x = margin + (availableWidth - finalPdfImgWidth) / 2; 
        const y = margin + (availableHeight - finalPdfImgHeight) / 2; 
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        
        const dateStr = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        const fileName = `${effectiveBillType.replace(/\s+/g, '-')}-${bill.billNumber || 'Estimate'}-${dateStr}.pdf`;
        pdf.save(fileName);

    } catch (error) {
        console.error("Error generating PDF with html2canvas and jspdf:", error);
        alert(`An error occurred while generating the PDF: ${error instanceof Error ? error.message : String(error)}. Check console for details.`);
    } finally {
        // Restore #bill-to-print to its original position
        if (originalParent && billContentElement.parentNode === captureWrapper) {
            if (originalNextSibling) {
                originalParent.insertBefore(billContentElement, originalNextSibling);
            } else {
                originalParent.appendChild(billContentElement);
            }
        }
         if (captureWrapper.parentNode === document.body) {
           document.body.removeChild(captureWrapper);
        }
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
          <div id="bill-content-placeholder" ref={billContentRef}>
            {/* This div will be the original parent for #bill-to-print */}
            <div id="bill-to-print" className="bg-card text-foreground">
            <style jsx global>{`
                body.print-capture-active {
                    background: white !important; 
                }
                /* Styles for PDF capture via html2canvas */
                body.print-capture-active #bill-to-print,
                @media print {
                    #bill-to-print {
                        width: 100% !important; /* Takes width from captureWrapper or page */
                        padding: 20px !important; /* Internal padding */
                        margin: 0 auto !important;
                        box-sizing: border-box !important;
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-family: 'PT Sans', Arial, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        border: none !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                        transform: none !important;
                    }

                    #bill-to-print *,
                    body.print-capture-active #bill-to-print * { 
                        color: #000000 !important;
                        background-color: transparent !important;
                        border-color: #333333 !important; /* Darker borders for B&W */
                        box-shadow: none !important;
                        text-shadow: none !important;
                    }

                    /* Hide non-essential elements for capture/print */
                    body.print-capture-active .print-hidden,
                    @media print .print-hidden {
                        display: none !important;
                    }
                    body.print-capture-active [role="dialog"] > button[class*="absolute"],
                    @media print [role="dialog"] > button[class*="absolute"] { 
                        display: none !important;
                    }
                     @media print {
                        body > *:not(#pdf-capture-wrapper):not(#pdf-capture-wrapper *):not(#bill-to-print-wrapper):not(#bill-to-print-wrapper *) {
                           display: none !important; 
                        }
                    }

                    /* Centered Company Header */
                    body.print-capture-active #bill-to-print .bill-company-header,
                    @media print #bill-to-print .bill-company-header {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        margin-bottom: 20px !important;
                    }
                    body.print-capture-active #bill-to-print .bill-company-header h1,
                    @media print #bill-to-print .bill-company-header h1 {
                        font-family: 'Playfair Display', serif !important;
                        font-size: 20pt !important;
                        margin-bottom: 2px !important;
                    }
                     body.print-capture-active #bill-to-print .bill-company-header p,
                    @media print #bill-to-print .bill-company-header p {
                        font-size: 9pt !important;
                        line-height: 1.3 !important;
                        margin-bottom: 1px !important;
                    }
                    body.print-capture-active #bill-to-print .company-logo-container,
                    @media print #bill-to-print .company-logo-container {
                        margin-top: 5px !important;
                        width: auto !important; /* Let image size dictate, or set fixed size */
                        max-width: 100px !important; /* Example max width */
                        max-height: 50px !important; /* Example max height */
                    }
                     body.print-capture-active #bill-to-print .print-logo,
                    @media print #bill-to-print .print-logo {
                        max-width: 100% !important; 
                        max-height: 100% !important; 
                        object-fit: contain !important;
                        filter: grayscale(100%) contrast(120%) !important;
                    }
                    body.print-capture-active #bill-to-print .print-placeholder-logo,
                    @media print #bill-to-print .print-placeholder-logo {
                         border: 1px solid #000000 !important;
                         background-color: #f0f0f0 !important;
                         width: 80px !important; height: 40px !important; padding: 2px !important;
                         display: flex !important; align-items: center !important; justify-content: center !important;
                    }
                     body.print-capture-active #bill-to-print .print-placeholder-logo svg,
                    @media print #bill-to-print .print-placeholder-logo svg {
                        fill: #000000 !important; stroke: #000000 !important;
                        width: 24px !important; height: 24px !important;
                    }
                    
                    /* Invoice Type Heading */
                    body.print-capture-active #bill-to-print .bill-type-heading,
                    @media print #bill-to-print .bill-type-heading {
                        font-family: 'Playfair Display', serif !important;
                        font-size: 16pt !important;
                        text-align: center !important;
                        margin-top: 10px !important;
                        margin-bottom: 15px !important;
                        font-weight: bold !important;
                    }

                    /* Bill Meta (Customer/Invoice Details) */
                    body.print-capture-active #bill-to-print .bill-meta-grid,
                    @media print #bill-to-print .bill-meta-grid {
                        display: flex !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        margin-bottom: 15px !important;
                        font-size: 9pt !important;
                    }
                    body.print-capture-active #bill-to-print .bill-details-column, /* Left */
                    @media print #bill-to-print .bill-details-column {
                        width: 48% !important;
                        text-align: left !important;
                    }
                    body.print-capture-active #bill-to-print .customer-details-column, /* Right */
                    @media print #bill-to-print .customer-details-column {
                        width: 48% !important;
                        text-align: right !important;
                    }
                    body.print-capture-active #bill-to-print .bill-meta-grid h3,
                    @media print #bill-to-print .bill-meta-grid h3 {
                        font-size: 10pt !important;
                        font-weight: bold !important;
                        margin-bottom: 3px !important;
                    }

                    /* Table Styling */
                    body.print-capture-active #bill-to-print table,
                    @media print #bill-to-print table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 0 !important;
                        margin-bottom: 15px !important;
                    }
                    body.print-capture-active #bill-to-print th,
                    @media print #bill-to-print th,
                    body.print-capture-active #bill-to-print td,
                    @media print #bill-to-print td {
                        border: 1px solid #333333 !important; 
                        padding: 5px 7px !important;
                        text-align: left !important;
                        font-size: 9pt !important;
                        vertical-align: top !important;
                    }
                    body.print-capture-active #bill-to-print th,
                    @media print #bill-to-print th {
                        background-color: #e0e0e0 !important; 
                        font-weight: bold !important;
                    }
                    body.print-capture-active #bill-to-print .text-right,
                    @media print #bill-to-print .text-right { text-align: right !important; }
                    body.print-capture-active #bill-to-print .text-center,
                    @media print #bill-to-print .text-center { text-align: center !important; }
                    body.print-capture-active #bill-to-print .font-semibold, 
                    @media print #bill-to-print .font-semibold { font-weight: 600 !important; }
                    body.print-capture-active #bill-to-print .font-bold, 
                    @media print #bill-to-print .font-bold { font-weight: 700 !important; }

                    /* Summary section (Notes and Totals) */
                     body.print-capture-active #bill-to-print .bill-summary-grid,
                    @media print #bill-to-print .bill-summary-grid {
                        display: flex !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        margin-top: 15px !important;
                        font-size: 9pt !important;
                    }
                    body.print-capture-active #bill-to-print .notes-column,
                    @media print #bill-to-print .notes-column {
                        width: 58% !important; /* Adjust as needed */
                        text-align: left !important;
                    }
                    body.print-capture-active #bill-to-print .notes-column h4,
                    @media print #bill-to-print .notes-column h4 {
                        font-weight: bold !important;
                        margin-bottom: 3px !important;
                        font-size: 10pt !important;
                    }
                    body.print-capture-active #bill-to-print .notes-column p,
                    @media print #bill-to-print .notes-column p {
                        white-space: pre-line !important;
                    }
                    body.print-capture-active #bill-to-print .totals-column,
                    @media print #bill-to-print .totals-column {
                        width: 40% !important; /* Adjust as needed */
                        text-align: right !important;
                    }
                    body.print-capture-active #bill-to-print .totals-column p,
                    @media print #bill-to-print .totals-column p {
                         margin-bottom: 2px !important;
                    }
                     body.print-capture-active #bill-to-print .totals-column .total-line,
                    @media print #bill-to-print .totals-column .total-line {
                        font-size: 11pt !important;
                        font-weight: bold !important;
                        margin-top: 5px !important;
                    }
                     body.print-capture-active #bill-to-print .totals-column .total-line .currency-symbol,
                    @media print #bill-to-print .totals-column .total-line .currency-symbol {
                        /* Style for Rupee symbol if needed, e.g., font */
                    }


                    /* Footer */
                    body.print-capture-active #bill-to-print .bill-footer,
                    @media print #bill-to-print .bill-footer {
                        text-align: center !important;
                        margin-top: 25px !important;
                        padding-top: 10px !important;
                        border-top: 1px solid #666666 !important;
                        font-size: 8pt !important;
                    }
                     body.print-capture-active #bill-to-print hr, body.print-capture-active #bill-to-print [role="separator"], 
                    @media print #bill-to-print hr, @media print #bill-to-print [role="separator"] {
                        border-top: 1px solid #888888 !important;
                        background-color: #888888 !important; 
                        height: 1px !important;
                        margin: 0.4rem 0 !important;
                    }
                }
                 @media print { 
                    @page {
                        size: A4 portrait;
                        margin: 0mm; /* Margins handled by #bill-to-print padding */
                    }
                }
            `}</style>

            <div className="bill-company-header">
                <h1>{company.companyName}</h1>
                {company.slogan && <p>{company.slogan}</p>}
                <p>{company.address}</p>
                <p>Phone: {company.phoneNumber}</p>
                {company.showCompanyLogo && (
                    <div className="company-logo-container">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={80} height={40} className="print-logo" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                )}
            </div>

            <h2 className="bill-type-heading">{effectiveBillType.toUpperCase()}</h2>
            
            <Separator className="my-2"/>

            <div className="bill-meta-grid">
                <div className="bill-details-column"> {/* Left Column */}
                    <h3>Details:</h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
                <div className="customer-details-column"> {/* Right Column */}
                    <h3>
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p>{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs">Phone: {bill.customerPhone}</p>}
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
                        Rate {isEstimateView && bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : (isEstimateView ? '/ unit' : (bill.items[0]?.unit ? `/ ${bill.items[0].unit}` : '/ unit'))}
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
            
            <Separator className="my-2"/>

            <div className="bill-summary-grid">
                <div className="notes-column">
                    {bill.notes && (
                    <>
                        <h4>Notes:</h4>
                        <p>{bill.notes}</p>
                    </>
                    )}
                </div>
                <div className="totals-column">
                    <p>Subtotal {(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span className="font-semibold"><span className="currency-symbol">₹</span>{bill.subTotal.toFixed(2)}</span></p>

                    {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold"><span className="currency-symbol">₹</span>{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold"><span className="currency-symbol">₹</span>{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                    
                    {isEstimateView && <p className="text-xs text-muted-foreground">(GST not applicable for estimates)</p>}

                    <Separator className="my-1"/>
                    <p className="total-line">Total: <span className="font-bold text-lg"><span className="currency-symbol">₹</span>{bill.totalAmount.toFixed(2)}</span></p>
                </div>
            </div>

            <div className="bill-footer">
              <p>Thank you for your business!</p>
              <p>--- {company.companyName} ---</p>
            </div>
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
            Generate &amp; Download PDF
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf}>Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;
    

