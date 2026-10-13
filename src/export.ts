import geistLatinUrl from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import { CARD_HEIGHT, CARD_WIDTH, embedSvgStyle, type QrMatrix } from './card-faces.ts';

/** Raster size relative to the SVG viewBox: 3060 x 1980 px, about 914 dpi at 85 mm. */
const EXPORT_SCALE = 3;

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the font file'));
    reader.readAsDataURL(blob);
  });
}

let fontFaceCss: Promise<string> | undefined;

/**
 * `@font-face` rule with the typeface inlined as base64. An SVG drawn through
 * an `<img>` cannot load external resources, so the font has to travel inside it.
 */
function embeddedFontCss(): Promise<string> {
  fontFaceCss ??= fetch(geistLatinUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
      return response.blob();
    })
    .then(toDataUrl)
    .then(
      (dataUrl) =>
        `@font-face{font-family:'Geist Variable';font-weight:100 900;src:url(${dataUrl}) format('woff2')}`,
    )
    .catch((error: unknown) => {
      fontFaceCss = undefined; // let the next attempt retry
      throw error;
    });
  return fontFaceCss;
}

/**
 * Rasterizes a face SVG (see card-faces.ts) to a PNG blob. Rejects on any failure.
 * `scale` is relative to the viewBox: 3 for a download, less for a lighter file to share.
 */
export async function renderFacePng(svgMarkup: string, scale: number = EXPORT_SCALE): Promise<Blob> {
  const svg = embedSvgStyle(svgMarkup, await embeddedFontCss());
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

  try {
    const image = new Image();
    image.src = svgUrl;
    await Promise.all([image.decode(), document.fonts.ready]);

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH * scale;
    canvas.height = CARD_HEIGHT * scale;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
        'image/png',
      );
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

/** Light margin required around a QR symbol, in modules. */
const QR_QUIET_ZONE = 4;
const QR_DARK = '#111827';
const QR_LIGHT = '#ffffff';

export interface QrRasterLayout {
  /** Side of one module, a whole number of pixels so edges stay crisp. */
  moduleSize: number;
  /** Side of the whole image, quiet zone included. */
  size: number;
  /** Width of the light margin on every side, in pixels. */
  quietZone: number;
  /** One rectangle per horizontal run of dark modules. */
  rects: Array<{ x: number; y: number; width: number; height: number }>;
}

/**
 * Pixel geometry of a standalone QR image: the smallest whole module size that
 * makes the image at least `minSize` pixels on a side. Pure, so it can be
 * checked without a canvas.
 */
export function qrRasterLayout(matrix: QrMatrix, minSize = 1024): QrRasterLayout {
  const modules = matrix.length + QR_QUIET_ZONE * 2;
  const moduleSize = Math.ceil(minSize / modules);
  const quietZone = QR_QUIET_ZONE * moduleSize;
  const rects: QrRasterLayout['rects'] = [];

  matrix.forEach((row, rowIndex) => {
    let col = 0;
    while (col < row.length) {
      if (!row[col]) {
        col++;
        continue;
      }
      const start = col;
      while (col < row.length && row[col]) col++;
      rects.push({
        x: quietZone + start * moduleSize,
        y: quietZone + rowIndex * moduleSize,
        width: (col - start) * moduleSize,
        height: moduleSize,
      });
    }
  });

  return { moduleSize, size: modules * moduleSize, quietZone, rects };
}

/**
 * Rasterizes just the QR code: ink modules on white with its quiet zone and
 * nothing else, so the file can be dropped into a signature, a slide or a print job.
 */
export function renderQrPng(matrix: QrMatrix): Promise<Blob> {
  const layout = qrRasterLayout(matrix);
  const canvas = document.createElement('canvas');
  canvas.width = layout.size;
  canvas.height = layout.size;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error('Canvas 2D context unavailable'));

  // Whole-pixel rectangles only: no smoothing can blur a module edge.
  context.fillStyle = QR_LIGHT;
  context.fillRect(0, 0, layout.size, layout.size);
  context.fillStyle = QR_DARK;
  for (const rect of layout.rects) context.fillRect(rect.x, rect.y, rect.width, rect.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
      'image/png',
    );
  });
}

/** Hands a blob to the browser as a file download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
