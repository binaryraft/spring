
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
    if (isOpen && billContentRef.current && !billOriginalParentRef.current) {
        billOriginalParentRef.current = billContentRef.current.parentElement;
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
                return item.rate || 0;
        }
    }
    return item.rate || 0; 
  };

  const generatePdfHtml = (): string => {
    const logoHtml = company.showCompanyLogo 
      ? company.companyLogo 
        ? `<img src="${company.companyLogo}" alt="${company.companyName} Logo" style="max-width: 140px; max-height: 70px; object-fit: contain; margin-bottom: 12px;" />`
        : `<div style="width: 120px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; font-size: 16px; color: #555;">Logo Area</div>`
      : '';

    const itemsHtml = bill.items.map((item, index) => {
      const valuableDetails = getValuableById(item.valuableId);
      const effectiveRate = getEffectiveRateForItem(item);
      const taxableAmount = item.amount;
      let itemCgst = 0;
      let itemSgst = 0;
      let lineTotal = taxableAmount;

      // HSN is only for non-estimate Sales bills
      const showHsnInPdf = bill.type === 'sales-bill' && !isEstimateView;

      if (bill.type === 'sales-bill' && !isEstimateView) {
        itemCgst = item.itemCgstAmount || 0;
        itemSgst = item.itemSgstAmount || 0;
        lineTotal = taxableAmount + itemCgst + itemSgst;
      }

      return `
        <tr style="font-size: 14pt; page-break-inside: avoid;">
          <td style="border: 1px solid #333333; padding: 9px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #333333; padding: 9px;">${item.name} ${valuableDetails ? `(${valuableDetails.name})` : ''}</td>
          ${showHsnInPdf ? `<td style="border: 1px solid #333333; padding: 9px; text-align: center;">${item.hsnCode || '-'}</td>` : ''}
          <td style="border: 1px solid #333333; padding: 9px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          <td style="border: 1px solid #333333; padding: 9px; text-align: right;">${currency}${effectiveRate.toFixed(2)}</td>
          ${bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) ? `<td style="border: 1px solid #333333; padding: 9px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          ${bill.type === 'sales-bill' && !isEstimateView ? `<td style="border: 1px solid #333333; padding: 9px; text-align: right;">${currency}${taxableAmount.toFixed(2)}</td>` : ''}
          ${bill.type === 'sales-bill' && !isEstimateView ? `
            <td style="border: 1px solid #333333; padding: 9px; text-align: right;">${currency}${itemCgst.toFixed(2)}<br/><span style="font-size:11pt;">(${settings.cgstRate}%)</span></td>
            <td style="border: 1px solid #333333; padding: 9px; text-align: right;">${currency}${itemSgst.toFixed(2)}<br/><span style="font-size:11pt;">(${settings.sgstRate}%)</span></td>
          ` : ''}
          <td style="border: 1px solid #333333; padding: 9px; text-align: right; font-weight: bold;">${currency}${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);
    const showItemTaxableCol = bill.type === 'sales-bill' && !isEstimateView;
    const showItemGstCols = bill.type === 'sales-bill' && !isEstimateView;
    const showHsnColInPdf = bill.type === 'sales-bill' && !isEstimateView;


    let tableHeaders = `
      <th style="border: 1px solid #333333; padding: 10px; text-align: center; font-weight: bold; background-color: #e0e0e0;">#</th>
      <th style="border: 1px solid #333333; padding: 10px; text-align: left; font-weight: bold; background-color: #e0e0e0;">Item Description</th>
    `;
    if (showHsnColInPdf) tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: center; font-weight: bold; background-color: #e0e0e0;">HSN</th>`;
    tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Qty/Wt</th>`;
    tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Rate / ${bill.items[0]?.unit || 'unit'}</th>`;
    if (showMakingChargeColumn) tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Making</th>`;
    if (showItemTaxableCol) tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Taxable Amt</th>`;
    if (showItemGstCols) {
      tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">CGST</th>`;
      tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">SGST</th>`;
    }
    tableHeaders += `<th style="border: 1px solid #333333; padding: 10px; text-align: right; font-weight: bold; background-color: #e0e0e0;">Line Total</th>`;

    const billDateFormatted = format(new Date(bill.date), 'dd MMM, yyyy');
    const billNumberDisplay = bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A');
    const billTypeLabel = isEstimateView ? 'Estimate Ref:' : (bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:');
    const customerLabel = bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):';

    return `
    <div id="bill-content-for-pdf" style="font-family: 'PT Sans', Arial, sans-serif; color: #000000; width: 100%; max-width: 794px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #ccc; box-sizing: border-box;">
        
        <div class="bill-company-header" style="text-align: center; margin-bottom: 35px;">
          ${logoHtml}
          <h1 style="font-family: 'Playfair Display', serif; font-size: 36pt; margin: 0 0 10px 0; color: #000000;">${company.companyName}</h1>
          ${company.slogan ? `<p style="font-size: 18pt; margin: 0 0 10px 0; color: #000000;">${company.slogan}</p>` : ''}
          <p style="font-size: 16pt; margin: 0 0 6px 0; color: #000000;">${company.address}</p>
          <p style="font-size: 16pt; margin: 0; color: #000000;">Phone: ${company.phoneNumber}</p>
        </div>

        <h2 class="bill-type-heading" style="font-family: 'Playfair Display', serif; font-size: 28pt; text-align: center; margin: 35px 0; font-weight: bold; text-transform: uppercase; border-top: 2.5px solid #000000; border-bottom: 2.5px solid #000000; padding: 12px 0;">${effectiveBillType}</h2>
        
        <table class="bill-meta-grid" style="width: 100%; margin-bottom: 35px; font-size: 16pt;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <h3 style="font-size: 18pt; font-weight: bold; margin-bottom: 10px;">Bill Details:</h3>
              <p style="margin: 7px 0;">${billTypeLabel} <span style="font-weight: 500;">${billNumberDisplay}</span></p>
              <p style="margin: 7px 0;">Date: <span style="font-weight: 500;">${billDateFormatted}</span></p>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top; padding-left: 20px;">
              <h3 style="font-size: 18pt; font-weight: bold; margin-bottom: 10px;">${customerLabel}</h3>
              <p style="margin: 7px 0; font-weight: bold;">${bill.customerName || 'N/A'}</p>
              ${bill.customerAddress ? `<p style="font-size: 15pt; margin: 7px 0;">${bill.customerAddress}</p>` : ''}
              ${bill.customerPhone ? `<p style="font-size: 15pt; margin: 7px 0;">Phone: ${bill.customerPhone}</p>` : ''}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 14pt;">
          <thead>
            <tr style="font-size: 15pt;">${tableHeaders}</tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <hr style="border: 0; border-top: 2px solid #555555; margin: 35px 0;" />

        <table class="bill-summary-grid" style="width: 100%; margin-top: 35px; font-size: 16pt;">
          <tr>
            <td style="width: 60%; vertical-align: top; white-space: pre-line;">
              ${bill.notes ? `<h4 style="font-weight: bold; margin-bottom: 8px; font-size: 18pt;">Notes:</h4><p style="font-size:16pt;">${bill.notes}</p>` : ''}
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top; padding-left: 25px;">
              <p style="margin: 8px 0;">Subtotal ${(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span style="font-weight: bold;">${currency}${bill.subTotal.toFixed(2)}</span></p>
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 ? `<p style="margin: 8px 0;">Total CGST (${settings.cgstRate}%): <span style="font-weight: bold;">${currency}${(bill.cgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 ? `<p style="margin: 8px 0;">Total SGST (${settings.sgstRate}%): <span style="font-weight: bold;">${currency}${(bill.sgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${isEstimateView ? `<p style="font-size: 14pt; color: #333; margin: 8px 0;">(GST not applicable for estimates)</p>` : ''}
              <hr style="border: 0; border-top: 1.5px solid #555555; margin: 14px 0;" />
              <p style="font-size: 20pt; font-weight: bold; margin-top: 14px;">Total: <span style="font-weight: bold; font-size: 22pt;">${currency}${bill.totalAmount.toFixed(2)}</span></p>
            </td>
          </tr>
        </table>

        <div class="bill-footer" style="text-align: center; margin-top: 45px; padding-top: 30px; border-top: 2.5px solid #000000; font-size: 15pt;">
          <p>Thank you for your business!</p>
          <p style="margin-top: 10px;">--- ${company.companyName} ---</p>
        </div>
      </div>
    `;
  };


  const handleGeneratePdf = async () => {
    if (!billContentRef.current || !bill) {
        alert("Error: Bill content is not available for PDF generation.");
        return;
    }
    setIsGeneratingPdf(true);

    const captureWrapper = document.createElement('div');
    captureWrapper.id = 'pdf-capture-wrapper';
    Object.assign(captureWrapper.style, {
        position: 'fixed',
        left: '-9999px',
        top: '-9999px',
        width: '794px', 
        backgroundColor: 'white',
        padding: '0',
        margin: '0',
        boxSizing: 'border-box',
        zIndex: '-1', 
    });

    const contentHost = document.createElement('div');
    contentHost.innerHTML = generatePdfHtml(); // Use the generated HTML string
    
    captureWrapper.appendChild(contentHost);
    document.body.appendChild(captureWrapper);
    document.body.classList.add('print-capture-active');

    // Target the actual content element that was created by innerHTML
    const billContentElementForCapture = contentHost.firstChild as HTMLElement;

    if (!billContentElementForCapture || billContentElementForCapture.offsetWidth === 0 || billContentElementForCapture.offsetHeight === 0) {
        alert(`Error: PDF capture target has no dimensions (W: ${billContentElementForCapture?.offsetWidth}, H: ${billContentElementForCapture?.offsetHeight}). PDF generation aborted. This can happen if the HTML content for the PDF is empty or not rendering correctly off-screen.`);
        if (captureWrapper.parentNode === document.body) {
            document.body.removeChild(captureWrapper);
        }
        document.body.classList.remove('print-capture-active');
        setIsGeneratingPdf(false);
        return;
    }
    
    try {
        await new Promise(resolve => setTimeout(resolve, 300)); 

        const canvas = await html2canvas(billContentElementForCapture, {
            scale: 2.5, 
            useCORS: true,
            logging: false, 
            backgroundColor: "#ffffff",
            width: billContentElementForCapture.offsetWidth, 
            height: billContentElementForCapture.offsetHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: billContentElementForCapture.scrollWidth,
            windowHeight: billContentElementForCapture.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 250 || imgData === 'data:,') { 
             alert("Error: Failed to capture bill content. Generated image was empty or too small. Please check the console for errors or try again.");
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
        const margin = 10; 

        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            alert("Error: Captured image has no dimensions. Ensure the content being captured is visible and has size.");
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        const availableWidth = pdfWidth - 2 * margin;
        let finalPdfImgHeight = (canvasImgHeight * availableWidth) / canvasImgWidth; // Maintain aspect ratio based on available width
        let finalPdfImgWidth = availableWidth;

        if (finalPdfImgHeight > (pdfHeight - 2 * margin)) { // If height exceeds page with new width, scale by height instead
            finalPdfImgHeight = pdfHeight - 2 * margin;
            finalPdfImgWidth = (canvasImgWidth * finalPdfImgHeight) / canvasImgHeight;
        }
        
        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            alert("Error: Calculated PDF image dimensions are invalid. Check image capture and scaling logic.");
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        const x = margin + (availableWidth - finalPdfImgWidth) / 2; 
        const y = margin; // Start from top margin
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        
        const dateStr = format(new Date(), 'yyyyMMdd_HHmmss');
        const fileNameBase = effectiveBillType.replace(/\s+/g, '_');
        const billNumPart = bill.billNumber ? `_${bill.billNumber.replace(/[\s/]+/g, '_')}` : (isEstimateView ? '_Estimate' : '_Bill');
        const fileName = `${fileNameBase}${billNumPart}_${dateStr}.pdf`;

        pdf.save(fileName); // Triggers download

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert(`An error occurred during PDF generation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (captureWrapper.parentNode === document.body) {
           document.body.removeChild(captureWrapper);
        }
        document.body.classList.remove('print-capture-active');
        setIsGeneratingPdf(false);
    }
};


  const PlaceholderLogo = () => (
    <div className="w-24 h-24 bg-muted/50 flex items-center justify-center rounded border text-muted-foreground text-lg">
      <Building className="w-10 h-10" />
      <span className="ml-2">Logo</span>
    </div>
  );

  // HSN is only for non-estimate Sales bills
  const showHsnColumnInModal = bill.type === 'sales-bill' && !isEstimateView;
  const showItemLevelGstColumns = bill.type === 'sales-bill' && !isEstimateView;
  const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] flex flex-col print-dialog-content text-xl w-full max-w-screen-lg xl:max-w-screen-xl"> 
        <DialogHeader className="print-hidden pb-5 border-b">
          <DialogTitle className="font-headline text-3xl lg:text-4xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription className="text-xl">
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div ref={billPlaceholderRef} style={{ display: 'none' }} /> 

        <div className="flex-grow overflow-y-auto p-1" > 
            <div id="bill-to-print" ref={billContentRef} className="p-6 bg-card text-foreground rounded-lg shadow-lg text-xl min-w-[780px] mx-auto"> 
            
            <div className="bill-company-header text-center mb-10">
                {company.showCompanyLogo && (
                    <div className="mb-4 inline-block">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={180} height={90} className="object-contain mx-auto" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                )}
                <h1 className="text-5xl lg:text-6xl font-headline text-primary">{company.companyName}</h1>
                {company.slogan && <p className="text-2xl text-muted-foreground mt-2">{company.slogan}</p>}
                <p className="text-xl text-muted-foreground mt-3">{company.address}</p>
                <p className="text-xl text-muted-foreground">Phone: {company.phoneNumber}</p>
            </div>

            <h2 className="bill-type-heading text-4xl lg:text-5xl font-headline text-center font-semibold my-8 py-3 border-y-2 border-primary/30">{effectiveBillType.toUpperCase()}</h2>
            
            <div className="bill-meta-grid flex justify-between mb-8 text-xl">
                <div className="w-1/2 pr-4"> 
                    <h3 className="font-semibold text-2xl mb-2">Details:</h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium ml-2"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium ml-2">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
                <div className="w-1/2 pl-4 text-right"> 
                    <h3 className="font-semibold text-2xl mb-2">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="font-medium text-xl">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-lg">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-lg">Phone: {bill.customerPhone}</p>}
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border mt-8 shadow-sm">
              <table className="w-full text-xl">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-3.5 px-4 font-semibold text-center">#</th>
                    <th className="py-3.5 px-4 font-semibold">Item (Material)</th>
                    {showHsnColumnInModal && <th className="py-3.5 px-4 text-center font-semibold">HSN</th>}
                    <th className="py-3.5 px-4 text-right font-semibold">Qty/Wt</th>
                    <th className="py-3.5 px-4 text-right font-semibold">
                        Rate {bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : '/ unit'}
                    </th>
                    {showMakingChargeColumn && <th className="py-3.5 px-4 text-right font-semibold">Making</th>}
                    {bill.type === 'sales-bill' && !isEstimateView && <th className="py-3.5 px-4 text-right font-semibold">Taxable Amt</th>}
                    {showItemLevelGstColumns && (
                        <>
                            <th className="py-3.5 px-4 text-right font-semibold">CGST ({settings.cgstRate}%)</th>
                            <th className="py-3.5 px-4 text-right font-semibold">SGST ({settings.sgstRate}%)</th>
                        </>
                    )}
                    <th className="py-3.5 px-4 text-right font-semibold">Line Total</th>
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
                      <td className="py-3 px-4 text-center">{index + 1}</td>
                      <td className="py-3 px-4">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      {showHsnColumnInModal && <td className="py-3 px-4 text-center">{item.hsnCode || '-'}</td>}
                      <td className="py-3 px-4 text-right">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-3 px-4 text-right">{currency}{effectiveRate.toFixed(2)}</td>
                      {showMakingChargeColumn && (
                        <td className="py-3 px-4 text-right">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      {bill.type === 'sales-bill' && !isEstimateView && <td className="py-3 px-4 text-right">{currency}{taxableAmount.toFixed(2)}</td>}
                      {showItemLevelGstColumns && (
                        <>
                            <td className="py-3 px-4 text-right">{currency}{itemCgst.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">{currency}{itemSgst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-3 px-4 text-right font-medium">{currency}{lineTotal.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <hr className="my-8 border-border"/>

            <div className="bill-summary-grid flex justify-between mt-8 text-xl">
                <div className="w-3/5 pr-4">
                    {bill.notes && (
                    <>
                        <h4 className="font-semibold text-2xl mb-2">Notes:</h4>
                        <p className="text-xl whitespace-pre-line">{bill.notes}</p>
                    </>
                    )}
                </div>
                <div className="w-2/5 pl-4 text-right space-y-2.5">
                    <p>Subtotal {(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span className="font-semibold text-2xl">{currency}{bill.subTotal.toFixed(2)}</span></p>

                    {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold text-2xl">{currency}{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold text-2xl">{currency}{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                    
                    {isEstimateView && <p className="text-lg text-muted-foreground">(GST not applicable for estimates)</p>}

                    <hr className="my-3 !mt-4 !mb-4 border-border"/>
                    <p className="text-3xl font-bold">Total: <span className="text-4xl">{currency}{bill.totalAmount.toFixed(2)}</span></p>
                </div>
            </div>

            <div className="bill-footer text-center mt-12 pt-6 border-t text-xl text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>--- {company.companyName} ---</p>
            </div>
          </div>
        </div>
        <DialogFooter className="p-5 border-t mt-auto print-hidden">
          <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="text-lg px-6 py-3 h-auto">
            {isGeneratingPdf ? (
              <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
            ) : (
              <Printer className="mr-2.5 h-5 w-5"/>
            )}
            Download PDF
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf} className="text-lg px-6 py-3 h-auto">Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;

    