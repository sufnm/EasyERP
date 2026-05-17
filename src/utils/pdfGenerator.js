import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a premium, highly professional invoice PDF using PDFKit.
 * Matches modern ERP design standards with clean grids, deep indigo branding,
 * and high typographic readability.
 */
export const buildInvoicePdf = (pdfPath, inv, items, invLabel, invDate) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 40, bottom: 40, left: 40, right: 40 } 
      });

      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Colors
      const primaryColor = '#4F46E5';    // Indigo
      const secondaryColor = '#7C3AED';  // Violet
      const textColor = '#111827';       // Dark Gray
      const lightTextColor = '#6B7280';  // Muted Gray
      const tableHeaderBg = '#F3F4F6';   // Cool Gray
      const alternateRowBg = '#F9FAFB'; // Extra Light Gray
      const dividerColor = '#E5E7EB';     // Light Border

      // --- 1. BRANDING HEADER ---
      // Top Colored Banner Accent Line
      doc.rect(40, 40, 515, 6)
         .fill(primaryColor);

      doc.y = 60;

      // Brand Title
      doc.fillColor(primaryColor)
         .fontSize(26)
         .font('Helvetica-Bold')
         .text('EasyERP', 40, 60);

      // Document Type & Number Header
      doc.fillColor(textColor)
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(invLabel.toUpperCase(), 300, 60, { align: 'right', width: 255 });

      doc.fillColor(lightTextColor)
         .fontSize(10)
         .font('Helvetica')
         .text(`Document #: ${inv.INVOICE_NO}`, 300, 85, { align: 'right', width: 255 });

      doc.fillColor(lightTextColor)
         .fontSize(10)
         .font('Helvetica')
         .text(`Date: ${invDate}`, 300, 98, { align: 'right', width: 255 });

      // Divider Line
      doc.y = 120;
      doc.moveTo(40, doc.y)
         .lineTo(555, doc.y)
         .strokeColor(dividerColor)
         .lineWidth(1)
         .stroke();

      // --- 2. BILLING INFORMATION BLOCK ---
      doc.y = 135;

      // Bill To Column
      doc.fillColor(lightTextColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('BILL TO', 40, doc.y, { characterSpacing: 1 });

      const customerName = inv.ENAME || 'Cash Customer';
      doc.fillColor(textColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(customerName, 40, doc.y + 15, { width: 220 });

      if (inv.VAT_NUMBER) {
        doc.fillColor(lightTextColor)
           .fontSize(9)
           .font('Helvetica')
           .text(`VAT: ${inv.VAT_NUMBER}`, 40, doc.y + 32);
      }

      // Invoice metadata column
      const paymentStatus = Number(inv.NET_AMOUNT) <= ((Number(inv.CASH_PAID || 0) + Number(inv.OTHER_PAID || 0)) + 0.01) ? 'PAID' : 'PENDING';
      const statusBg = paymentStatus === 'PAID' ? '#D1FAE5' : '#FEE2E2';
      const statusText = paymentStatus === 'PAID' ? '#065F46' : '#991B1B';

      doc.fillColor(lightTextColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('PAYMENT STATUS', 320, 135, { characterSpacing: 1 });

      // Rounded Status Badge
      doc.rect(320, 150, 75, 18)
         .fill(statusBg);

      doc.fillColor(statusText)
         .fontSize(8)
         .font('Helvetica-Bold')
         .text(paymentStatus, 320, 155, { align: 'center', width: 75 });

      // Add space before table
      doc.y = 195;

      // --- 3. ITEMS TABLE ---
      // Headers
      const colBarcodeWidth = 70;
      const colDescWidth = 150;
      const colUnitWidth = 40;
      const colQtyWidth = 40;
      const colPriceWidth = 65;
      const colVatPercentWidth = 40;
      const colVatAmtWidth = 55;
      const colTotalWidth = 55;

      const tableX = 40;
      const headersY = doc.y;

      // Table Header Row Background
      doc.rect(tableX, headersY, 515, 20)
         .fill(tableHeaderBg);

      doc.fillColor(lightTextColor)
         .fontSize(8)
         .font('Helvetica-Bold');

      let currentX = tableX;
      
      // Barcode
      doc.text('BARCODE', currentX + 5, headersY + 6, { width: colBarcodeWidth, align: 'left' });
      currentX += colBarcodeWidth;

      // Description
      doc.text('DESCRIPTION', currentX, headersY + 6, { width: colDescWidth, align: 'left' });
      currentX += colDescWidth;

      // Unit
      doc.text('UNIT', currentX, headersY + 6, { width: colUnitWidth, align: 'center' });
      currentX += colUnitWidth;

      // Qty
      doc.text('QTY', currentX, headersY + 6, { width: colQtyWidth, align: 'center' });
      currentX += colQtyWidth;

      // Price
      doc.text('PRICE', currentX, headersY + 6, { width: colPriceWidth, align: 'right' });
      currentX += colPriceWidth;

      // VAT%
      doc.text('VAT%', currentX, headersY + 6, { width: colVatPercentWidth, align: 'right' });
      currentX += colVatPercentWidth;

      // VAT Amt
      doc.text('VAT AMT', currentX, headersY + 6, { width: colVatAmtWidth, align: 'right' });
      currentX += colVatAmtWidth;

      // Total
      doc.text('TOTAL', currentX, headersY + 6, { width: colTotalWidth - 5, align: 'right' });

      doc.y = headersY + 20;

      // Table Rows
      const crate = inv.CRATE || 1;
      const currCode = inv.CURRENCY_CODE || 'SAR';

      items.forEach((item, index) => {
        const rowY = doc.y;

        // Auto Page Break if close to bottom
        if (rowY > 700) {
          doc.addPage();
          doc.y = 50;
          doc.rect(tableX, doc.y, 515, 20).fill(tableHeaderBg);
          doc.fillColor(lightTextColor).fontSize(8).font('Helvetica-Bold');
          let tX = tableX;
          doc.text('BARCODE', tX + 5, doc.y + 6, { width: colBarcodeWidth, align: 'left' }); tX += colBarcodeWidth;
          doc.text('DESCRIPTION', tX, doc.y + 6, { width: colDescWidth, align: 'left' }); tX += colDescWidth;
          doc.text('UNIT', tX, doc.y + 6, { width: colUnitWidth, align: 'center' }); tX += colUnitWidth;
          doc.text('QTY', tX, doc.y + 6, { width: colQtyWidth, align: 'center' }); tX += colQtyWidth;
          doc.text('PRICE', tX, doc.y + 6, { width: colPriceWidth, align: 'right' }); tX += colPriceWidth;
          doc.text('VAT%', tX, doc.y + 6, { width: colVatPercentWidth, align: 'right' }); tX += colVatPercentWidth;
          doc.text('VAT AMT', tX, doc.y + 6, { width: colVatAmtWidth, align: 'right' }); tX += colVatAmtWidth;
          doc.text('TOTAL', tX, doc.y + 6, { width: colTotalWidth - 5, align: 'right' });
          doc.y += 20;
        }

        const currentY = doc.y;

        // Alternating row background
        if (index % 2 !== 0) {
          doc.rect(tableX, currentY, 515, 22)
             .fill(alternateRowBg);
        }

        // Draw light bottom border for each row
        doc.moveTo(tableX, currentY + 22)
           .lineTo(555, currentY + 22)
           .strokeColor(dividerColor)
           .lineWidth(0.5)
           .stroke();

        doc.fillColor(textColor)
           .fontSize(8.5)
           .font('Helvetica');

        let drawX = tableX;

        // Barcode
        doc.text(item.BARCODE || '', drawX + 5, currentY + 7, { width: colBarcodeWidth, align: 'left', lineBreak: false });
        drawX += colBarcodeWidth;

        // Description
        doc.font('Helvetica-Bold')
           .text(item.DESCRIPTION || '', drawX, currentY + 7, { width: colDescWidth, align: 'left', lineBreak: false });
        doc.font('Helvetica');
        drawX += colDescWidth;

        // Unit
        doc.text(item.UNIT || 'Pcs', drawX, currentY + 7, { width: colUnitWidth, align: 'center' });
        drawX += colUnitWidth;

        // Qty
        doc.text((Number(item.QTY) || 0).toFixed(2), drawX, currentY + 7, { width: colQtyWidth, align: 'center' });
        drawX += colQtyWidth;

        // Price
        const unitPrice = (Number(item.UNIT_PRICE) || 0) / crate;
        doc.text(unitPrice.toFixed(2), drawX, currentY + 7, { width: colPriceWidth, align: 'right' });
        drawX += colPriceWidth;

        // VAT%
        doc.text(`${(Number(item.VAT_PERCENT) || 0).toFixed(0)}%`, drawX, currentY + 7, { width: colVatPercentWidth, align: 'right' });
        drawX += colVatPercentWidth;

        // VAT Amt
        const vatAmtVal = (Number(item.VAT_AMOUNT) || 0) / crate;
        doc.text(vatAmtVal.toFixed(2), drawX, currentY + 7, { width: colVatAmtWidth, align: 'right' });
        drawX += colVatAmtWidth;

        // Total
        const totalVal = (Number(item.ITM_TOTAL) || 0) / crate;
        doc.font('Helvetica-Bold')
           .text(totalVal.toFixed(2), drawX, currentY + 7, { width: colTotalWidth - 5, align: 'right' });

        doc.y = currentY + 22;
      });

      // --- 4. TOTALS BLOCK ---
      doc.y += 15;
      const totalsY = doc.y;

      // Auto page break if totals block won't fit
      if (totalsY > 600) {
        doc.addPage();
        doc.y = 50;
      }

      const blockWidth = 220;
      const blockX = 555 - blockWidth;

      const grossTotal = ((Number(inv.G_TOTAL) || 0) / crate).toFixed(2);
      const discAmt = ((Number(inv.DISC_AMT) || 0) / crate).toFixed(2);
      const vatAmt = ((Number(inv.VAT_AMOUNT) || 0) / crate).toFixed(2);
      const netTotal = ((Number(inv.NET_AMOUNT) || 0) / crate).toFixed(2);
      const paidAmt = (((Number(inv.CASH_PAID) || 0) + (Number(inv.OTHER_PAID) || 0)) / crate).toFixed(2);
      const balance = (((Number(inv.NET_AMOUNT) || 0) - (Number(inv.CASH_PAID) || 0) - (Number(inv.OTHER_PAID) || 0)) / crate).toFixed(2);

      const renderTotalRow = (label, amount, color = textColor, isBold = false, isNet = false) => {
        const cy = doc.y;
        doc.fillColor(isNet ? primaryColor : lightTextColor)
           .fontSize(isNet ? 11 : 9.5)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .text(label, blockX, cy);

        doc.fillColor(color)
           .fontSize(isNet ? 11 : 9.5)
           .font('Helvetica-Bold')
           .text(`${currCode} ${amount}`, blockX + 80, cy, { align: 'right', width: blockWidth - 80 });

        doc.y = cy + (isNet ? 22 : 16);
      };

      doc.y = totalsY;

      renderTotalRow('Gross Total', grossTotal);
      renderTotalRow('Discount', `-${discAmt}`, '#EF4444');
      renderTotalRow('VAT Amount', vatAmt);

      // Accent divider line before Net Total
      doc.moveTo(blockX, doc.y)
         .lineTo(555, doc.y)
         .strokeColor(primaryColor)
         .lineWidth(1)
         .stroke();

      doc.y += 6;
      renderTotalRow('Net Total', netTotal, primaryColor, true, true);
      renderTotalRow('Paid Amount', paidAmt, '#10B981');
      renderTotalRow('Balance Due', balance, '#F59E0B', true);

      // --- 5. PREMIUM PROFESSIONAL FOOTER ---
      doc.fontSize(8)
         .fillColor(lightTextColor)
         .font('Helvetica')
         .text('Thank you for your business!', 40, doc.y + 40, { align: 'center', width: 515 });

      doc.text('This is a system generated document powered by EasyERP.', 40, doc.y + 12, { align: 'center', width: 515 });

      doc.end();

      writeStream.on('finish', () => {
        resolve(pdfPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (err) {
      reject(err);
    }
  });
};
