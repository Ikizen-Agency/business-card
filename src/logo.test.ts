import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildBackFace, buildFrontFace } from './card-faces.ts';
import { LOGO_HEIGHT, LOGO_WIDTH, buildFaviconSvg, logoGradient, logoRings } from './logo.ts';
import { profile } from './profile.ts';

const count = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

describe('logoRings', () => {
  const rings = logoRings('gold');

  it('draws the four rings: two tall ellipses and two circles', () => {
    expect(count(rings, /<ellipse /g)).toBe(2);
    expect(count(rings, /<circle /g)).toBe(2);
  });

  it('strokes them with the given gradient and no fill', () => {
    expect(rings).toContain('fill="none"');
    expect(rings).toContain('stroke="url(#gold)"');
  });

  it('keeps every ring, stroke included, inside the tight logo box', () => {
    const ringBoxes = [...rings.matchAll(/c[xy]="[^"]+"[^>]*/g)].map((match) => {
      const read = (name: string): number => Number(match[0].match(new RegExp(`${name}="([^"]+)"`))?.[1]);
      const [rx, ry] = match[0].includes(' r=') ? [read('r'), read('r')] : [read('rx'), read('ry')];
      return { left: read('cx') - rx, right: read('cx') + rx, top: read('cy') - ry, bottom: read('cy') + ry };
    });
    const half = 11 / 2; // default stroke width
    expect(ringBoxes).toHaveLength(4);
    expect(Math.min(...ringBoxes.map((box) => box.left)) - half).toBeCloseTo(0, 5);
    expect(Math.max(...ringBoxes.map((box) => box.right)) + half).toBeCloseTo(LOGO_WIDTH, 5);
    expect(Math.min(...ringBoxes.map((box) => box.top)) - half).toBeCloseTo(0, 5);
    expect(Math.max(...ringBoxes.map((box) => box.bottom)) + half).toBeCloseTo(LOGO_HEIGHT, 5);
  });

  it('accepts a heavier stroke for small sizes', () => {
    expect(logoRings('gold', 26)).toContain('stroke-width="26"');
  });
});

describe('logoGradient', () => {
  it('defines a vertical per-ring gradient under the given id', () => {
    const gradient = logoGradient('gold');
    expect(gradient).toMatch(/^<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">/);
    expect(count(gradient, /<stop /g)).toBe(5);
  });
});

describe('logo on the card', () => {
  const front = buildFrontFace(profile);
  const back = buildBackFace(profile, [[true]]);

  it('is the mark of the front face, replacing the old monogram tile', () => {
    expect(count(front, /<ellipse /g)).toBe(2);
    expect(count(front, /<circle /g)).toBe(2);
    expect(front).toContain('<linearGradient id="front-gold"');
    expect(front).not.toContain('M21 17h22'); // the old slab "I"
    expect(front).not.toContain('rx="15"'); // its amber tile
  });

  it('uses ids that stay unique when both faces share one document', () => {
    const ids = [...`${front}${back}`.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('favicon', () => {
  it('is the file the shared mark builds', () => {
    const file = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
    expect(file.trim()).toBe(buildFaviconSvg());
    expect(count(file, /<ellipse /g)).toBe(2);
    expect(count(file, /<circle /g)).toBe(2);
  });
});
