
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
    
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const canvas = await html2canvas(billContentElement, {
            scale: 2, 
            useCORS: true,
            logging: true, 
            backgroundColor: "#ffffff", // Ensure canvas itself has white background
            width: billContentElement.scrollWidth,
            height: billContentElement.scrollHeight,
            windowWidth: billContentElement.scrollWidth,
            windowHeight: billContentElement.scrollHeight,
            onclone: (documentClone) => {
                const clonedContent = documentClone.getElementById('bill-to-print');
                if (clonedContent) {
                    clonedContent.style.backgroundColor = '#ffffff !important';
                    clonedContent.style.margin = '0';
                    clonedContent.style.padding = '15mm'; // Simulate page margins
                    clonedContent.style.boxSizing = 'border-box';
                    clonedContent.style.width = '210mm'; 

                    const allElements = clonedContent.getElementsByTagName('*');
                    for (let i = 0; i < allElements.length; i++) {
                        const el = allElements[i] as HTMLElement;
                        if (el.style) { 
                            el.style.color = '#000000 !important';
                            el.style.backgroundColor = 'transparent !important'; 
                            el.style.webkitPrintColorAdjust = 'exact';
                            el.style.printColorAdjust = 'exact';
                            el.style.boxShadow = 'none !important';
                            el.style.borderCollapse = 'collapse';
                        }
                    }
                    
                    const tables = clonedContent.getElementsByTagName('table');
                    for (let i = 0; i < tables.length; i++) {
                        tables[i].style.width = '100%';
                        tables[i].style.border = '1px solid #cccccc !important';
                        tables[i].style.fontSize = '9pt'; // Smaller font for tables in PDF
                    }
                    const ths = clonedContent.getElementsByTagName('th');
                    for (let i = 0; i < ths.length; i++) {
                        ths[i].style.border = '1px solid #cccccc !important';
                        ths[i].style.padding = '4px !important';
                        ths[i].style.backgroundColor = '#f0f0f0 !important'; 
                        ths[i].style.textAlign = 'left';
                    }
                    const tds = clonedContent.getElementsByTagName('td');
                    for (let i = 0; i < tds.length; i++) {
                        tds[i].style.border = '1px solid #cccccc !important';
                        tds[i].style.padding = '4px !important';
                    }
                    
                    const separators = clonedContent.querySelectorAll('hr, [role="separator"]');
                    separators.forEach(sep => {
                        (sep as HTMLElement).style.borderColor = '#cccccc !important';
                        (sep as HTMLElement).style.borderBottomWidth = '1px !important';
                        (sep as HTMLElement).style.backgroundColor = '#cccccc !important';
                        (sep as HTMLElement).style.height = '1px !important';
                    });

                    const logo = clonedContent.querySelector('.print-logo') as HTMLElement;
                    if (logo) {
                        logo.style.filter = 'grayscale(100%) contrast(150%) !important';
                        (logo as HTMLImageElement).style.maxWidth = '80px !important';
                        (logo as HTMLImageElement).style.maxHeight = '40px !important';
                        (logo as HTMLImageElement).style.objectFit = 'contain';
                    }
                    const placeholderLogoSvg = clonedContent.querySelector('.print-placeholder-logo svg');
                    if (placeholderLogoSvg) {
                        (placeholderLogoSvg as HTMLElement).style.fill = '#000000 !important';
                        (placeholderLogoSvg as HTMLElement).style.stroke = '#000000 !important';
                         const parentPlaceholder = placeholderLogoSvg.parentElement;
                         if(parentPlaceholder){
                            parentPlaceholder.style.border = '1px solid #000000 !important';
                            (parentPlaceholder as HTMLElement).style.width = '40px !important';
                            (parentPlaceholder as HTMLElement).style.height = '40px !important';
                         }
                    }
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');
        if (imgData.length < 200) { 
             console.error("Generated canvas image is too small or empty. Length:", imgData.length);
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
        
        const availableWidth = pdfWidth - 2 * margin;
        const availableHeight = pdfHeight - 2 * margin;

        let ratio = Math.min(availableWidth / canvasImgWidth, availableHeight / canvasImgHeight);
        
        const finalPdfImgWidth = canvasImgWidth * ratio;
        const finalPdfImgHeight = canvasImgHeight * ratio;

        const x = margin + (availableWidth - finalPdfImgWidth) / 2;
        const y = margin + (availableHeight - finalPdfImgHeight) / 2;
        
        if (finalPdfImgWidth <= 0 || finalPdfImgHeight <= 0) {
            console.error("Calculated PDF image dimensions are invalid (<=0). Width:", finalPdfImgWidth, "Height:", finalPdfImgHeight);
            setIsGeneratingPdf(false);
            return;
        }

        pdf.addImage(imgData, 'PNG', x, y, finalPdfImgWidth, finalPdfImgHeight);
        pdf.output('dataurlnewwindow');

    } catch (error) {
        console.error("Error generating PDF with html2canvas and jspdf:", error);
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
    return item.rate || 0; // For sales, rate is direct
  };

  const PlaceholderLogo = () => (
    <div className="w-16 h-16 bg-muted/50 flex items-center justify-center rounded print-placeholder-logo">
      <Building className="w-8 h-8 text-muted-foreground" />
    </div>
  );

  const showItemLevelGst = bill.type === 'sales-bill' && !isEstimateView;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription>
            {isEstimateView ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1"> 
          <div id="bill-to-print" className="p-6 border rounded-lg bg-card shadow-sm text-foreground">
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
                    {(bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && 
                        <th className="py-2 px-1 text-right font-semibold border border-border">Making</th>}
                    <th className="py-2 px-1 text-right font-semibold border border-border">Taxable Amt</th>
                    {showItemLevelGst && (
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
                    const taxableAmount = item.amount; // item.amount is the taxable amount
                    const itemCgst = showItemLevelGst ? (item.itemCgstAmount || 0) : 0;
                    const itemSgst = showItemLevelGst ? (item.itemSgstAmount || 0) : 0;
                    const lineTotal = taxableAmount + itemCgst + itemSgst;

                    return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="py-2 px-1 border border-border">{index + 1}</td>
                      <td className="py-2 px-1 border border-border">
                        {item.name} {valuableDetails ? `(${valuableDetails.name})` : ''}
                      </td>
                      <td className="py-2 px-1 text-right border border-border">{item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} {item.unit}</td>
                      <td className="py-2 px-1 text-right border border-border">{effectiveRate.toFixed(2)}</td>
                      {(bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0)) && (
                        <td className="py-2 px-1 text-right border border-border">
                          {item.makingCharge && item.makingCharge > 0 ?
                           (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : item.makingCharge.toFixed(2))
                           : '-'}
                        </td>
                      )}
                      <td className="py-2 px-1 text-right border border-border">{taxableAmount.toFixed(2)}</td>
                      {showItemLevelGst && (
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
                <p>Subtotal (Taxable): <span className="font-semibold">{bill.subTotal.toFixed(2)}</span></p>

                {bill.type === 'sales-bill' && !isEstimateView && (bill.cgstAmount || 0) > 0 && <p>Total CGST ({settings.cgstRate}%): <span className="font-semibold">{(bill.cgstAmount || 0).toFixed(2)}</span></p>}
                {bill.type === 'sales-bill' && !isEstimateView && (bill.sgstAmount || 0) > 0 && <p>Total SGST ({settings.sgstRate}%): <span className="font-semibold">{(bill.sgstAmount || 0).toFixed(2)}</span></p>}
                
                {/* For estimates, bill.cgstAmount and bill.sgstAmount will be 0 based on getCurrentBillData logic */}
                {isEstimateView && <p className="text-xs text-muted-foreground">(GST not applied on estimates)</p>}


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
        <DialogFooter className="p-4 border-t mt-auto">
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
