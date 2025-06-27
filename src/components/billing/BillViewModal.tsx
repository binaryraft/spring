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
import { Printer, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper function to convert number to words (Indian numbering system)
const numberToWords = (num: number): string => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const r = (n: number, s: string) => n > 0 ? (toWords(n) + s) : '';

    const toWords = (n: number): string => {
        let str = '';
        str += r(Math.floor(n / 10000000), 'crore ');
        n %= 10000000;
        str += r(Math.floor(n / 100000), 'lakh ');
        n %= 100000;
        str += r(Math.floor(n / 1000), 'thousand ');
        n %= 1000;
        str += r(Math.floor(n / 100), 'hundred ');
        n %= 100;
        if (n > 0) {
            str += (str !== '' ? 'and ' : '') + (a[n] || b[Math.floor(n / 10)] + ' ' + a[n % 10]);
        }
        return str;
    };

    const numStr = num.toFixed(2);
    const [integerPart, decimalPart] = numStr.split('.').map(Number);

    let words = toWords(integerPart).trim();
    if (words) {
        words = words.charAt(0).toUpperCase() + words.slice(1);
    } else {
        words = 'Zero';
    }

    let decimalWords = '';
    if (decimalPart > 0) {
        decimalWords = ' and ' + toWords(decimalPart).trim() + ' paise';
    }

    return words + decimalWords + ' only';
};


interface BillViewModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  isViewingEstimate?: boolean;
}

