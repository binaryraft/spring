
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
        if (!billOriginalParentRef.current.contains(billContentRef.current)) {
            billOriginalParentRef.current.replaceChild(billContentRef.current, billPlaceholderRef.current);
        }
    }
  }, [isOpen]);


  if (!bill) return null;

  const company = settings;
  const currency = settings.currencySymbol;
  const pdfCurrencyDisplay = currency === '₹' ? 'Rs. ' : currency;

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
    const useColor = settings.enableColorBilling;
    const primaryColor = useColor ? '#D4AF37' : '#000000'; 
    const secondaryColor = useColor ? '#5D503C' : '#000000'; 
    const tableHeaderBg = useColor ? '#F8F6F0' : '#E8E8E8'; // Lighter beige / Light Gray
    const tableBorderColor = useColor ? '#D4C8B8' : '#444444'; // Softer Gold-Beige / Dark Gray
    const defaultTextColor = '#000000';

    const companyNameColor = useColor ? primaryColor : defaultTextColor;
    const companyDetailsColor = useColor ? secondaryColor : defaultTextColor;
    const billTypeHeadingColor = useColor ? primaryColor : defaultTextColor;

    const logoImageHtml = company.showCompanyLogo
      ? company.companyLogo
        ? `<img src="${company.companyLogo}" alt="${company.companyName} Logo" style="max-width: 80px; max-height: 50px; object-fit: contain; display: inline-block;" />`
        : `<div style="width: 80px; height: 50px; border: 1px solid ${tableBorderColor}; display: -webkit-inline-box; display: -ms-inline-flexbox; display: inline-flex; -webkit-box-align: center; -ms-flex-align: center; align-items: center; -webkit-box-pack: center; -ms-flex-pack: center; justify-content: center; font-size: 8pt; color: ${secondaryColor}; box-sizing: border-box;">Logo</div>`
      : '';
    
    const getNameAndDetailsHtml = (textAlign: 'center' | 'left') => `
        <h1 style="font-family: 'Playfair Display', serif; font-size: 20pt; margin: 0 0 4px 0; color: ${companyNameColor}; text-align: ${textAlign}; line-height: 1.2;">${company.companyName}</h1>
        ${company.slogan ? `<p style="font-size: 8.5pt; margin: 0 0 4px 0; color: ${companyDetailsColor}; text-align: ${textAlign};">${company.slogan}</p>` : ''}
        <p style="font-size: 8pt; margin: 0 0 2px 0; color: ${companyDetailsColor}; text-align: ${textAlign};">${company.address}</p>
        <p style="font-size: 8pt; margin: 0 0 2px 0; color: ${companyDetailsColor}; text-align: ${textAlign};">Phone: ${company.phoneNumber}</p>
        ${(!isEstimateView && bill.companyGstin) ? `<p style="font-size: 8pt; margin: 0 0 3px 0; color: ${companyDetailsColor}; text-align: ${textAlign};">GSTIN: ${bill.companyGstin}</p>` : ''}
    `;

    let companyHeaderHtml = '';
    switch (settings.pdfLogoPosition) {
      case 'top-left':
        companyHeaderHtml = `
          <div class="bill-company-header" style="margin-bottom: 15px; text-align: left;">
            ${logoImageHtml ? `<div style="margin-bottom: 6px;">${logoImageHtml}</div>` : ''}
            <div style="${logoImageHtml ? '' : 'margin-top: 10px;'}">
             ${getNameAndDetailsHtml('left')}
            </div>
          </div>
        `;
        break;
      case 'inline-left':
        companyHeaderHtml = `
          <div class="bill-company-header" style="display: -webkit-box; display: -ms-flexbox; display: flex; -webkit-box-align: center; -ms-flex-align: center; align-items: center; margin-bottom: 15px;">
            ${logoImageHtml ? `<div style="margin-right: 12px; -ms-flex-negative: 0; flex-shrink: 0;">${logoImageHtml}</div>` : ''}
            <div style="-webkit-box-flex: 1; -ms-flex-positive: 1; flex-grow: 1; text-align: left;">
              ${getNameAndDetailsHtml('left')}
            </div>
          </div>
        `;
        break;
      case 'top-center':
      default:
        companyHeaderHtml = `
          <div class="bill-company-header" style="text-align: center; margin-bottom: 15px;">
            ${logoImageHtml ? `<div style="margin-bottom: 6px; line-height: 0;">${logoImageHtml}</div>` : ''}
            ${getNameAndDetailsHtml('center')}
          </div>
        `;
        break;
    }

    const itemsHtml = bill.items.map((item, index) => {
      const valuableDetails = getValuableById(item.valuableId);
      const effectiveRate = getEffectiveRateForItem(item);
      const taxableAmount = item.amount;
      let itemCgst = 0;
      let itemSgst = 0;
      let lineTotal = taxableAmount;

      const showHsnInPdf = bill.type === 'sales-bill' && !isEstimateView && item.hsnCode;
      const showItemGstCols = bill.type === 'sales-bill' && !isEstimateView;

      if (showItemGstCols) {
        itemCgst = item.itemCgstAmount || 0;
        itemSgst = item.itemSgstAmount || 0;
        lineTotal = taxableAmount + itemCgst + itemSgst;
      }

      return `
        <tr style="font-size: 8pt; page-break-inside: avoid; color: ${defaultTextColor};">
          <td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid ${tableBorderColor}; padding: 4px;">${item.name} ${valuableDetails ? `(${valuableDetails.name})` : ''}</td>
          ${showHsnInPdf ? `<td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: center;">${item.hsnCode || '-'}</td>` : (bill.type === 'sales-bill' && !isEstimateView && bill.type !== 'purchase' ? `<td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: center;">-</td>` : '')}
          <td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          <td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right;">${pdfCurrencyDisplay}${effectiveRate.toFixed(2)}</td>
          ${bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) ? `<td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : pdfCurrencyDisplay + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          ${showItemGstCols ? `<td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right;">${pdfCurrencyDisplay}${taxableAmount.toFixed(2)}</td>` : ''}
          ${showItemGstCols ? `
            <td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right;">${pdfCurrencyDisplay}${itemCgst.toFixed(2)}<br/><span style="font-size:6pt;">(${settings.cgstRate}%)</span></td>
            <td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right;">${pdfCurrencyDisplay}${itemSgst.toFixed(2)}<br/><span style="font-size:6pt;">(${settings.sgstRate}%)</span></td>
          ` : ''}
          <td style="border: 1px solid ${tableBorderColor}; padding: 4px; text-align: right; font-weight: 500;">${pdfCurrencyDisplay}${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const showMakingChargeColumnInPdf = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);
    const showItemTaxableColInPdf = bill.type === 'sales-bill' && !isEstimateView;
    const showItemGstColsInPdf = bill.type === 'sales-bill' && !isEstimateView;
    const showHsnColInPdfForHeader = bill.type === 'sales-bill' && !isEstimateView && bill.type !== 'purchase';


    let tableHeaders = `
      <th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: center; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">#</th>
      <th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: left; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">Item Description</th>
    `;
    if (showHsnColInPdfForHeader) tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: center; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">HSN</th>`;
    tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">Qty/Wt</th>`;
    tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">Rate / ${(bill.items[0]?.unit || 'unit')}</th>`;
    if (showMakingChargeColumnInPdf) tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">Making</th>`;
    if (showItemTaxableColInPdf) tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">Taxable Amt</th>`;
    if (showItemGstColsInPdf) {
      tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">CGST</th>`;
      tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">SGST</th>`;
    }
    tableHeaders += `<th style="border: 1px solid ${tableBorderColor}; padding: 5px; text-align: right; font-weight: 500; background-color: ${tableHeaderBg}; color: ${secondaryColor}; font-size: 8pt;">Line Total</th>`;

    const billDateFormatted = format(new Date(bill.date), 'dd MMM, yyyy');
    const billNumberDisplay = bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A');
    const billTypeLabel = isEstimateView ? 'Estimate Ref:' : (bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:');
    const customerLabel = bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):';

    return `
    <div id="bill-content-for-pdf" style="font-family: 'PT Sans', Arial, sans-serif; color: ${defaultTextColor}; width: 100%; max-width: 794px; margin: 0 auto; padding: 10px; background-color: #ffffff; border: 1px solid #ccc; box-sizing: border-box;">
        
        ${companyHeaderHtml}

        <h2 class="bill-type-heading" style="font-family: 'Playfair Display', serif; font-size: 15pt; text-align: center; margin: 15px 0; font-weight: 500; text-transform: uppercase; border-top: 1.5px solid ${billTypeHeadingColor}; border-bottom: 1.5px solid ${billTypeHeadingColor}; padding: 6px 0; color: ${billTypeHeadingColor};">${effectiveBillType}</h2>
        
        <table class="bill-meta-grid" style="width: 100%; margin-bottom: 12px; font-size: 8pt;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 8px;">
              <h3 style="font-size: 8.5pt; font-weight: 500; margin-bottom: 4px; color: ${secondaryColor};">Bill Details:</h3>
              <p style="margin: 2px 0;">${billTypeLabel} <span style="font-weight: 400;">${billNumberDisplay}</span></p>
              <p style="margin: 2px 0;">Date: <span style="font-weight: 400;">${billDateFormatted}</span></p>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top; padding-left: 8px;">
              <h3 style="font-size: 8.5pt; font-weight: 500; margin-bottom: 4px; color: ${secondaryColor};">${customerLabel}</h3>
              <p style="margin: 2px 0; font-weight: 500;">${bill.customerName || 'N/A'}</p>
              ${bill.customerAddress ? `<p style="font-size: 7.5pt; margin: 2px 0;">${bill.customerAddress}</p>` : ''}
              ${bill.customerPhone ? `<p style="font-size: 7.5pt; margin: 2px 0;">Phone: ${bill.customerPhone}</p>` : ''}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8pt;">
          <thead>
            <tr style="font-size: 8pt;">${tableHeaders}</tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <hr style="border: 0; border-top: 0.5px solid ${useColor ? primaryColor : '#555555'}; margin: 12px 0;" />

        <table class="bill-summary-grid" style="width: 100%; margin-top: 12px; font-size: 8pt;">
          <tr>
            <td style="width: 60%; vertical-align: top; white-space: pre-line;">
              ${bill.notes ? `<h4 style="font-weight: 500; margin-bottom: 3px; font-size: 8pt; color: ${secondaryColor};">Notes:</h4><p style="font-size:7.5pt;">${bill.notes}</p>` : ''}
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top; padding-left: 10px;">
              <p style="margin: 3px 0;">Subtotal ${(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span style="font-weight: 500;">${pdfCurrencyDisplay}${bill.subTotal.toFixed(2)}</span></p>
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 ? `<p style="margin: 3px 0;">Total CGST (${settings.cgstRate}%): <span style="font-weight: 500;">${pdfCurrencyDisplay}${(bill.cgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 ? `<p style="margin: 3px 0;">Total SGST (${settings.sgstRate}%): <span style="font-weight: 500;">${pdfCurrencyDisplay}${(bill.sgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${isEstimateView && bill.type === 'sales-bill' ? `<p style="font-size: 6.5pt; color: #555; margin: 3px 0;">(GST not applicable for estimates)</p>` : ''}
              <hr style="border: 0; border-top: 0.5px solid ${useColor ? primaryColor : '#555555'}; margin: 5px 0;" />
              <p style="font-size: 10pt; font-weight: 500; margin-top: 5px; color: ${primaryColor};">Total: <span style="font-weight: 500; font-size: 12pt;">${pdfCurrencyDisplay}${bill.totalAmount.toFixed(2)}</span></p>
            </td>
          </tr>
        </table>

        <div class="bill-footer" style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid ${useColor ? primaryColor : defaultTextColor}; font-size: 7.5pt; color: ${secondaryColor};">
          <p>Thank you for your business!</p>
          <p style="margin-top: 4px;">--- ${company.companyName} ---</p>
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
    contentHost.id = 'pdf-content-host';
    captureWrapper.appendChild(contentHost);
    document.body.appendChild(captureWrapper);
    document.body.classList.add('print-capture-active'); 
    
    if (billContentRef.current && billContentRef.current.parentElement && !billOriginalParentRef.current) {
      billOriginalParentRef.current = billContentRef.current.parentElement;
      if (billPlaceholderRef.current && billContentRef.current.parentNode) {
        billContentRef.current.parentNode.insertBefore(billPlaceholderRef.current, billContentRef.current);
      }
    }
    
    try {
        contentHost.innerHTML = generatePdfHtml();
        const billContentElementForCapture = contentHost.querySelector<HTMLElement>('#bill-content-for-pdf');

        if (!billContentElementForCapture) {
            alert("Critical Error: #bill-content-for-pdf element not found after injecting HTML for PDF. PDF generation aborted.");
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300)); 

        if (billContentElementForCapture.offsetWidth === 0 || billContentElementForCapture.offsetHeight === 0) {
            alert(`Error: PDF capture target (#bill-content-for-pdf) has no dimensions (W: ${billContentElementForCapture.offsetWidth}, H: ${billContentElementForCapture.offsetHeight}) after HTML injection. PDF generation aborted.`);
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            document.body.classList.remove('print-capture-active');
            setIsGeneratingPdf(false);
            return;
        }
        
        const canvas = await html2canvas(billContentElementForCapture, {
            scale: 2, 
            useCORS: true,
            logging: true, 
            backgroundColor: "#ffffff", 
        });

        const imgData = canvas.toDataURL('image/png');
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
        const margin = 10; 

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
        
        const availableWidth = pdfWidth - 2 * margin;
        let finalPdfImgHeight = (canvasImgHeight * availableWidth) / canvasImgWidth; 
        let finalPdfImgWidth = availableWidth;

        if (finalPdfImgHeight > (pdfHeight - 2 * margin)) { 
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
        const y = margin; 
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        
        const dateStr = format(new Date(), 'yyyyMMdd_HHmmss');
        const fileNameBase = effectiveBillType.replace(/[\s/]+/g, '_'); 
        const billNumPart = bill.billNumber ? `_${bill.billNumber.replace(/[\s/]+/g, '_')}` : (isEstimateView ? '_Estimate' : '_Bill');
        const fileName = `${fileNameBase}${billNumPart}_${dateStr}.pdf`;

        pdf.save(fileName);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert(`An error occurred during PDF generation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (captureWrapper.parentNode === document.body) {
           document.body.removeChild(captureWrapper);
        }
        document.body.classList.remove('print-capture-active');
        
        if (billContentRef.current && billPlaceholderRef.current && billOriginalParentRef.current) {
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
        
        <div ref={billPlaceholderRef} style={{ display: 'none' }} /> 

        <div className="flex-grow overflow-y-auto p-0.5" > 
            <div id="bill-to-print" ref={billContentRef} className="bg-card text-foreground rounded-lg shadow-sm text-base mx-auto px-3 py-5"> 
            
            <div className="bill-company-header text-center mb-6">
                {company.showCompanyLogo && (
                    <div className="mb-2.5 inline-block">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={150} height={75} className="object-contain mx-auto" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                )}
                <h1 className="text-2xl lg:text-3xl font-headline text-primary">{company.companyName}</h1>
                {company.slogan && <p className="text-lg text-muted-foreground mt-1">{company.slogan}</p>}
                <p className="text-sm text-muted-foreground mt-1.5">{company.address}</p>
                <p className="text-sm text-muted-foreground">Phone: {company.phoneNumber}</p>
                {!isEstimateView && bill.companyGstin && <p className="text-sm text-muted-foreground mt-0.5">GSTIN: {bill.companyGstin}</p>}
            </div>

            <h2 className="bill-type-heading text-xl lg:text-2xl font-headline text-center font-semibold my-5 py-2 border-y border-primary/30">{effectiveBillType.toUpperCase()}</h2>
            
            <div className="bill-meta-grid flex justify-between mb-5 text-sm">
                <div className="w-1/2 pr-2.5"> 
                    <h3 className="font-semibold text-base mb-1">Details:</h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium ml-1"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium ml-1">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
                <div className="w-1/2 pl-2.5 text-right"> 
                    <h3 className="font-semibold text-base mb-1">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="font-medium text-sm">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs">Phone: {bill.customerPhone}</p>}
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border mt-5 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-2.5 px-2 font-semibold text-center text-xs">#</th>
                    <th className="py-2.5 px-2 font-semibold text-xs">Item (Material)</th>
                    {showHsnColumnInModal && bill.type === 'sales-bill' && bill.type !== 'purchase' && <th className="py-2.5 px-2 text-center font-semibold text-xs">HSN</th>}
                    <th className="py-2.5 px-2 text-right font-semibold text-xs">Qty/Wt</th>
                    <th className="py-2.5 px-2 text-right font-semibold text-xs">
                        Rate {bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : '/ unit'}
                    </th>
                    {showMakingChargeColumn && <th className="py-2.5 px-2 text-right font-semibold text-xs">Making</th>}
                    {bill.type === 'sales-bill' && !isEstimateView && <th className="py-2.5 px-2 text-right font-semibold text-xs">Taxable Amt</th>}
                    {showItemLevelGstColumns && (
                        <>
                            <th className="py-2.5 px-2 text-right font-semibold text-xs">CGST ({settings.cgstRate}%)</th>
                            <th className="py-2.5 px-2 text-right font-semibold text-xs">SGST ({settings.sgstRate}%)</th>
                        </>
                    )}
                    <th className="py-2.5 px-2 text-right font-semibold text-xs">Line Total</th>
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
                      <td className="py-2 px-2 text-center text-xs">{index + 1}</td>
                      <td className="py-2 px-2 text-xs">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      {showHsnColumnInModal && bill.type === 'sales-bill' && bill.type !== 'purchase' && <td className="py-2 px-2 text-center text-xs">{item.hsnCode || '-'}</td>}
                      <td className="py-2 px-2 text-right text-xs">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-2 text-right text-xs">{pdfCurrencyDisplay}{effectiveRate.toFixed(2)}</td>
                      {showMakingChargeColumn && (
                        <td className="py-2 px-2 text-right text-xs">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : pdfCurrencyDisplay + item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      {bill.type === 'sales-bill' && !isEstimateView && <td className="py-2 px-2 text-right text-xs">{pdfCurrencyDisplay}{taxableAmount.toFixed(2)}</td>}
                      
                      {showItemLevelGstColumns && (
                        <>
                            <td className="py-2 px-2 text-right text-xs">{pdfCurrencyDisplay}{itemCgst.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right text-xs">{pdfCurrencyDisplay}{itemSgst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-2 px-2 text-right font-medium text-xs">{pdfCurrencyDisplay}{lineTotal.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <hr className="my-5 border-border"/>

            <div className="bill-summary-grid flex justify-between mt-5 text-sm">
                <div className="w-3/5 pr-2.5">
                    {bill.notes && (
                    <>
                        <h4 className="font-semibold text-base mb-1">Notes:</h4>
                        <p className="text-xs whitespace-pre-line">{bill.notes}</p>
                    </>
                    )}
                </div>
                <div className="w-2/5 pl-2.5 text-right space-y-1.5">
                    <p>Subtotal {(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span className="font-semibold text-base">{pdfCurrencyDisplay}{bill.subTotal.toFixed(2)}</span></p>

                    {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold text-base">{pdfCurrencyDisplay}{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold text-base">{pdfCurrencyDisplay}{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                    
                    {isEstimateView && bill.type === 'sales-bill' && <p className="text-xs text-muted-foreground">(GST not applicable for estimates)</p>}

                    <hr className="my-2 !mt-2.5 !mb-2.5 border-border"/>
                    <p className="text-lg font-bold">Total: <span className="text-xl">{pdfCurrencyDisplay}{bill.totalAmount.toFixed(2)}</span></p>
                </div>
            </div>

            <div className="bill-footer text-center mt-8 pt-4 border-t text-sm text-muted-foreground">
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

