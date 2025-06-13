
"use client";
import React, { useState, useRef, useEffect } from 'react';
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
import { format } from 'date-fns';
import { Printer, Loader2, Building } from 'lucide-react';
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
  
  const billContentRef = useRef<HTMLDivElement>(null); 
  const billOriginalParentRef = useRef<HTMLElement | null>(null);
  const billPlaceholderRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isOpen && billContentRef.current) {
        if (!billOriginalParentRef.current && billContentRef.current.parentElement) {
            billOriginalParentRef.current = billContentRef.current.parentElement;
        }
    } else if (!isOpen && billContentRef.current && billPlaceholderRef.current && billOriginalParentRef.current) {
        // Ensure we only attempt to move if it's not already in the original parent
        if (!billOriginalParentRef.current.contains(billContentRef.current)) {
            billOriginalParentRef.current.replaceChild(billContentRef.current, billPlaceholderRef.current);
        }
    }
  }, [isOpen]);


  if (!bill) return null;

  const company = settings;
  const currency = settings.currencySymbol;

  let effectiveBillType = '';
  if (isEstimateView) {
    effectiveBillType = 'Estimate';
  } else {
    effectiveBillType = bill.type === 'purchase' ? 'Purchase Invoice' : 'Sales Invoice';
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
                return item.rate || 0; // Fallback for old data or unexpected type
        }
    }
    return item.rate || 0; // For sales bills
  };

  const generatePdfHtml = (): string => {
    const logoHtml = company.showCompanyLogo 
      ? company.companyLogo 
        ? `<img src="${company.companyLogo}" alt="${company.companyName} Logo" style="max-width: 80px; max-height: 40px; object-fit: contain; margin-bottom: 6px;" />`
        : `<div style="width: 70px; height: 35px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; font-size: 8pt; color: #555;">Logo</div>`
      : '';
    
    const companyGstinDisplay = (!isEstimateView && bill.companyGstin) ? `<p style="font-size: 8pt; margin: 0 0 3px 0; color: #000000;">GSTIN: ${bill.companyGstin}</p>` : '';

    const itemsHtml = bill.items.map((item, index) => {
      const valuableDetails = getValuableById(item.valuableId);
      const effectiveRate = getEffectiveRateForItem(item);
      const taxableAmount = item.amount;
      let itemCgst = 0;
      let itemSgst = 0;
      let lineTotal = taxableAmount;

      const showHsnInPdf = bill.type === 'sales-bill' && !isEstimateView;
      const showItemGstCols = bill.type === 'sales-bill' && !isEstimateView;

      if (showItemGstCols) {
        itemCgst = item.itemCgstAmount || 0;
        itemSgst = item.itemSgstAmount || 0;
        lineTotal = taxableAmount + itemCgst + itemSgst;
      }

      return `
        <tr style="font-size: 8pt; page-break-inside: avoid;">
          <td style="border: 1px solid #333333; padding: 4px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #333333; padding: 4px;">${item.name} ${valuableDetails ? `(${valuableDetails.name})` : ''}</td>
          ${showHsnInPdf ? `<td style="border: 1px solid #333333; padding: 4px; text-align: center;">${item.hsnCode || '-'}</td>` : ''}
          <td style="border: 1px solid #333333; padding: 4px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          <td style="border: 1px solid #333333; padding: 4px; text-align: right;">${currency}${effectiveRate.toFixed(2)}</td>
          ${bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) ? `<td style="border: 1px solid #333333; padding: 4px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          ${showItemGstCols ? `<td style="border: 1px solid #333333; padding: 4px; text-align: right;">${currency}${taxableAmount.toFixed(2)}</td>` : ''}
          ${showItemGstCols ? `
            <td style="border: 1px solid #333333; padding: 4px; text-align: right;">${currency}${itemCgst.toFixed(2)}<br/><span style="font-size:6pt;">(${settings.cgstRate}%)</span></td>
            <td style="border: 1px solid #333333; padding: 4px; text-align: right;">${currency}${itemSgst.toFixed(2)}<br/><span style="font-size:6pt;">(${settings.sgstRate}%)</span></td>
          ` : ''}
          <td style="border: 1px solid #333333; padding: 4px; text-align: right; font-weight: bold;">${currency}${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const showMakingChargeColumnInPdf = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);
    const showItemTaxableColInPdf = bill.type === 'sales-bill' && !isEstimateView;
    const showItemGstColsInPdf = bill.type === 'sales-bill' && !isEstimateView;
    const showHsnColInPdfForHeader = bill.type === 'sales-bill' && !isEstimateView;


    let tableHeaders = `
      <th style="border: 1px solid #333333; padding: 5px; text-align: center; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">#</th>
      <th style="border: 1px solid #333333; padding: 5px; text-align: left; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">Item Description</th>
    `;
    if (showHsnColInPdfForHeader) tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: center; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">HSN</th>`;
    tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">Qty/Wt</th>`;
    tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">Rate / ${(bill.items[0]?.unit || 'unit')}</th>`;
    if (showMakingChargeColumnInPdf) tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">Making</th>`;
    if (showItemTaxableColInPdf) tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">Taxable Amt</th>`;
    if (showItemGstColsInPdf) {
      tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">CGST</th>`;
      tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">SGST</th>`;
    }
    tableHeaders += `<th style="border: 1px solid #333333; padding: 5px; text-align: right; font-weight: bold; background-color: #e0e0e0; font-size: 8pt;">Line Total</th>`;

    const billDateFormatted = format(new Date(bill.date), 'dd MMM, yyyy');
    const billNumberDisplay = bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A');
    const billTypeLabel = isEstimateView ? 'Estimate Ref:' : (bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:');
    const customerLabel = bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):';

    return `
    <div id="bill-content-for-pdf" style="font-family: 'PT Sans', Arial, sans-serif; color: #000000; width: 100%; max-width: 794px; margin: 0 auto; padding: 10px; background-color: #ffffff; border: 1px solid #ccc; box-sizing: border-box;">
        
        <div class="bill-company-header" style="text-align: center; margin-bottom: 15px;">
          ${logoHtml}
          <h1 style="font-family: 'Playfair Display', serif; font-size: 20pt; margin: 0 0 4px 0; color: #000000;">${company.companyName}</h1>
          ${company.slogan ? `<p style="font-size: 10pt; margin: 0 0 4px 0; color: #000000;">${company.slogan}</p>` : ''}
          <p style="font-size: 8pt; margin: 0 0 2px 0; color: #000000;">${company.address}</p>
          <p style="font-size: 8pt; margin: 0 0 2px 0; color: #000000;">Phone: ${company.phoneNumber}</p>
          ${companyGstinDisplay}
        </div>

        <h2 class="bill-type-heading" style="font-family: 'Playfair Display', serif; font-size: 16pt; text-align: center; margin: 15px 0; font-weight: bold; text-transform: uppercase; border-top: 1.5px solid #000000; border-bottom: 1.5px solid #000000; padding: 5px 0;">${effectiveBillType}</h2>
        
        <table class="bill-meta-grid" style="width: 100%; margin-bottom: 15px; font-size: 8pt;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 8px;">
              <h3 style="font-size: 10pt; font-weight: bold; margin-bottom: 5px;">Bill Details:</h3>
              <p style="margin: 3px 0;">${billTypeLabel} <span style="font-weight: 500;">${billNumberDisplay}</span></p>
              <p style="margin: 3px 0;">Date: <span style="font-weight: 500;">${billDateFormatted}</span></p>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top; padding-left: 8px;">
              <h3 style="font-size: 10pt; font-weight: bold; margin-bottom: 5px;">${customerLabel}</h3>
              <p style="margin: 3px 0; font-weight: bold;">${bill.customerName || 'N/A'}</p>
              ${bill.customerAddress ? `<p style="font-size: 8pt; margin: 3px 0;">${bill.customerAddress}</p>` : ''}
              ${bill.customerPhone ? `<p style="font-size: 8pt; margin: 3px 0;">Phone: ${bill.customerPhone}</p>` : ''}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 8pt;">
          <thead>
            <tr style="font-size: 8pt;">${tableHeaders}</tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #555555; margin: 15px 0;" />

        <table class="bill-summary-grid" style="width: 100%; margin-top: 15px; font-size: 9pt;">
          <tr>
            <td style="width: 60%; vertical-align: top; white-space: pre-line;">
              ${bill.notes ? `<h4 style="font-weight: bold; margin-bottom: 4px; font-size: 9pt;">Notes:</h4><p style="font-size:8pt;">${bill.notes}</p>` : ''}
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top; padding-left: 12px;">
              <p style="margin: 4px 0;">Subtotal ${(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span style="font-weight: bold;">${currency}${bill.subTotal.toFixed(2)}</span></p>
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 ? `<p style="margin: 4px 0;">Total CGST (${settings.cgstRate}%): <span style="font-weight: bold;">${currency}${(bill.cgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 ? `<p style="margin: 4px 0;">Total SGST (${settings.sgstRate}%): <span style="font-weight: bold;">${currency}${(bill.sgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${isEstimateView && bill.type === 'sales-bill' ? `<p style="font-size: 7pt; color: #333; margin: 4px 0;">(GST not applicable for estimates)</p>` : ''}
              <hr style="border: 0; border-top: 1px solid #555555; margin: 6px 0;" />
              <p style="font-size: 11pt; font-weight: bold; margin-top: 6px;">Total: <span style="font-weight: bold; font-size: 13pt;">${currency}${bill.totalAmount.toFixed(2)}</span></p>
            </td>
          </tr>
        </table>

        <div class="bill-footer" style="text-align: center; margin-top: 25px; padding-top: 12px; border-top: 1.5px solid #000000; font-size: 8pt;">
          <p>Thank you for your business!</p>
          <p style="margin-top: 5px;">--- ${company.companyName} ---</p>
        </div>
      </div>
    `;
  };


  const handleGeneratePdf = async () => {
    if (!bill) {
        alert("Error: Bill data is not available for PDF generation.");
        return;
    }
    setIsGeneratingPdf(true);

    const captureWrapper = document.createElement('div');
    captureWrapper.id = 'pdf-capture-wrapper';
    Object.assign(captureWrapper.style, {
        position: 'fixed',
        left: '-9999px', // Off-screen
        top: '-9999px',  // Off-screen
        width: '794px', // A4 width approx in pixels for 96 DPI
        backgroundColor: 'white',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        zIndex: '-1', // Ensure it's not visible but still renderable by the browser
    });

    const contentHost = document.createElement('div');
    contentHost.id = 'pdf-content-host';
    captureWrapper.appendChild(contentHost);
    document.body.appendChild(captureWrapper);
    document.body.classList.add('print-capture-active'); // For @media print styles if needed
    
    // Ensure original parent is captured if not already
    if (billContentRef.current && billContentRef.current.parentElement && !billOriginalParentRef.current) {
      billOriginalParentRef.current = billContentRef.current.parentElement;
      // Create placeholder if it doesn't exist to maintain layout
      if (billPlaceholderRef.current && billContentRef.current.parentNode) {
        billContentRef.current.parentNode.insertBefore(billPlaceholderRef.current, billContentRef.current);
      }
    }
    
    try {
        // Inject the generated HTML into the off-screen div
        contentHost.innerHTML = generatePdfHtml();
        
        // Target the specific inner div for capture
        const billContentElementForCapture = contentHost.querySelector<HTMLElement>('#bill-content-for-pdf');

        if (!billContentElementForCapture) {
            // This is a critical failure point
            alert("Critical Error: #bill-content-for-pdf element not found after injecting HTML for PDF. PDF generation aborted.");
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        // Brief delay for rendering, can be adjusted
        await new Promise(resolve => setTimeout(resolve, 300)); 

        // Sanity check: ensure the element has dimensions
        if (billContentElementForCapture.offsetWidth === 0 || billContentElementForCapture.offsetHeight === 0) {
            alert(`Error: PDF capture target (#bill-content-for-pdf) has no dimensions (W: ${billContentElementForCapture.offsetWidth}, H: ${billContentElementForCapture.offsetHeight}) after HTML injection. PDF generation aborted.`);
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        const canvas = await html2canvas(billContentElementForCapture, {
            scale: 2, // Increase for better quality
            useCORS: true,
            logging: true, // Enable html2canvas logging for debugging
            backgroundColor: "#ffffff", // Ensure background is white
            // Explicitly remove width/height to let html2canvas derive from element
        });

        const imgData = canvas.toDataURL('image/png');
        // More robust check for empty image data
        if (imgData.length < 250 || imgData === 'data:,') { 
             alert("Error: Failed to capture bill content into an image. Generated image was empty or too small. Please check the console for html2canvas errors.");
             if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
             document.body.classList.remove('print-capture-active');
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

        // Get image properties from jsPDF to ensure compatibility
        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            alert("Error: Captured image for PDF has no dimensions. Please check console for html2canvas errors.");
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        // Calculate width and height with respect to aspect ratio and page margins
        const availableWidth = pdfWidth - 2 * margin;
        let finalPdfImgHeight = (canvasImgHeight * availableWidth) / canvasImgWidth; // Maintain aspect ratio
        let finalPdfImgWidth = availableWidth;

        // If height is still too large for the page, then scale by height
        if (finalPdfImgHeight > (pdfHeight - 2 * margin)) { 
            finalPdfImgHeight = pdfHeight - 2 * margin;
            finalPdfImgWidth = (canvasImgWidth * finalPdfImgHeight) / canvasImgHeight; // Recalculate width to maintain aspect ratio
        }
        
        // Sanity check for calculated dimensions
        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            alert("Error: Calculated PDF image dimensions are invalid. Check image capture and scaling logic.");
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        // Center the image on the page
        const x = margin + (availableWidth - finalPdfImgWidth) / 2; 
        const y = margin; 
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        
        const dateStr = format(new Date(), 'yyyyMMdd_HHmmss');
        const fileNameBase = effectiveBillType.replace(/[\s/]+/g, '_'); // Sanitize type for filename
        const billNumPart = bill.billNumber ? `_${bill.billNumber.replace(/[\s/]+/g, '_')}` : (isEstimateView ? '_Estimate' : '_Bill');
        const fileName = `${fileNameBase}${billNumPart}_${dateStr}.pdf`;

        pdf.save(fileName);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert(`An error occurred during PDF generation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        // Cleanup: remove the temporary wrapper from the body
        if (captureWrapper.parentNode === document.body) {
           document.body.removeChild(captureWrapper);
        }
        document.body.classList.remove('print-capture-active');
        
        // Restore the original bill content to its place if it was moved
        if (billContentRef.current && billPlaceholderRef.current && billOriginalParentRef.current) {
          // Check if it's not already where it should be and placeholder is still there
          if (!billOriginalParentRef.current.contains(billContentRef.current) && billPlaceholderRef.current.parentNode === billOriginalParentRef.current) {
             billOriginalParentRef.current.replaceChild(billContentRef.current, billPlaceholderRef.current);
          }
        }
        setIsGeneratingPdf(false);
    }
};



  const PlaceholderLogo = () => (
    <div className="w-20 h-16 bg-muted/50 flex items-center justify-center rounded border text-muted-foreground text-base">
      <Building className="w-8 h-8" />
      <span className="ml-1.5">Logo</span>
    </div>
  );

  const showHsnColumnInModal = bill.type === 'sales-bill' && !isEstimateView;
  const showItemLevelGstColumns = bill.type === 'sales-bill' && !isEstimateView;
  const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] flex flex-col print-dialog-content text-base w-full max-w-screen-xl"> 
        <DialogHeader className="print-hidden pb-4 border-b">
          <DialogTitle className="font-headline text-2xl lg:text-3xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div ref={billPlaceholderRef} style={{ display: 'none' }} /> {/* Placeholder for original content position */}

        <div className="flex-grow overflow-y-auto p-0.5" > {/* Scrollable container for the bill content */}
            {/* This div is for display in modal. PDF is generated from HTML string. */}
            <div id="bill-to-print" ref={billContentRef} className="p-5 bg-card text-foreground rounded-lg shadow-sm text-base min-w-[780px] mx-auto"> 
            
            {/* Company Header */}
            <div className="bill-company-header text-center mb-8">
                {company.showCompanyLogo && (
                    <div className="mb-3 inline-block">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={150} height={75} className="object-contain mx-auto" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                )}
                <h1 className="text-3xl lg:text-4xl font-headline text-primary">{company.companyName}</h1>
                {company.slogan && <p className="text-xl text-muted-foreground mt-1.5">{company.slogan}</p>}
                <p className="text-base text-muted-foreground mt-2">{company.address}</p>
                <p className="text-base text-muted-foreground">Phone: {company.phoneNumber}</p>
                {!isEstimateView && bill.companyGstin && <p className="text-base text-muted-foreground mt-1">GSTIN: {bill.companyGstin}</p>}
            </div>

            {/* Bill Type Heading */}
            <h2 className="bill-type-heading text-2xl lg:text-3xl font-headline text-center font-semibold my-6 py-2.5 border-y border-primary/30">{effectiveBillType.toUpperCase()}</h2>
            
            {/* Bill Meta Information (No, Date, Customer) */}
            <div className="bill-meta-grid flex justify-between mb-6 text-base">
                <div className="w-1/2 pr-3"> {/* Left side for bill no and date */}
                    <h3 className="font-semibold text-lg mb-1.5">Details:</h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium ml-1.5"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium ml-1.5">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
                <div className="w-1/2 pl-3 text-right"> {/* Right side for customer details */}
                    <h3 className="font-semibold text-lg mb-1.5">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="font-medium text-base">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-sm">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-sm">Phone: {bill.customerPhone}</p>}
                </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto rounded-md border mt-6 shadow-sm">
              <table className="w-full text-base">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-3 px-3 font-semibold text-center text-sm">#</th>
                    <th className="py-3 px-3 font-semibold text-sm">Item (Material)</th>
                    {showHsnColumnInModal && <th className="py-3 px-3 text-center font-semibold text-sm">HSN</th>}
                    <th className="py-3 px-3 text-right font-semibold text-sm">Qty/Wt</th>
                    <th className="py-3 px-3 text-right font-semibold text-sm">
                        Rate {bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : '/ unit'}
                    </th>
                    {showMakingChargeColumn && <th className="py-3 px-3 text-right font-semibold text-sm">Making</th>}
                    {bill.type === 'sales-bill' && !isEstimateView && <th className="py-3 px-3 text-right font-semibold text-sm">Taxable Amt</th>}
                    {showItemLevelGstColumns && (
                        <>
                            <th className="py-3 px-3 text-right font-semibold text-sm">CGST ({settings.cgstRate}%)</th>
                            <th className="py-3 px-3 text-right font-semibold text-sm">SGST ({settings.sgstRate}%)</th>
                        </>
                    )}
                    <th className="py-3 px-3 text-right font-semibold text-sm">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.items.map((item, index) => {
                    const valuableDetails = getValuableById(item.valuableId);
                    const effectiveRate = getEffectiveRateForItem(item);
                    const taxableAmount = item.amount; // This is already calculated correctly in BillForm
                    
                    let itemCgst = 0;
                    let itemSgst = 0;
                    let lineTotal = taxableAmount; // Default to taxable amount

                    if (showItemLevelGstColumns) { // Only for non-estimate sales bills
                        itemCgst = item.itemCgstAmount || 0;
                        itemSgst = item.itemSgstAmount || 0;
                        lineTotal = taxableAmount + itemCgst + itemSgst;
                    }

                    return (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-sm">{index + 1}</td>
                      <td className="py-2.5 px-3 text-sm">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      {showHsnColumnInModal && <td className="py-2.5 px-3 text-center text-sm">{item.hsnCode || '-'}</td>}
                      <td className="py-2.5 px-3 text-right text-sm">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2.5 px-3 text-right text-sm">{currency}{effectiveRate.toFixed(2)}</td>
                      {showMakingChargeColumn && (
                        <td className="py-2.5 px-3 text-right text-sm">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      {/* Taxable amount shown for non-estimate sales bills */}
                      {bill.type === 'sales-bill' && !isEstimateView && <td className="py-2.5 px-3 text-right text-sm">{currency}{taxableAmount.toFixed(2)}</td>}
                      
                      {/* Item level GST shown for non-estimate sales bills */}
                      {showItemLevelGstColumns && (
                        <>
                            <td className="py-2.5 px-3 text-right text-sm">{currency}{itemCgst.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-sm">{currency}{itemSgst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-2.5 px-3 text-right font-medium text-sm">{currency}{lineTotal.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <hr className="my-6 border-border"/>

            {/* Totals Section */}
            <div className="bill-summary-grid flex justify-between mt-6 text-base">
                <div className="w-3/5 pr-3">
                    {bill.notes && (
                    <>
                        <h4 className="font-semibold text-lg mb-1.5">Notes:</h4>
                        <p className="text-base whitespace-pre-line">{bill.notes}</p>
                    </>
                    )}
                </div>
                <div className="w-2/5 pl-3 text-right space-y-2">
                    <p>Subtotal {(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span className="font-semibold text-lg">{currency}{bill.subTotal.toFixed(2)}</span></p>

                    {/* GST details only for non-estimate sales bills */}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold text-lg">{currency}{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold text-lg">{currency}{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                    
                    {isEstimateView && bill.type === 'sales-bill' && <p className="text-sm text-muted-foreground">(GST not applicable for estimates)</p>}

                    <hr className="my-2.5 !mt-3 !mb-3 border-border"/>
                    <p className="text-xl font-bold">Total: <span className="text-2xl">{currency}{bill.totalAmount.toFixed(2)}</span></p>
                </div>
            </div>

            {/* Footer */}
            <div className="bill-footer text-center mt-10 pt-5 border-t text-base text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>--- {company.companyName} ---</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto print-hidden">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="text-base px-5 py-2.5 h-auto">
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4"/>
            )}
            Download PDF
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf} className="text-base px-5 py-2.5 h-auto">Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;

