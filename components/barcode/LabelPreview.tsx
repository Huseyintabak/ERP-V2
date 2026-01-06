'use client';

import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/card';
import type { LabelProduct, LabelOptions } from '@/lib/utils/barcode-label';

interface LabelPreviewProps {
  product: LabelProduct;
  options: LabelOptions;
}

const LABEL_SIZES = {
  small: { width: 160, height: 120, scale: 4 },
  medium: { width: 250, height: 200, scale: 5 },
  large: { width: 500, height: 300, scale: 5 },
};

export function LabelPreview({ product, options }: LabelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dims = LABEL_SIZES[options.labelSize];
    canvas.width = dims.width;
    canvas.height = dims.height;

    async function drawLabel() {
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, dims.width, dims.height);

      // Draw border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, dims.width, dims.height);

      let currentY = 20;

      try {
        // Draw product name
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const maxWidth = dims.width - 30;
        const productName = truncateText(ctx, product.name, maxWidth);
        ctx.fillText(productName, dims.width / 2, currentY);
        currentY += 20;

        // Draw product code
        ctx.font = '11px Arial';
        ctx.fillText(product.code, dims.width / 2, currentY);
        currentY += 18;

        // Draw separator line
        ctx.beginPath();
        ctx.moveTo(10, currentY);
        ctx.lineTo(dims.width - 10, currentY);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        currentY += 15;

        // Draw QR code and info section
        if (options.includeQR) {
          // QR code on LEFT side
          const qrSize = options.labelSize === 'large' ? 80 : 60;
          const qrData = product.barcode;

          try {
            const qrUrl = await QRCode.toDataURL(qrData, {
              width: qrSize * 4,
              margin: 1,
              errorCorrectionLevel: 'M',
            });

            const qrImg = new Image();
            await new Promise((resolve, reject) => {
              qrImg.onload = resolve;
              qrImg.onerror = reject;
              qrImg.src = qrUrl;
            });

            // QR on left
            const qrX = 15;
            const qrY = currentY;
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

            // Info on RIGHT
            const infoX = qrX + qrSize + 20;
            const infoY = currentY + 5;

            ctx.textAlign = 'left';
            ctx.font = '11px Arial';
            ctx.fillText(`Code: ${truncateText(ctx, product.code, dims.width - infoX - 20)}`, infoX, infoY);
            ctx.fillText(`Cat: ${truncateText(ctx, product.category || '', dims.width - infoX - 20)}`, infoX, infoY + 18);

            if (options.includePrice && product.price) {
              ctx.fillText(`Fiyat: ${product.price.toFixed(2)} TL`, infoX, infoY + 36);
            }

            currentY += qrSize + 15;
          } catch (err) {
            console.error('QR generation error:', err);
            setError('QR kod oluşturulamadı');
          }
        } else {
          // Centered info when no QR
          ctx.textAlign = 'center';
          ctx.font = '12px Arial';
          ctx.fillText(`Code: ${product.code}`, dims.width / 2, currentY);
          currentY += 18;
          ctx.font = '11px Arial';
          ctx.fillText(product.category || '', dims.width / 2, currentY);
          currentY += 20;
        }

        // Draw separator line 2
        ctx.beginPath();
        ctx.moveTo(10, currentY);
        ctx.lineTo(dims.width - 10, currentY);
        ctx.stroke();
        currentY += 15;

        // Draw barcode (centered)
        const barcodeCanvas = document.createElement('canvas');
        try {
          const barcodeHeight = options.labelSize === 'large' ? 60 : options.labelSize === 'medium' ? 45 : 35;

          JsBarcode(barcodeCanvas, product.barcode, {
            format: options.barcodeType || 'CODE128',
            width: options.labelSize === 'large' ? 2 : 1.5,
            height: barcodeHeight,
            displayValue: true,
            margin: 0,
            fontSize: options.labelSize === 'large' ? 14 : 12,
          });

          // Center the barcode
          const barcodeWidth = Math.min(barcodeCanvas.width, dims.width - 40);
          const barcodeX = (dims.width - barcodeWidth) / 2;

          ctx.drawImage(
            barcodeCanvas,
            barcodeX,
            currentY,
            barcodeWidth,
            barcodeHeight
          );
          currentY += barcodeHeight + 5;
        } catch (err) {
          console.error('Barcode generation error:', err);
          setError('Barkod oluşturulamadı');
          ctx.fillStyle = '#ff0000';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Invalid Barcode', dims.width / 2, currentY);
          currentY += 15;
        }

        // Draw unit info at bottom if available (category already shown above)
        if (product.unit) {
          ctx.font = '9px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(product.unit, dims.width / 2, dims.height - 12);
        }

        setError(null);
      } catch (err) {
        console.error('Label preview error:', err);
        setError('Önizleme oluşturulamadı');
      }
    }

    drawLabel();
  }, [product, options]);

  function truncateText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string {
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) return text;

    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Etiket Önizleme
        </h3>
        <div className="bg-white p-4 rounded border-2 border-dashed border-muted">
          <canvas
            ref={canvasRef}
            className="border border-border shadow-sm"
            style={{
              imageRendering: 'crisp-edges',
            }}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <div className="text-xs text-muted-foreground text-center">
          Boyut: {options.labelSize === 'small' ? '40x30mm' : options.labelSize === 'medium' ? '50x40mm' : '100x50mm'}
          {options.copies && options.copies > 1 && ` • ${options.copies} kopya`}
        </div>
      </div>
    </Card>
  );
}
