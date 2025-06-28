
import type { Bill, BillItem, Settings, Valuable } from '@/types';
import { format } from 'date-fns';

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


const getEffectiveRateForItem = (item: BillItem, bill: Bill, getValuableById: (id: string) => Valuable | undefined): number => {
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

export const generateBillHtml = (bill: Bill, settings: Settings, getValuableById: (id: string) => Valuable | undefined, isViewingEstimate = false): string => {
    const isDeliveryVoucher = bill.type === 'delivery-voucher';
    const useColor = settings.enableColorBilling && !isViewingEstimate && !isDeliveryVoucher;
    
    const color = {
      primary: useColor ? '#B58B5D' : '#000000',
      text: '#000000',
      textMuted: '#555555',
      border: useColor ? '#EAE3D8' : '#cccccc',
      headerBg: '#ffffff',
      signatoryBorder: '#000000',
    };
    
    const pdfCurrencyDisplay = settings.currencySymbol === '₹' ? 'Rs. ' : settings.currencySymbol;
    const effectiveBillType = isViewingEstimate ? 'Estimate' : isDeliveryVoucher ? 'Delivery Voucher' : (bill.type === 'sales-bill' ? 'Sales Bill' : 'Purchase Invoice');

    const logoImageHtml = settings.showCompanyLogo && settings.companyLogo
      ? `<img src="${settings.companyLogo}" alt="Logo" style="max-width: 140px; max-height: 70px; object-fit: contain; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto;">`
      : '';

    const showGstColumns = bill.type === 'sales-bill' && !isViewingEstimate;
    const showHsnColumnInPdf = (bill.type === 'sales-bill' || isDeliveryVoucher) && !isViewingEstimate && settings.enableHsnCode && bill.items.some(i => i.hsnCode);
    const showMakingChargeColumnInPdf = bill.type === 'sales-bill' && !isDeliveryVoucher && bill.items.some(i => i.makingCharge && i.makingCharge > 0);

    const itemsHtml = bill.items.map((item, index) => {
      const valuableDetails = getValuableById(item.valuableId);
      const effectiveRate = getEffectiveRateForItem(item, bill, getValuableById);
      
      return `
        <tr style="font-family: 'PT Sans', sans-serif; font-size: 9pt; border-bottom: 1px solid ${color.border};">
          <td style="padding: 8px; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; font-weight: bold; color: ${color.text};">
            ${item.name}
            <span style="font-weight: normal; color: ${color.textMuted}; font-size: 8pt;">${valuableDetails ? `(${valuableDetails.name})` : ''}</span>
          </td>
          ${showHsnColumnInPdf ? `<td style="padding: 8px; text-align: center;">${item.hsnCode || '-'}</td>` : ''}
          <td style="padding: 8px; text-align: right;">${item.weightOrQuantity.toFixed(item.unit === 'carat' || item.unit === 'ct' ? 3 : 2)} ${item.unit}</td>
          ${!isDeliveryVoucher ? `<td style="padding: 8px; text-align: right;">${pdfCurrencyDisplay}${effectiveRate.toFixed(2)}</td>` : ''}
          ${showMakingChargeColumnInPdf ? `<td style="padding: 8px; text-align: right;">${item.makingCharge && item.makingCharge > 0 ? (item.makingChargeType === 'percentage' ? `${item.makingCharge}%` : pdfCurrencyDisplay + item.makingCharge.toFixed(2)) : '-'}</td>` : ''}
          ${!isDeliveryVoucher ? `<td style="padding: 8px; text-align: right;">${pdfCurrencyDisplay}${item.amount.toFixed(2)}</td>` : ''}
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
      ${!isDeliveryVoucher ? `<th style="padding: 10px 8px; text-align: right;">Rate</th>` : ''}
      ${showMakingChargeColumnInPdf ? `<th style="padding: 10px 8px; text-align: right;">MC</th>` : ''}
      ${!isDeliveryVoucher ? `<th style="padding: 10px 8px; text-align: right;">Cost</th>` : ''}
      ${showGstColumns ? `
        <th style="padding: 10px 8px; text-align: right;">CGST (${settings.cgstRate}%)</th>
        <th style="padding: 10px 8px; text-align: right;">SGST (${settings.sgstRate}%)</th>
      ` : ''}
    `;

    const customerLabel = isDeliveryVoucher ? 'DELIVER TO' : 'BILL TO';
    
    return `
      <div id="bill-content-for-print" style="width: 210mm; margin: 0 auto; background-color: #ffffff; padding: 40px; box-sizing: border-box; font-size: 10pt; display: flex; flex-direction: column;">
        
        <header>
            <div style="text-align: center; margin-bottom: 25px;">
                ${logoImageHtml}
                <h1 style="font-family: 'Playfair Display', serif; font-size: 26pt; margin: 0; color: ${color.primary};">${settings.companyName}</h1>
                ${settings.slogan ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">${settings.slogan}</p>` : ''}
                <p style="margin: 6px 0 0 0; font-size: 9pt;">${settings.place}</p>
                <p style="margin: 2px 0 0 0; font-size: 9pt;">${settings.phoneNumber}</p>
                ${!isViewingEstimate && settings.gstin ? `<p style="margin: 2px 0 0 0; font-size: 9pt; font-weight: bold;">GSTIN: ${settings.gstin}</p>` : ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="width: 60%; vertical-align: top; border: 1px solid ${color.border}; padding: 10px;">
                  <p style="margin: 0 0 5px 0; font-size: 9pt; color: ${color.textMuted};">${customerLabel}</p>
                  <p style="margin: 0; font-weight: bold; font-size: 11pt; color: ${color.text};">${bill.customerName || 'N/A'}</p>
                  ${bill.customerPlace ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">${bill.customerPlace}</p>`: ''}
                  ${bill.customerPhone ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">${bill.customerPhone}</p>`: ''}
                  ${bill.customerGstin ? `<p style="margin: 2px 0 0 0; font-size: 9pt;">GSTIN: ${bill.customerGstin}</p>`: ''}
                  
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
        
        <footer style="padding-top: 10px; margin-top: auto;">
          ${!isDeliveryVoucher ? `
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
          ` : `
            <div style="margin-top: 20px;">
              ${bill.notes ? `
                <h4 style="font-family: 'Playfair Display', serif; margin: 15px 0 5px 0; font-size: 10pt;">Notes</h4>
                <p style="font-size: 8.5pt; white-space: pre-line;">${bill.notes}</p>
              ` : ''}
              <div style="margin-top: 20px; padding: 10px; border: 1px solid ${color.border}; text-align: center; font-size: 10pt;">This is a delivery voucher and not a tax invoice.</div>
            </div>
          `}
            
            <div style="margin-top: 50px; padding-top: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
              <p style="font-size: 8.5pt; color: ${color.textMuted};">Thank you for your business! - ${settings.companyName}</p>
              <div style="text-align: center;">
                 <div style="width: 180px; height: 40px; border-bottom: 1px solid ${color.signatoryBorder};"></div>
                 <p style="font-size: 9pt; margin-top: 5px;">Authorised Signatory</p>
              </div>
            </div>
        </footer>
      </div>
    `;
};

export const directPrint = (bill: Bill, settings: Settings, getValuableById: (id: string) => Valuable | undefined, isEstimate = false) => {
  const htmlContent = generateBillHtml(bill, settings, getValuableById, isEstimate);
  
  const printRoot = document.getElementById('print-root');
  if (!printRoot) {
    console.error('Print root element not found.');
    return;
  }
  
  printRoot.innerHTML = htmlContent;

  const appRoot = document.getElementById('app-root');
  if(appRoot) appRoot.style.display = 'none';
  document.body.classList.add('print-capture-active');
  
  if (window.electronAPI && typeof window.electronAPI.print === 'function') {
    window.electronAPI.print();
  } else {
    window.print();
  }
  
  // Optional: Clean up after a delay
  setTimeout(() => {
    printRoot.innerHTML = '';
    if(appRoot) appRoot.style.display = 'block';
    document.body.classList.remove('print-capture-active');
  }, 500);
};
