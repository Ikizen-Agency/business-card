import { describe, expect, it } from 'vitest';
import type { QrMatrix } from './card-faces.ts';
import { qrRasterLayout } from './export.ts';

const T = true;
const F = false;
const TINY_QR: QrMatrix = [
  [T, F, T],
  [F, F, F],
  [T, T, F],
];

describe('qrRasterLayout', () => {
  const layout = qrRasterLayout(TINY_QR);

  it('uses a whole number of pixels per module, for crisp edges', () => {
    expect(Number.isInteger(layout.moduleSize)).toBe(true);
    // 3 modules + 4 quiet modules on each side = 11; 1024 / 11 rounds up to 94.
    expect(layout.moduleSize).toBe(94);
  });

  it('is at least 1024 pixels on a side and an exact multiple of the module', () => {
    expect(layout.size).toBe(94 * 11);
    expect(layout.size).toBeGreaterThanOrEqual(1024);
  });

  it('keeps a quiet zone of four modules on every side', () => {
    expect(layout.quietZone).toBe(4 * 94);
    for (const rect of layout.rects) {
      expect(rect.x).toBeGreaterThanOrEqual(layout.quietZone);
      expect(rect.y).toBeGreaterThanOrEqual(layout.quietZone);
      expect(rect.x + rect.width).toBeLessThanOrEqual(layout.size - layout.quietZone);
      expect(rect.y + rect.height).toBeLessThanOrEqual(layout.size - layout.quietZone);
    }
  });

  it('maps each horizontal run of dark modules to one rectangle', () => {
    expect(layout.rects).toEqual([
      { x: 376, y: 376, width: 94, height: 94 },
      { x: 564, y: 376, width: 94, height: 94 },
      { x: 376, y: 564, width: 188, height: 94 },
    ]);
  });

  it('honours a larger minimum size', () => {
    const large = qrRasterLayout(TINY_QR, 2048);
    expect(large.moduleSize).toBe(187);
    expect(large.size).toBeGreaterThanOrEqual(2048);
  });

  it('stays above the minimum for a realistic 29-module symbol', () => {
    const matrix: QrMatrix = Array.from({ length: 29 }, () => Array.from({ length: 29 }, () => true));
    const realistic = qrRasterLayout(matrix);
    expect(realistic.moduleSize).toBe(28); // 1024 / 37 rounds up to 28
    expect(realistic.size).toBe(1036);
    expect(realistic.rects).toHaveLength(29);
  });
});
