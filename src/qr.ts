import qrcode from 'qrcode-generator';
import type { QrMatrix } from './card-faces.ts';

/** Encodes `text` as a QR symbol (error correction M, smallest fitting version). */
export function createQrMatrix(text: string): QrMatrix {
  const qr = qrcode(0, 'M'); // 0 = pick the version automatically
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, col) => qr.isDark(row, col)),
  );
}
