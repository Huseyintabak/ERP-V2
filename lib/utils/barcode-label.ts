/**
 * Barcode Label Printing Utilities
 *
 * Supports:
 * - PDF generation with JsBarcode
 * - QR codes
 * - Multiple label formats
 * - Zebra ZPL format for thermal printers
 */

import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export type ProductType = 'finished' | 'semi_finished' | 'raw_material';

export interface LabelProduct {
  id: string;
  code: string;
  name: string;
  barcode: string;
  type: ProductType;
  unit?: string;
  category?: string;
  price?: number;
}

export interface LabelOptions {
  format: 'png' | 'zpl';
  labelSize: 'small' | 'medium' | 'large'; // 40x30mm, 50x40mm, 100x50mm
  includeQR?: boolean;
  includePrice?: boolean;
  copies?: number; // Number of copies per label
  barcodeType?: 'CODE128' | 'EAN13' | 'CODE39' | 'ITF14';
}

export interface LabelDimensions {
  width: number;
  height: number;
  margin: number;
  barcodeHeight: number;
  fontSize: number;
}

const LABEL_SIZES: Record<LabelOptions['labelSize'], LabelDimensions> = {
  small: {
    width: 40,
    height: 30,
    margin: 2,
    barcodeHeight: 8,
    fontSize: 6,
  },
  medium: {
    width: 50,
    height: 40,
    margin: 3,
    barcodeHeight: 10,
    fontSize: 8,
  },
  large: {
    width: 100,
    height: 50,
    margin: 4,
    barcodeHeight: 12,
    fontSize: 10,
  },
};

/**
 * Generate barcode as base64 image
 */
async function generateBarcodeImage(
  barcode: string,
  type: string = 'CODE128'
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcode, {
        format: type,
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0,
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate QR code as base64 image
 */
async function generateQRCodeImage(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 100,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('QR code generation error:', error);
    throw error;
  }
}

/**
 * Generate PDF labels
 */
export async function generatePDFLabels(
  products: LabelProduct[],
  options: LabelOptions
): Promise<Blob> {
  const dims = LABEL_SIZES[options.labelSize];
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [dims.width, dims.height],
  });

  let isFirstPage = true;

  for (const product of products) {
    const copies = options.copies || 1;

    for (let copy = 0; copy < copies; copy++) {
      if (!isFirstPage) {
        doc.addPage([dims.width, dims.height]);
      }
      isFirstPage = false;

      try {
        // Generate barcode
        const barcodeImage = await generateBarcodeImage(
          product.barcode,
          options.barcodeType
        );

        let currentY = dims.margin + 2;

        // Draw border
        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.rect(0.5, 0.5, dims.width - 1, dims.height - 1);

        // 1. Header: Product Name (centered, bold)
        doc.setFontSize(dims.fontSize + 2);
        doc.setFont('helvetica', 'bold');
        const maxNameWidth = dims.width - dims.margin * 2;
        const productName = doc.splitTextToSize(product.name, maxNameWidth)[0];
        doc.text(productName, dims.width / 2, currentY + 3, { align: 'center' });
        currentY += dims.fontSize / 2 + 5;

        // Separator line 1
        doc.setLineWidth(0.2);
        doc.line(dims.margin, currentY, dims.width - dims.margin, currentY);
        currentY += 3;

        // 2. Middle Section: QR + Info
        const sectionStartY = currentY;

        if (options.includeQR) {
          // QR Code on LEFT
          const qrData = product.barcode;
          const qrImage = await generateQRCodeImage(qrData);
          const qrSize = options.labelSize === 'large' ? 20 : 15;
          const qrX = dims.margin + 1;
          const qrY = currentY;
          doc.addImage(qrImage, 'PNG', qrX, qrY, qrSize, qrSize);

          // Info on RIGHT
          const infoX = qrX + qrSize + 3;
          const infoY = currentY + 4;

          doc.setFontSize(dims.fontSize - 1);
          doc.setFont('helvetica', 'normal');
          doc.text(`Code: ${product.code}`, infoX, infoY, { align: 'left' });
          doc.text(`Cat: ${product.category || ''}`, infoX, infoY + 4, { align: 'left' });

          if (options.includePrice && product.price) {
            doc.text(`Fiyat: ${product.price.toFixed(2)} TL`, infoX, infoY + 8, { align: 'left' });
          }

          currentY += qrSize + 3;
        } else {
          // Centered Info (no QR)
          doc.setFontSize(dims.fontSize);
          doc.setFont('helvetica', 'normal');
          doc.text(`Code: ${product.code}`, dims.width / 2, currentY + 2, { align: 'center' });
          currentY += 5;
          doc.setFontSize(dims.fontSize - 1);
          doc.text(product.category || '', dims.width / 2, currentY + 2, { align: 'center' });
          currentY += 5;
        }

        // Separator line 2
        doc.setLineWidth(0.2);
        doc.line(dims.margin, currentY, dims.width - dims.margin, currentY);
        currentY += 3;

        // 3. Bottom Section: Barcode (centered)
        const barcodeWidth = dims.width - dims.margin * 6;
        const barcodeX = (dims.width - barcodeWidth) / 2;
        doc.addImage(
          barcodeImage,
          'PNG',
          barcodeX,
          currentY,
          barcodeWidth,
          dims.barcodeHeight
        );
        currentY += dims.barcodeHeight + 1;

        // Barcode number below barcode
        doc.setFontSize(dims.fontSize - 1);
        doc.setFont('helvetica', 'normal');
        doc.text(product.barcode, dims.width / 2, currentY + 1, { align: 'center' });

        // Unit info at bottom if available
        if (product.unit) {
          doc.setFontSize(dims.fontSize - 2);
          doc.setFont('helvetica', 'normal');
          doc.text(product.unit, dims.width / 2, dims.height - dims.margin, {
            align: 'center',
          });
        }
      } catch (error) {
        console.error(`Error generating label for ${product.code}:`, error);
      }
    }
  }

  return doc.output('blob');
}

