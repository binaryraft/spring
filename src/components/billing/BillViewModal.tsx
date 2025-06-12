
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
  const billPlaceholderRef = useRef<HTMLDivElement | null>(null);


  if (!bill) return null;

  const company = settings;
  const currency = settings.currencySymbol; // Use the selected currency

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
                return item.rate || 0;
        }
    }
    return item.rate || 0; 
  };

  // Function to generate a simplified HTML string for PDF rendering
  const generatePdfHtml = (): string => {
    const logoHtml = company.showCompanyLogo 
      ? company.companyLogo 
        ? `<img src="${company.companyLogo}" alt="${company.companyName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain; margin-bottom: 10px;" />`
        : `<div style="width: 100px; height: 50px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; font-size: 12px; color: #555;">Logo Area</div>`
      : '';

    const itemsHtml = bill.items.map((item, index) => {
      const valuableDetails = getValuableById(item.valuableId);
      const effectiveRate = getEffectiveRateForItem(item);
      const taxableAmount = item.amount;
      let itemCgst = 0;
      let itemSgst = 0;
      let lineTotal = taxableAmount;

      if (bill.type === 'sales-bill' && !isEstimateView) {
        itemCgst = item.itemCgstAmount || 0;
        itemSgst = item.itemSgstAmount || 0;
        lineTotal = taxableAmount + itemCgst + itemSgst;
      }

      return `
        <tr style="font-size: 11pt;">
          <td style="border: 1px solid #555; padding: 7px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #555; padding: 7px;">${item.name} ${valuableDetails ? `(${valuableDetails.name})` : ''}</td>
          <td style="border: 1px solid #555; padding: 7px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          <td style="border: 1px solid #555; padding: 7px; text-align: right;">${currency}${effectiveRate.toFixed(2)}</td>
          ${bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) ? `<td style="border: 1px solid #555; padding: 7px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          ${!isEstimateView && bill.type === 'sales-bill' ? `<td style="border: 1px solid #555; padding: 7px; text-align: right;">${currency}${taxableAmount.toFixed(2)}</td>` : ''}
          ${bill.type === 'sales-bill' && !isEstimateView ? `
            <td style="border: 1px solid #555; padding: 7px; text-align: right;">${currency}${itemCgst.toFixed(2)}<br/><span style="font-size:8pt;">(${settings.cgstRate}%)</span></td>
            <td style="border: 1px solid #555; padding: 7px; text-align: right;">${currency}${itemSgst.toFixed(2)}<br/><span style="font-size:8pt;">(${settings.sgstRate}%)</span></td>
          ` : ''}
          <td style="border: 1px solid #555; padding: 7px; text-align: right; font-weight: bold;">${currency}${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);
    const showItemTaxableCol = !isEstimateView && bill.type === 'sales-bill';
    const showItemGstCols = bill.type === 'sales-bill' && !isEstimateView;


    let tableHeaders = `
      <th style="border: 1px solid #555; padding: 8px; text-align: center; font-weight: bold; background-color: #e0e0e0;">#</th>
      <th style="border: 1px solid #555; padding: 8px; text-align: left; font-weight: bold; background-color: #e0e0e0;">Item Description</th>
      <th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Qty/Wt</th>
      <th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Rate / ${bill.items[0]?.unit || 'unit'}</th>
    `;
    if (showMakingChargeColumn) tableHeaders += `<th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Making</th>`;
    if (showItemTaxableCol) tableHeaders += `<th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Taxable Amt</th>`;
    if (showItemGstCols) {
      tableHeaders += `<th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">CGST</th>`;
      tableHeaders += `<th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">SGST</th>`;
    }
    tableHeaders += `<th style="border: 1px solid #555; padding: 8px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Line Total</th>`;


    return `
      <div style="font-family: 'PT Sans', Arial, sans-serif; color: #000000; width: 100%; max-width: 780px; margin: 0 auto; padding: 25px; background-color: #ffffff; border: 1px solid #ccc; box-sizing: border-box;">
        
        <div style="text-align: center; margin-bottom: 25px;">
          ${logoHtml}
          <h1 style="font-family: 'Playfair Display', serif; font-size: 28pt; margin: 0 0 5px 0; color: #333;">${company.companyName}</h1>
          ${company.slogan ? `<p style="font-size: 12pt; margin: 0 0 5px 0; color: #444;">${company.slogan}</p>` : ''}
          <p style="font-size: 11pt; margin: 0 0 3px 0; color: #444;">${company.address}</p>
          <p style="font-size: 11pt; margin: 0; color: #444;">Phone: ${company.phoneNumber}</p>
        </div>

        <h2 style="font-family: 'Playfair Display', serif; font-size: 20pt; text-align: center; margin: 20px 0; font-weight: bold; text-transform: uppercase; border-top: 1px solid #888; border-bottom: 1px solid #888; padding: 8px 0;">${effectiveBillType}</h2>
        
        <table style="width: 100%; margin-bottom: 20px; font-size: 11pt;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <h3 style="font-size: 13pt; font-weight: bold; margin-bottom: 5px;">Bill Details:</h3>
              <p style="margin: 3px 0;">${isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'} <span style="font-weight: 500;">${bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span></p>
              <p style="margin: 3px 0;">Date: <span style="font-weight: 500;">${format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <h3 style="font-size: 13pt; font-weight: bold; margin-bottom: 5px;">${bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}</h3>
              <p style="margin: 3px 0; font-weight: bold;">${bill.customerName || 'N/A'}</p>
              ${bill.customerAddress ? `<p style="font-size: 10pt; margin: 3px 0;">${bill.customerAddress}</p>` : ''}
              ${bill.customerPhone ? `<p style="font-size: 10pt; margin: 3px 0;">Phone: ${bill.customerPhone}</p>` : ''}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt;">
          <thead>
            <tr style="font-size: 11pt;">${tableHeaders}</tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #aaa; margin: 20px 0;" />

        <table style="width: 100%; margin-top: 20px; font-size: 12pt;">
          <tr>
            <td style="width: 60%; vertical-align: top; white-space: pre-line;">
              ${bill.notes ? `<h4 style="font-weight: bold; margin-bottom: 5px; font-size: 13pt;">Notes:</h4><p style="font-size:11pt;">${bill.notes}</p>` : ''}
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top; padding-left: 15px;">
              <p style="margin: 4px 0;">Subtotal ${(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span style="font-weight: bold;">${currency}${bill.subTotal.toFixed(2)}</span></p>
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 ? `<p style="margin: 4px 0;">Total CGST (${settings.cgstRate}%): <span style="font-weight: bold;">${currency}${(bill.cgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 ? `<p style="margin: 4px 0;">Total SGST (${settings.sgstRate}%): <span style="font-weight: bold;">${currency}${(bill.sgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${isEstimateView ? `<p style="font-size: 10pt; color: #555; margin: 4px 0;">(GST not applicable for estimates)</p>` : ''}
              <hr style="border: 0; border-top: 1px solid #777; margin: 8px 0;" />
              <p style="font-size: 15pt; font-weight: bold; margin-top: 8px;">Total: <span style="font-weight: bold; font-size: 17pt;">${currency}${bill.totalAmount.toFixed(2)}</span></p>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #aaa; font-size: 10pt;">
          <p>Thank you for your business!</p>
          <p style="margin-top: 5px;">--- ${company.companyName} ---</p>
        </div>
      </div>
    `;
  };

  const handleGeneratePdf = async () => {
    if (!billContentRef.current) {
        alert("Error: Bill content area not found. Cannot generate PDF.");
        return;
    }
    setIsGeneratingPdf(true);

    const billContentElement = document.getElementById('bill-to-print'); // Get the actual bill content
    if (!billContentElement) {
        alert("Critical Error: Bill content element with ID 'bill-to-print' not found in the DOM. PDF generation aborted.");
        setIsGeneratingPdf(false);
        return;
    }
    
    // Create a temporary wrapper for html2canvas
    const captureWrapper = document.createElement('div');
    captureWrapper.id = 'pdf-capture-wrapper';
    Object.assign(captureWrapper.style, {
        position: 'absolute',
        left: '-9999px', // Position off-screen
        top: '-9999px',
        zIndex: '-1', // Ensure it's not visible but accessible for capture
        width: '794px', // A4-like width for consistent capture base
        backgroundColor: 'white', // Ensure background for capture
    });

    const contentHost = document.createElement('div');
    contentHost.innerHTML = generatePdfHtml(); // Use the new function
    captureWrapper.appendChild(contentHost);
    document.body.appendChild(captureWrapper);
    
    // Allow images and styles to load/apply
    await new Promise(resolve => setTimeout(resolve, 300)); 

    if (contentHost.offsetWidth === 0 || contentHost.offsetHeight === 0) {
        alert(`Error: PDF capture element has no dimensions (W: ${contentHost.offsetWidth}, H: ${contentHost.offsetHeight}). PDF generation aborted. The generated HTML might be empty or styled to be hidden.`);
        if (captureWrapper.parentNode === document.body) {
            document.body.removeChild(captureWrapper);
        }
        setIsGeneratingPdf(false);
        return;
    }

    try {
        const canvas = await html2canvas(contentHost, { // Capture the div hosting the raw HTML
            scale: 2.5, // Increased scale for better quality
            useCORS: true,
            logging: false, 
            backgroundColor: "#ffffff", // Explicit white background for the canvas
            width: contentHost.scrollWidth, 
            height: contentHost.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: contentHost.scrollWidth,
            windowHeight: contentHost.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 250 || imgData === 'data:,') { // Basic check for empty image
             alert("Error: Failed to capture bill content for PDF. The generated image was empty or too small. This might be due to complex CSS or content not rendering correctly for html2canvas.");
             setIsGeneratingPdf(false);
             if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
             return; 
        }

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 10; // 10mm margin

        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            alert("Error: Captured image for PDF has no dimensions. Check html2canvas output.");
            setIsGeneratingPdf(false);
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            return;
        }

        // Calculate width and height of the image in the PDF, maintaining aspect ratio
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;
        
        let ratio = Math.min(availableWidth / canvasImgWidth, availableHeight / canvasImgHeight);
        
        const finalPdfImgWidth = canvasImgWidth * ratio;
        const finalPdfImgHeight = canvasImgHeight * ratio;

        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            alert("Error: Calculated PDF image dimensions are invalid (<=0).");
            setIsGeneratingPdf(false);
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            return;
        }
        
        // Center the image on the page
        const x = margin + (availableWidth - finalPdfImgWidth) / 2; 
        const y = margin + (availableHeight - finalPdfImgHeight) / 2; 
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        
        const dateStr = format(new Date(), 'yyyyMMdd_HHmmss');
        const fileName = `${effectiveBillType.replace(/\s+/g, '_')}_${bill.billNumber || 'Estimate'}_${dateStr}.pdf`;
        pdf.save(fileName); // Triggers download

    } catch (error) {
        console.error("Error generating PDF with html2canvas and jspdf:", error);
        alert(`An error occurred while generating the PDF: ${error instanceof Error ? error.message : String(error)}. Check console for details.`);
    } finally {
         // Cleanup: remove the temporary wrapper from the DOM
         if (captureWrapper.parentNode === document.body) {
           document.body.removeChild(captureWrapper);
        }
        setIsGeneratingPdf(false);
    }
};

  const PlaceholderLogo = () => (
    <div className="w-20 h-20 bg-muted/50 flex items-center justify-center rounded border">
      <Building className="w-10 h-10 text-muted-foreground" />
    </div>
  );

  const showItemLevelGstColumns = bill.type === 'sales-bill' && !isEstimateView;
  const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-screen-lg max-h-[90vh] flex flex-col print-dialog-content text-base">
        <DialogHeader className="print-hidden pb-4 border-b">
          <DialogTitle className="font-headline text-2xl lg:text-3xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        {/* Placeholder for billOriginalParentRef.current to re-attach #bill-to-print */}
        <div ref={billPlaceholderRef} style={{ display: 'none' }} />

        <div className="flex-grow overflow-y-auto p-1" ref={billContentRef}> 
            <div id="bill-to-print" className="p-6 bg-card text-foreground rounded-lg shadow-lg text-lg"> {/* Increased base font size */}
            
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
                <h1 className="text-4xl lg:text-5xl font-headline text-primary">{company.companyName}</h1>
                {company.slogan && <p className="text-lg text-muted-foreground mt-1">{company.slogan}</p>}
                <p className="text-base text-muted-foreground mt-2">{company.address}</p>
                <p className="text-base text-muted-foreground">Phone: {company.phoneNumber}</p>
            </div>

            <h2 className="bill-type-heading text-3xl lg:text-4xl font-headline text-center font-semibold my-6 py-2 border-y-2 border-primary/30">{effectiveBillType.toUpperCase()}</h2>
            
            <div className="bill-meta-grid flex justify-between mb-6 text-base">
                <div className="w-1/2 pr-3"> 
                    <h3 className="font-semibold text-xl mb-1.5">Details:</h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium ml-1.5"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium ml-1.5">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
                <div className="w-1/2 pl-3 text-right"> 
                    <h3 className="font-semibold text-xl mb-1.5">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="font-medium text-lg">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-sm">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-sm">Phone: {bill.customerPhone}</p>}
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border mt-6 shadow-sm">
              <table className="w-full text-base">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-3 px-3 font-semibold">#</th>
                    <th className="py-3 px-3 font-semibold">Item (Material)</th>
                    <th className="py-3 px-3 text-right font-semibold">Qty/Wt</th>
                    <th className="py-3 px-3 text-right font-semibold">
                        Rate {isEstimateView && bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : (isEstimateView ? '/ unit' : (bill.items[0]?.unit ? `/ ${bill.items[0].unit}` : '/ unit'))}
                    </th>
                    {showMakingChargeColumn && <th className="py-3 px-3 text-right font-semibold">Making</th>}
                    {bill.type === 'sales-bill' && !isEstimateView && <th className="py-3 px-3 text-right font-semibold">Taxable Amt</th>}
                    {showItemLevelGstColumns && (
                        <>
                            <th className="py-3 px-3 text-right font-semibold">CGST ({settings.cgstRate}%)</th>
                            <th className="py-3 px-3 text-right font-semibold">SGST ({settings.sgstRate}%)</th>
                        </>
                    )}
                    <th className="py-3 px-3 text-right font-semibold">Line Total</th>
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
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-center">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2.5 px-3 text-right">{currency}{effectiveRate.toFixed(2)}</td>
                      {showMakingChargeColumn && (
                        <td className="py-2.5 px-3 text-right">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      {bill.type === 'sales-bill' && !isEstimateView && <td className="py-2.5 px-3 text-right">{currency}{taxableAmount.toFixed(2)}</td>}
                      {showItemLevelGstColumns && (
                        <>
                            <td className="py-2.5 px-3 text-right">{currency}{itemCgst.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right">{currency}{itemSgst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-2.5 px-3 text-right font-medium">{currency}{lineTotal.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <hr className="my-6 border-border"/>

            <div className="bill-summary-grid flex justify-between mt-6 text-base">
                <div className="w-3/5 pr-3">
                    {bill.notes && (
                    <>
                        <h4 className="font-semibold text-xl mb-1.5">Notes:</h4>
                        <p className="text-base whitespace-pre-line">{bill.notes}</p>
                    </>
                    )}
                </div>
                <div className="w-2/5 pl-3 text-right space-y-1.5">
                    <p>Subtotal {(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span className="font-semibold text-lg">{currency}{bill.subTotal.toFixed(2)}</span></p>

                    {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold text-lg">{currency}{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold text-lg">{currency}{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                    
                    {isEstimateView && <p className="text-sm text-muted-foreground">(GST not applicable for estimates)</p>}

                    <hr className="my-2 !mt-3 !mb-3 border-border"/>
                    <p className="text-xl font-bold">Total: <span className="text-2xl">{currency}{bill.totalAmount.toFixed(2)}</span></p>
                </div>
            </div>

            <div className="bill-footer text-center mt-10 pt-5 border-t text-base text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>--- {company.companyName} ---</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-4 border-t mt-auto print-hidden">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="text-base px-5 py-2.5 h-auto">
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Printer className="mr-2 h-5 w-5"/>
            )}
            Generate &amp; Download PDF
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf} className="text-base px-5 py-2.5 h-auto">Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;
