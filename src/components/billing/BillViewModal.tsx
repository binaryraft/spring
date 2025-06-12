
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
  const billContentRef = useRef<HTMLDivElement>(null); // Ref for the original bill content placeholder in the modal

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
        ? `<img src="${company.companyLogo}" alt="${company.companyName} Logo" style="max-width: 100px; max-height: 50px; object-fit: contain; margin-bottom: 5px;" />`
        : `<div style="width: 80px; height: 40px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; margin-bottom: 5px; font-size: 10px; color: #555;">Logo Area</div>`
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
        <tr>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${index + 1}</td>
          <td style="border: 1px solid #ddd; padding: 6px;">${item.name} ${valuableDetails ? `(${valuableDetails.name})` : ''}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${currency}${effectiveRate.toFixed(2)}</td>
          ${bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0) ? `<td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          ${!isEstimateView ? `<td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${currency}${taxableAmount.toFixed(2)}</td>` : ''}
          ${bill.type === 'sales-bill' && !isEstimateView ? `
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${currency}${itemCgst.toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${currency}${itemSgst.toFixed(2)}</td>
          ` : ''}
          <td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">${currency}${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);

    return `
      <div style="font-family: 'PT Sans', Arial, sans-serif; font-size: 10pt; color: #000; width: 780px; margin: 0 auto; padding: 20px; background-color: #fff;">
        <div style="text-align: center; margin-bottom: 20px;">
          ${logoHtml}
          <h1 style="font-family: 'Playfair Display', serif; font-size: 22pt; margin: 0 0 2px 0; color: #D4AF37;">${company.companyName}</h1>
          ${company.slogan ? `<p style="font-size: 10pt; margin: 0 0 2px 0;">${company.slogan}</p>` : ''}
          <p style="font-size: 9pt; margin: 0 0 2px 0;">${company.address}</p>
          <p style="font-size: 9pt; margin: 0;">Phone: ${company.phoneNumber}</p>
        </div>

        <h2 style="font-family: 'Playfair Display', serif; font-size: 16pt; text-align: center; margin: 15px 0; font-weight: bold;">${effectiveBillType.toUpperCase()}</h2>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;" />

        <table style="width: 100%; margin-bottom: 15px; font-size: 9pt;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <h3 style="font-size: 10pt; font-weight: bold; margin-bottom: 3px;">Details:</h3>
              <p style="margin: 2px 0;">${isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'} <span style="font-weight: 500;">${bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span></p>
              <p style="margin: 2px 0;">Date: <span style="font-weight: 500;">${format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <h3 style="font-size: 10pt; font-weight: bold; margin-bottom: 3px;">${bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}</h3>
              <p style="margin: 2px 0;">${bill.customerName || 'N/A'}</p>
              ${bill.customerAddress ? `<p style="font-size: 8pt; margin: 2px 0;">${bill.customerAddress}</p>` : ''}
              ${bill.customerPhone ? `<p style="font-size: 8pt; margin: 2px 0;">Phone: ${bill.customerPhone}</p>` : ''}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9pt;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">#</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left; font-weight: bold;">Item (Material)</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Qty/Wt</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Rate ${isEstimateView && bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : (isEstimateView ? '/ unit' : (bill.items[0]?.unit ? `/ ${bill.items[0].unit}` : '/ unit'))}</th>
              ${showMakingChargeColumn ? `<th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Making</th>` : ''}
              ${!isEstimateView ? `<th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Taxable Amt</th>` : ''}
              ${bill.type === 'sales-bill' && !isEstimateView ? `
                <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">CGST (${settings.cgstRate}%)</th>
                <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">SGST (${settings.sgstRate}%)</th>
              ` : ''}
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: bold;">Line Total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;" />

        <table style="width: 100%; margin-top: 15px; font-size: 9pt;">
          <tr>
            <td style="width: 60%; vertical-align: top; white-space: pre-line;">
              ${bill.notes ? `<h4 style="font-weight: bold; margin-bottom: 3px; font-size: 10pt;">Notes:</h4><p>${bill.notes}</p>` : ''}
            </td>
            <td style="width: 40%; text-align: right; vertical-align: top;">
              <p style="margin: 2px 0;">Subtotal ${(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span style="font-weight: 500;">${currency}${bill.subTotal.toFixed(2)}</span></p>
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 ? `<p style="margin: 2px 0;">Total CGST (${settings.cgstRate}%): <span style="font-weight: 500;">${currency}${(bill.cgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 ? `<p style="margin: 2px 0;">Total SGST (${settings.sgstRate}%): <span style="font-weight: 500;">${currency}${(bill.sgstAmount || 0).toFixed(2)}</span></p>` : ''}
              ${isEstimateView ? `<p style="font-size: 8pt; color: #555; margin: 2px 0;">(GST not applicable for estimates)</p>` : ''}
              <hr style="border: 0; border-top: 1px solid #ccc; margin: 5px 0;" />
              <p style="font-size: 11pt; font-weight: bold; margin-top: 5px;">Total: <span style="font-weight: bold; font-size: 13pt;">${currency}${bill.totalAmount.toFixed(2)}</span></p>
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 25px; padding-top: 10px; border-top: 1px solid #aaa; font-size: 8pt;">
          <p>Thank you for your business!</p>
          <p>--- ${company.companyName} ---</p>
        </div>
      </div>
    `;
  };


  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);

    const captureWrapper = document.createElement('div');
    captureWrapper.id = 'pdf-capture-wrapper';
    Object.assign(captureWrapper.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      zIndex: '-1',
      width: '794px', // A4-like width for consistent capture base
      backgroundColor: 'white',
    });

    const billContentForPdf = document.createElement('div');
    billContentForPdf.innerHTML = generatePdfHtml(); // Use the generated HTML string
    captureWrapper.appendChild(billContentForPdf);
    document.body.appendChild(captureWrapper);
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Allow images in HTML string (if any) to potentially load

    if (billContentForPdf.offsetWidth === 0 || billContentForPdf.offsetHeight === 0) {
        alert(`Error: PDF capture element has no dimensions (W: ${billContentForPdf.offsetWidth}, H: ${billContentForPdf.offsetHeight}). PDF generation aborted.`);
        if (captureWrapper.parentNode === document.body) {
            document.body.removeChild(captureWrapper);
        }
        setIsGeneratingPdf(false);
        return;
    }

    try {
        const canvas = await html2canvas(billContentForPdf, { // Capture the div containing the raw HTML
            scale: 2, 
            useCORS: true,
            logging: false, 
            backgroundColor: "#ffffff",
            width: billContentForPdf.scrollWidth, 
            height: billContentForPdf.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: billContentForPdf.scrollWidth,
            windowHeight: billContentForPdf.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 250 || imgData === 'data:,') {
             alert("Error: Failed to capture bill content for PDF. The generated image was empty or too small.");
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
        const margin = 10; 

        const imgProps = pdf.getImageProperties(imgData);
        const canvasImgWidth = imgProps.width;
        const canvasImgHeight = imgProps.height;
        
        if (canvasImgWidth === 0 || canvasImgHeight === 0) {
            alert("Error: Captured image for PDF has no dimensions.");
            setIsGeneratingPdf(false);
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
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
            if (captureWrapper.parentNode === document.body) { document.body.removeChild(captureWrapper); }
            return;
        }
        
        const x = margin + (availableWidth - finalPdfImgWidth) / 2; 
        const y = margin + (availableHeight - finalPdfImgHeight) / 2; 
        
        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        
        const dateStr = format(new Date(), 'yyyyMMdd_HHmmss');
        const fileName = `${effectiveBillType.replace(/\s+/g, '_')}-${bill.billNumber || 'Estimate'}-${dateStr}.pdf`;
        pdf.save(fileName); // Triggers download

    } catch (error) {
        console.error("Error generating PDF with html2canvas and jspdf:", error);
        alert(`An error occurred while generating the PDF: ${error instanceof Error ? error.message : String(error)}. Check console for details.`);
    } finally {
         if (captureWrapper.parentNode === document.body) {
           document.body.removeChild(captureWrapper);
        }
        setIsGeneratingPdf(false);
    }
};
  const PlaceholderLogo = () => (
    <div className="w-16 h-16 bg-muted/50 flex items-center justify-center rounded">
      <Building className="w-8 h-8 text-muted-foreground" />
    </div>
  );

  const showItemLevelGstColumns = bill.type === 'sales-bill' && !isEstimateView;
  const showMakingChargeColumn = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-screen-lg max-h-[90vh] flex flex-col print-dialog-content">
        <DialogHeader className="print-hidden">
          <DialogTitle className="font-headline text-2xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription>
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1" ref={billContentRef}> 
            {/* This div is now just a scroll container for the visual bill in the modal. PDF uses generated HTML. */}
            <div id="bill-to-display-in-modal" className="p-6 bg-card text-foreground rounded-lg shadow-lg">
            
            <div className="text-center mb-6">
                {company.showCompanyLogo && (
                    <div className="mb-2 inline-block">
                        {company.companyLogo ? (
                            <Image src={company.companyLogo} alt={`${company.companyName} Logo`} width={120} height={60} className="object-contain mx-auto" />
                        ) : (
                            <PlaceholderLogo />
                        )}
                    </div>
                )}
                <h1 className="text-3xl font-headline text-primary">{company.companyName}</h1>
                {company.slogan && <p className="text-sm text-muted-foreground">{company.slogan}</p>}
                <p className="text-xs text-muted-foreground">{company.address}</p>
                <p className="text-xs text-muted-foreground">Phone: {company.phoneNumber}</p>
            </div>

            <h2 className="text-2xl font-headline text-center font-semibold my-4">{effectiveBillType.toUpperCase()}</h2>
            
            <hr className="my-4"/>

            <div className="flex justify-between mb-4 text-sm">
                <div className="w-1/2 pr-2"> 
                    <h3 className="font-semibold text-md mb-1">Details:</h3>
                    <p>
                        {isEstimateView ? 'Estimate Ref:' : bill.type === 'purchase' ? 'P.O. No:' : 'Invoice No:'}
                        <span className="font-medium ml-1"> {bill.billNumber || (isEstimateView ? 'N/A (Estimate)' : 'N/A')}</span>
                    </p>
                    <p>Date: <span className="font-medium ml-1">{format(new Date(bill.date), 'dd MMM, yyyy')}</span></p>
                </div>
                <div className="w-1/2 pl-2 text-right"> 
                    <h3 className="font-semibold text-md mb-1">
                        {bill.type === 'purchase' ? 'From (Supplier):' : 'To (Customer):'}
                    </h3>
                    <p className="font-medium">{bill.customerName || 'N/A'}</p>
                    {bill.customerAddress && <p className="text-xs">{bill.customerAddress}</p>}
                    {bill.customerPhone && <p className="text-xs">Phone: {bill.customerPhone}</p>}
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border mt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr >
                    <th className="py-2 px-2 text-left font-semibold">#</th>
                    <th className="py-2 px-2 text-left font-semibold">Item (Material)</th>
                    <th className="py-2 px-2 text-right font-semibold">Qty/Wt</th>
                    <th className="py-2 px-2 text-right font-semibold">
                        Rate {isEstimateView && bill.items.length > 0 && bill.items[0].unit ? `/ ${bill.items[0].unit}` : (isEstimateView ? '/ unit' : (bill.items[0]?.unit ? `/ ${bill.items[0].unit}` : '/ unit'))}
                    </th>
                    {showMakingChargeColumn && <th className="py-2 px-2 text-right font-semibold">Making</th>}
                    {!isEstimateView && <th className="py-2 px-2 text-right font-semibold">Taxable Amt</th>}
                    {showItemLevelGstColumns && (
                        <>
                            <th className="py-2 px-2 text-right font-semibold">CGST ({settings.cgstRate}%)</th>
                            <th className="py-2 px-2 text-right font-semibold">SGST ({settings.sgstRate}%)</th>
                        </>
                    )}
                    <th className="py-2 px-2 text-right font-semibold">Line Total</th>
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
                      <td className="py-2 px-2 text-center">{index + 1}</td>
                      <td className="py-2 px-2">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2 px-2 text-right">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-2 text-right">{currency}{effectiveRate.toFixed(2)}</td>
                      {showMakingChargeColumn && (
                        <td className="py-2 px-2 text-right">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : currency + item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      {!isEstimateView && <td className="py-2 px-2 text-right">{currency}{taxableAmount.toFixed(2)}</td>}
                      {showItemLevelGstColumns && (
                        <>
                            <td className="py-2 px-2 text-right">{currency}{itemCgst.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right">{currency}{itemSgst.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-2 px-2 text-right font-medium">{currency}{lineTotal.toFixed(2)}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            
            <hr className="my-4"/>

            <div className="flex justify-between mt-4 text-sm">
                <div className="w-3/5 pr-2">
                    {bill.notes && (
                    <>
                        <h4 className="font-semibold text-md mb-1">Notes:</h4>
                        <p className="text-xs whitespace-pre-line">{bill.notes}</p>
                    </>
                    )}
                </div>
                <div className="w-2/5 pl-2 text-right space-y-1">
                    <p>Subtotal {(!isEstimateView && bill.type === 'sales-bill') ? '(Taxable Value)' : ''}: <span className="font-semibold">{currency}{bill.subTotal.toFixed(2)}</span></p>

                    {!isEstimateView && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold">{currency}{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                    {!isEstimateView && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold">{currency}{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                    
                    {isEstimateView && <p className="text-xs text-muted-foreground">(GST not applicable for estimates)</p>}

                    <hr className="my-1 !mt-2 !mb-2 border-border"/>
                    <p className="text-lg font-bold">Total: <span className="text-xl">{currency}{bill.totalAmount.toFixed(2)}</span></p>
                </div>
            </div>

            <div className="text-center mt-8 pt-4 border-t text-xs text-muted-foreground">
              <p>Thank you for your business!</p>
              <p>--- {company.companyName} ---</p>
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