/**
 * Generate PNG/JPEG labels using canvas - matches ZPL layout exactly
 */
export async function generateImageLabels(
  products: LabelProduct[],
  options: LabelOptions
): Promise<Blob[]> {
  const dims = LABEL_SIZES[options.labelSize];
  const dpi = 300; // High quality for printing
  const mmToPixel = dpi / 25.4; // Convert mm to pixels
  const dpmm = 8; // Same as ZPL - 203 DPI thermal printer equivalent

  // Use ZPL dimensions for consistency
  const width = dims.width;
  const height = dims.height;

  const canvasWidth = Math.round(width * mmToPixel);
  const canvasHeight = Math.round(height * mmToPixel);
  const scale = mmToPixel; // Pixels per mm

  const blobs: Blob[] = [];

  for (const product of products) {
    const copies = options.copies || 1;

    for (let copy = 0; copy < copies; copy++) {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      try {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Border (matching ZPL: ^FO0,0^GB{width},{height},4^FS)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5 * scale;
        ctx.strokeRect(
          0.5 * scale,
          0.5 * scale,
          (width - 1) * scale,
          (height - 1) * scale
        );

        // 1. Header Section: Product Name (centered, bold)
        // Matching ZPL: ^CF0,{nameFontSize}^FB...
        const nameFontSize = options.labelSize === 'large' ? 60 : 45;
        const nameFontSizeMM = nameFontSize / dpmm; // Convert dots to mm

        ctx.fillStyle = '#000000';
        ctx.font = `bold ${nameFontSizeMM * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const headerY = 30 / dpmm; // ZPL: ^FO20,30
        ctx.fillText(product.name, canvasWidth / 2, headerY * scale);

        // Separator Line 1 (matching ZPL separator)
        const sepY1 = nameFontSize + 50;
        const sepY1MM = sepY1 / dpmm;
        ctx.beginPath();
        ctx.moveTo((20 / dpmm) * scale, sepY1MM * scale);
        ctx.lineTo(((width * dpmm - 20) / dpmm) * scale, sepY1MM * scale);
        ctx.lineWidth = 0.4 * scale;
        ctx.stroke();

        // 2. Middle Section: Info & QR
        const midY = sepY1 + 20;
        const midYMM = midY / dpmm;

        if (options.includeQR) {
          // QR Code on LEFT (matching ZPL: ^FO30,{midY})
          const qrSize = options.labelSize === 'large' ? 3 : 3;
          const qrSizeMM = qrSize * 30 / dpmm; // ZPL qrSize * 30 dots
          const qrData = product.barcode;

          const qrImage = await QRCode.toDataURL(qrData, {
            width: qrSizeMM * scale * 4,
            margin: 0,
            errorCorrectionLevel: 'M',
          });

          const qrImg = new Image();
          await new Promise((resolve, reject) => {
            qrImg.onload = resolve;
            qrImg.onerror = reject;
            qrImg.src = qrImage;
          });

          const qrX = 30 / dpmm; // ZPL: ^FO30
          ctx.drawImage(qrImg, qrX * scale, midYMM * scale, qrSizeMM * scale, qrSizeMM * scale);

          // Info on RIGHT (matching ZPL: infoX = qrX + qrSize*30 + 30)
          const infoX = 30 + (qrSize * 30) + 30;
          const infoXMM = infoX / dpmm;

          const infoFontSize = 30 / dpmm;
          ctx.font = `${infoFontSize * scale}px Arial`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          ctx.fillText(`Code: ${truncate(product.code, 20)}`, infoXMM * scale, midYMM * scale);
          ctx.fillText(`Cat: ${truncate(product.category || '', 15)}`, infoXMM * scale, (midYMM + 5) * scale);

          if (options.includePrice && product.price) {
            ctx.fillText(`Fiyat: ${product.price.toFixed(2)} TL`, infoXMM * scale, (midYMM + 10) * scale);
          }
        } else {
          // Centered Info (no QR)
          const infoFontSize = 35 / dpmm;
          ctx.font = `${infoFontSize * scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          ctx.fillText(`Code: ${product.code}`, canvasWidth / 2, midYMM * scale);

          const catFontSize = 30 / dpmm;
          ctx.font = `${catFontSize * scale}px Arial`;
          ctx.fillText(product.category || '', canvasWidth / 2, (midYMM + 6.5) * scale);
        }

        // Separator Line 2
        const sepY2 = height * dpmm - 130;
        const sepY2MM = sepY2 / dpmm;
        ctx.beginPath();
        ctx.moveTo((20 / dpmm) * scale, sepY2MM * scale);
        ctx.lineTo(((width * dpmm - 20) / dpmm) * scale, sepY2MM * scale);
        ctx.lineWidth = 0.4 * scale;
        ctx.stroke();

        // 3. Bottom Section: Barcode (centered)
        const barcodeY = sepY2 + 20;
        const barcodeYMM = barcodeY / dpmm;
        const barcodeHeight = 70;
        const barcodeHeightMM = barcodeHeight / dpmm;

        let barcodeData = product.barcode;
        if (options.barcodeType === 'EAN13' && barcodeData.length === 13) {
          barcodeData = barcodeData.substring(0, 12);
        }

        const barcodeCanvas = document.createElement('canvas');
        const modWidth = options.labelSize === 'large' ? 3 : 2;

        JsBarcode(barcodeCanvas, barcodeData, {
          format: options.barcodeType === 'EAN13' ? 'EAN13' : 'CODE128',
          width: modWidth,
          height: barcodeHeight * 2,
          displayValue: true,
          fontSize: 18,
          margin: 0,
          textMargin: 3,
        });

        // Center barcode (matching ZPL layout)
        // ZPL uses estimatedBarcodeWidth calculation for centering
        const barcodeRatio = barcodeCanvas.width / barcodeCanvas.height;
        const barcodeDisplayHeight = barcodeHeightMM * scale * 1.5;
        const barcodeDisplayWidth = barcodeDisplayHeight * barcodeRatio;
        const barcodeDisplayX = (canvasWidth - barcodeDisplayWidth) / 2;

        ctx.drawImage(
          barcodeCanvas,
          barcodeDisplayX,
          barcodeYMM * scale,
          barcodeDisplayWidth,
          barcodeDisplayHeight
        );

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to create blob'));
            },
            options.format === 'png' ? 'image/png' : 'image/jpeg',
            0.95
          );
        });

        blobs.push(blob);
      } catch (error) {
        console.error(`Error generating image label for ${product.code}:`, error);
      }
    }
  }

  return blobs;
}