const BillViewModal: React.FC<BillViewModalProps> = ({ bill, isOpen, onClose, isViewingEstimate = false }) => {
  const { settings, getValuableById } = useAppContext();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [billHtml, setBillHtml] = useState('');

  useEffect(() => {
    // This effect is designed to integrate with an Electron desktop app for printing.
    // It runs whenever the modal's open state changes.
    if (isOpen) {
      // @ts-ignore - Check if the Electron print API is injected into the window
      if (window.electronAPI && typeof window.electronAPI.print === 'function') {
        const printButton = document.getElementById('print-btn');

        const electronPrintHandler = (event: MouseEvent) => {
          // Prevent the default browser/React print logic from running
          event.preventDefault();
          event.stopPropagation();
          // @ts-ignore
          window.electronAPI.print();
        };

        if (printButton) {
          // We add the event listener in the 'capture' phase to ensure it runs
          // before React's default event listeners in the 'bubble' phase.
          // This is crucial for stopping propagation and preventing the default print handler.
          printButton.addEventListener('click', electronPrintHandler, true);

          // Return a cleanup function to remove the listener when the modal closes or component unmounts.
          return () => {
            printButton.removeEventListener('click', electronPrintHandler, true);
          };
        }
      }
    }
  }, [isOpen]); // Only re-run this effect when the modal opens or closes.


  const getEffectiveRateForItem = (item: BillItem): number => {
    if (!bill) return item.rate || 0;
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
    if (!bill) return '';

    const useColor = settings.enableColorBilling && !isViewingEstimate;
    
    // Define color palettes for printing - background is always white
    const color = {
      primary: useColor ? '#B58B5D' : '#000000',
      text: '#000000', // Always black for clean printing text
      textMuted: useColor ? '#555555' : '#555555',
      border: useColor ? '#EAE3D8' : '#cccccc',
      headerBg: '#ffffff', // Always white for clean printing
      signatoryBorder: useColor ? '#999999' : '#000000',
    };
    
    const pdfCurrencyDisplay = settings.currencySymbol === '₹' ? 'Rs. ' : settings.currencySymbol;
    const effectiveBillType = isViewingEstimate ? 'Estimate' : (bill.type === 'sales-bill' ? 'Sales Bill' : 'Purchase Invoice');

    const logoImageHtml = settings.showCompanyLogo && settings.companyLogo
      ? `<img src="${settings.companyLogo}" alt="Logo" style="max-width: 140px; max-height: 70px; object-fit: contain; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">`
      : '';

    const showGstColumns = bill.type === 'sales-bill' && !isViewingEstimate;
    const showHsnColumnInPdf = bill.type === 'sales-bill' && !isViewingEstimate && settings.enableHsnCode && bill.items.some(i => i.hsnCode);
    const showMakingChargeColumnInPdf = bill.type === 'sales-bill' && bill.items.some(i => i.makingCharge && i.makingCharge > 0);

    const itemsHtml = bill.items.map((item, index) => {
      const valuableDetails = getValuableById(item.valuableId);
      const effectiveRate = getEffectiveRateForItem(item);
      const taxableAmount = item.amount;
      
      return `
        <tr style="font-family: 'PT Sans', sans-serif; font-size: 9pt; border-bottom: 1px solid ${color.border};">
          <td style="padding: 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: ${color.text};">
            ${item.name}
            <span style="font-weight: normal; color: ${color.textMuted}; font-size: 8pt;">${valuableDetails ? `(${valuableDetails.name})` : ''}</span>
          </td>
          ${showHsnColumnInPdf ? `<td style="padding: 8px; text-align: center;">${item.hsnCode || '-'}</td>` : ''}
          <td style="padding: 8px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          <td style="padding: 8px; text-align: right;">${pdfCurrencyDisplay}${effectiveRate.toFixed(2)}</td>
          ${showMakingChargeColumnInPdf ? `<td style="padding: 8px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : pdfCurrencyDisplay + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          <td style="padding: 8px; text-align: right;">${pdfCurrencyDisplay}${taxableAmount.toFixed(2)}</td>
          ${showGstColumns ? `
            <td style="padding: 8px; text-align: right;">${pdfCurrencyDisplay}${(item.itemCgstAmount || 0).toFixed(2)}</td>
            <td style="padding: 8px; text-align: right;">${pdfCurrencyDisplay}${(item.itemSgstAmount || 0).toFixed(2)}</td>
          ` : ''}
        </tr>
      `;
    }).join('');

    let tableHeaders = `
      <th style="padding: 10px 8px; text-align: center;">#</th>
      <th style="padding: 10px 8px; text-align: left;">Item</th>
      ${showHsnColumnInPdf ? `<th style="padding: 10px 8px; text-align: center;">HSN</th>` : ''}
      <th style="padding: 10px 8px; text-align: right;">Qty/Wt</th>
      <th style="padding: 10px 8px; text-align: right;">Rate</th>
      ${showMakingChargeColumnInPdf ? `<th style="padding: 10px 8px; text-align: right;">MC</th>` : ''}
      <th style="padding: 10px 8px; text-align: right;">Cost</th>
      ${showGstColumns ? `
        <th style="padding: 10px 8px; text-align: right;">CGST (${settings.cgstRate}%)</th>
        <th style="padding: 10px 8px; text-align: right;">SGST (${settings.sgstRate}%)</th>
      ` : ''}
    `;

    return `
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=PT+Sans:wght@400;700&display=swap');
        body { font-family: 'PT Sans', sans-serif; color: ${color.text}; -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: #ffffff !important; }
      </style>
    </head>
    <body>
      <div id="bill-content-for-pdf" style="width: 794px; height: 1123px; margin: 0 auto; background-color: #ffffff !important; padding: 40px; box-sizing: border-box; font-size: 10pt; display: flex; flex-direction: column;">
        
        <header>
            <div style="text-align: center; margin-bottom: 25px;">
                ${logoImageHtml}
                <h1 style="font-family: 'Playfair Display', serif; font-size: 26pt; margin: 0; color: ${color.primary};">${settings.companyName}</h1>
                ${settings.slogan ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">${settings.slogan}</p>` : ''}
                <p style="margin: 6px 0 0 0; font-size: 9pt;">${settings.address}</p>
                <p style="margin: 2px 0 0 0; font-size: 9pt;">${settings.phoneNumber}</p>
                ${!isViewingEstimate && settings.gstin ? `<p style="margin: 2px 0 0 0; font-size: 9pt; font-weight: bold;">GSTIN: ${settings.gstin}</p>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="width: 60%; vertical-align: top; border: 1px solid ${color.border}; padding: 10px;">
                  <p style="margin: 0 0 5px 0; font-size: 9pt; color: ${color.textMuted};">BILL TO</p>
                  <p style="margin: 0; font-weight: bold; font-size: 11pt; color: ${color.text};">${bill.customerName || 'N/A'}</p>
                  ${bill.customerAddress ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">${bill.customerAddress}</p>`: ''}
                  ${bill.customerPhone ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">${bill.customerPhone}</p>`: ''}
                  
                </td>
                <td style="width: 40%; padding: 15px; text-align: right; vertical-align: top;">
                  <h2 style="font-family: 'Playfair Display', serif; font-size: 20pt; margin: 0 0 10px 0; color: ${color.text};">${effectiveBillType.toUpperCase()}</h2>
                  <p style="margin: 0; font-size: 9pt;"><span style="color: ${color.textMuted};">Bill #</span> ${bill.billNumber || 'N/A'}</p>
                  <p style="margin: 2px 0 0 0; font-size: 9pt;"><span style="color: ${color.textMuted};">Date:</span> ${format(new Date(bill.date), 'dd MMM, yyyy')}</p>
                </td>
              </tr>
            </table>
        </header>

        <main style="flex-grow: 1;">
            <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
              <thead style="background-color: ${color.headerBg}; color: ${color.text}; font-size: 9pt; text-transform: uppercase;">
                <tr>${tableHeaders}</tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
        </main>
        
        <footer style="padding-top: 10px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="width: 55%; vertical-align: top; padding-right: 20px;">
                   <p style="font-size: 9pt; font-weight: bold;">Amount in Words:</p>
                   <p style="font-size: 9pt; margin: 2px 0;">${numberToWords(bill.totalAmount)}</p>
                   ${bill.notes ? `
                    <h4 style="font-family: 'Playfair Display', serif; margin: 15px 0 5px 0; font-size: 10pt;">Notes</h4>
                    <p style="font-size: 8.5pt; white-space: pre-line;">${bill.notes}</p>
                  ` : ''}
                </td>
                <td style="width: 45%; vertical-align: top;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
                    <tr>
                      <td style="padding: 6px 0;">Subtotal</td>
                      <td style="padding: 6px 0; text-align: right;">${pdfCurrencyDisplay}${bill.subTotal.toFixed(2)}</td>
                    </tr>
                    ${!isViewingEstimate && bill.type === 'sales-bill' && (bill.cgstAmount || 0) > 0 ? `
                      <tr>
                        <td style="padding: 6px 0;">CGST (${settings.cgstRate}%)</td>
                        <td style="padding: 6px 0; text-align: right;">${pdfCurrencyDisplay}${(bill.cgstAmount || 0).toFixed(2)}</td>
                      </tr>
                    ` : ''}
                    ${!isViewingEstimate && bill.type === 'sales-bill' && (bill.sgstAmount || 0) > 0 ? `
                      <tr>
                        <td style="padding: 6px 0;">SGST (${settings.sgstRate}%)</td>
                        <td style="padding: 6px 0; text-align: right;">${pdfCurrencyDisplay}${(bill.sgstAmount || 0).toFixed(2)}</td>
                      </tr>
                    ` : ''}
                    <tr style="font-family: 'PT Sans', sans-serif; font-weight: bold;">
                      <td style="padding: 12px 10px; border-top: 2px solid ${color.primary}; font-size: 14pt; color: ${color.primary};">GRAND TOTAL</td>
                      <td style="padding: 12px 10px; text-align: right; border-top: 2px solid ${color.primary}; font-size: 14pt; color: ${color.primary};">${pdfCurrencyDisplay}${bill.totalAmount.toFixed(2)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            <div style="margin-top: 50px; padding-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
              <p style="font-size: 8.5pt; color: ${color.textMuted};">Thank you for your business! - ${settings.companyName}</p>
              <div style="text-align: center;">
                 <div style="width: 180px; height: 40px; border-bottom: 1px solid ${color.signatoryBorder};"></div>
                 <p style="font-size: 9pt; margin-top: 5px;">Authorised Signatory</p>
              </div>
            </div>
        </footer>
      </div>
    </body>
    </html>
    `;
  };

  useEffect(() => {
    if (bill && isOpen) {
        setBillHtml(generatePdfHtml());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill, isOpen, settings, isViewingEstimate]);

  const handleGeneratePdf = async () => {
    if (!bill) {
        alert("Error: Bill data is not available for PDF generation.");
        return;
    }
    setIsGeneratingPdf(true);

    const tempContainer = document.createElement('div');
    Object.assign(tempContainer.style, {
        position: 'absolute',
        left: '-9999px',
        top: '0px',
        width: '794px',
        height: 'auto',
        backgroundColor: 'white',
        zIndex: '-1',
    });
    
    // The HTML content itself defines a specific height, so we let the content dictate size.
    tempContainer.innerHTML = generatePdfHtml().replace('height: 1123px;', 'height: auto;');

    document.body.appendChild(tempContainer);
    
    try {
        const billContentElement = tempContainer.querySelector<HTMLElement>('#bill-content-for-pdf');
        
        if (!billContentElement) {
            throw new Error("PDF content element could not be found in the temporary container.");
        }
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const canvas = await html2canvas(billContentElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            height: billContentElement.scrollHeight, // Capture the full scroll height
            windowHeight: billContentElement.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        
        pdf.autoPrint();
        const pdfUrl = URL.createObjectURL(pdf.output('blob'));
        window.open(pdfUrl, "_blank");

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert(`An error occurred during PDF generation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        if (tempContainer.parentNode) {
           tempContainer.parentNode.removeChild(tempContainer);
        }
        setIsGeneratingPdf(false);
    }
  };
  
  if (!bill) return null;

  const effectiveBillType = isViewingEstimate ? 'Estimate' : bill.type === 'purchase' ? 'Purchase Invoice' : 'Sales Bill';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] flex flex-col print-dialog-content text-base w-full max-w-screen-xl"> 
        <DialogHeader className="print-hidden pb-4 border-b">
          <DialogTitle className="font-headline text-2xl lg:text-3xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {isViewingEstimate ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto bg-muted/30 p-4"> 
          <div className="shadow-lg" dangerouslySetInnerHTML={{ __html: billHtml }} />
        </div>
        <DialogFooter className="p-4 border-t mt-auto print-hidden">
          <Button id="print-btn" variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="text-base px-5 py-2.5 h-auto">
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4"/>
            )}
            Print
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isGeneratingPdf} className="text-base px-5 py-2.5 h-auto">Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;