/**
 * Generate ZPL (Zebra Programming Language) for thermal printers
 */
export function generateZPLLabels(
  products: LabelProduct[],
  options: LabelOptions
): string {
  const dims = LABEL_SIZES[options.labelSize];
  const dpmm = 8; // 203 DPI = ~8 dots per mm

  const width = Math.round(dims.width * dpmm);
  const height = Math.round(dims.height * dpmm);

  let zpl = '';

  for (const product of products) {
    const copies = options.copies || 1;

    for (let copy = 0; copy < copies; copy++) {
      let labelZPL = `^XA\n`;

      // Label width and height
      labelZPL += `^PW${width}\n`;
      labelZPL += `^LL${height}\n`;

      // Border
      labelZPL += `^FO0,0^GB${width},${height},4^FS\n`;

      // 1. Header: Product Name
      labelZPL += `^FX Top section: Product Name\n`;
      const nameFontSize = options.labelSize === 'large' ? 60 : 45;
      labelZPL += `^CF0,${nameFontSize}\n`;
      // Center text in a block
      labelZPL += `^FO20,30^FB${width - 40},1,0,C,0^FD${product.name}\\&^FS\n`;

      // Separator Line
      const sepY1 = nameFontSize + 50;
      labelZPL += `^FO20,${sepY1}^GB${width - 40},3,3^FS\n`;

      // 2. Middle Section: Info & QR
      labelZPL += `^FX Middle section: Info & QR\n`;
      const midY = sepY1 + 20;

      if (options.includeQR) {
        // QR Code on Left
        const qrSize = options.labelSize === 'large' ? 3 : 3;
        const qrData = product.barcode;
        // Position QR on left side
        const qrX = 30;
        const qrY = midY;
        labelZPL += `^FO${qrX},${qrY}^BQN,2,${qrSize}^FDQA,${qrData}^FS\n`;

        // Info on Right
        labelZPL += `^CF0,30\n`;
        const infoX = qrX + (qrSize * 30) + 30; // Position after QR code
        labelZPL += `^FO${infoX},${midY}^FDCode: ${truncate(product.code, 20)}^FS\n`;
        labelZPL += `^FO${infoX},${midY + 40}^FDCat: ${truncate(product.category || '', 15)}^FS\n`;
        if (options.includePrice && product.price) {
          labelZPL += `^FO${infoX},${midY + 80}^FDFiyat: ${product.price.toFixed(2)} TL^FS\n`;
        }
      } else {
        // Centered Info
        labelZPL += `^CF0,35\n`;
        labelZPL += `^FO0,${midY}^FB${width},1,0,C,0^FDCode: ${product.code}\\&^FS\n`;
        labelZPL += `^CF0,30\n`;
        labelZPL += `^FO0,${midY + 50}^FB${width},1,0,C,0^FD${product.category || ''}\\&^FS\n`;
      }

      // Separator Line 2
      const sepY2 = height - 130;
      labelZPL += `^FO20,${sepY2}^GB${width - 40},3,3^FS\n`;

      // 3. Bottom Section: Barcode
      labelZPL += `^FX Bottom section: Barcode\n`;
      const barcodeY = sepY2 + 20;
      const barcodeHeight = 70;

      const modWidth = options.labelSize === 'large' ? 3 : 2;
      labelZPL += `^BY${modWidth},3,${barcodeHeight}\n`;

      let barcodeData = product.barcode;
      if (options.barcodeType === 'EAN13' && barcodeData.length === 13) {
        barcodeData = barcodeData.substring(0, 12);
      }

      // Center barcode properly based on actual barcode width
      // For EAN13: approximately 95 modules * modWidth, for CODE128: varies
      const estimatedBarcodeWidth = options.labelSize === 'large' ? 450 : 320;
      const barcodeX = Math.round((width - estimatedBarcodeWidth) / 2) + 50;

      if (options.barcodeType === 'EAN13') {
        labelZPL += `^FO${barcodeX},${barcodeY}^BEN,${barcodeHeight},Y,Y^FD${barcodeData}^FS\n`;
      } else {
        labelZPL += `^FO${barcodeX},${barcodeY}^BCN,${barcodeHeight},Y,Y,N^FD${barcodeData}^FS\n`;
      }

      labelZPL += `^XZ\n`;
      zpl += labelZPL;
    }
  }

  return zpl;
}

/**
 * Get ZPL barcode command for barcode type
 */
function getBarcodeZPLCommand(type: string): string {
  const commands: Record<string, string> = {
    CODE128: 'BCN',
    EAN13: 'BEN',
    CODE39: 'B3N',
    ITF14: 'BIN',
  };
  return commands[type] || 'BCN';
}

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Download generated labels
 */
export function downloadLabels(
  content: Blob | Blob[] | string,
  filename: string,
  format: 'png' | 'zpl'
): void {
  // Handle multiple image blobs
  if (Array.isArray(content)) {
    content.forEach((blob, index) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${index + 1}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
    return;
  }

  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: 'text/plain' })
      : content;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print image labels with exact label dimensions
 */
export async function printImageLabels(
  blobs: Blob[],
  labelSize: 'small' | 'medium' | 'large'
): Promise<void> {
  const imageUrls = await Promise.all(
    blobs.map(blob =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      })
    )
  );

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Print window blocked');
  }

  // Get label dimensions
  const dims = LABEL_SIZES[labelSize];
  const sideMargin = 2.5; // 2.5mm side margins
  const pageWidth = `${dims.width + (sideMargin * 2)}mm`;
  const pageHeight = `${dims.height}mm`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Barkod Etiketleri</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          background: white;
        }
        .label-page {
          page-break-after: always;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          width: ${pageWidth};
          height: ${pageHeight};
          padding: 0 ${sideMargin}mm;
          box-sizing: border-box;
        }
        .label-page:last-child {
          page-break-after: auto;
        }
        .label-page img {
          width: ${dims.width}mm;
          height: ${dims.height}mm;
          object-fit: contain;
          display: block;
        }
        @media print {
          @page {
            size: ${pageWidth} ${pageHeight} landscape;
            margin: 0;
          }
          body {
            margin: 0;
          }
          .label-page {
            width: ${pageWidth};
            height: ${pageHeight};
          }
        }
      </style>
    </head>
    <body>
      ${imageUrls.map(url => `
        <div class="label-page">
          <img src="${url}" alt="Barkod Etiketi" />
        </div>
      `).join('')}
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
        window.onafterprint = () => {
          window.close();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Print PDF directly (opens print dialog)
 */
export function printPDFLabels(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;

  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 100);
  };

  document.body.appendChild(iframe);
}

/**
 * Send ZPL to network printer (requires printer IP)
 */
export async function sendToZebraPrinter(
  zpl: string,
  printerIP: string,
  port: number = 9100
): Promise<void> {
  try {
    // Note: This requires a server-side endpoint or local print server
    // Browser cannot directly connect to TCP sockets
    const response = await fetch('/api/print/zebra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zpl,
        printerIP,
        port,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send to printer');
    }
  } catch (error) {
    console.error('Zebra printer error:', error);
    throw error;
  }
}

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string, type: string): boolean {
  const patterns: Record<string, RegExp> = {
    CODE128: /^[\x20-\x7E]+$/, // ASCII 32-126
    EAN13: /^\d{13}$/,
    CODE39: /^[A-Z0-9\-. $/+%]+$/,
    ITF14: /^\d{14}$/,
  };

  const pattern = patterns[type];
  return pattern ? pattern.test(barcode) : true;
}

/**
 * Generate sample barcode for testing
 */
export function generateSampleBarcode(type: string): string {
  const samples: Record<string, string> = {
    CODE128: 'SAMPLE123456',
    EAN13: '1234567890128',
    CODE39: 'SAMPLE-123',
    ITF14: '12345678901234',
  };
  return samples[type] || 'SAMPLE123';
}
