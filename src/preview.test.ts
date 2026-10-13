import { describe, expect, it } from 'vitest';
import { buildFrontFace } from './card-faces.ts';
import { PREVIEW_HEIGHT, PREVIEW_WIDTH, buildPreviewSvg } from './preview.ts';
import { members, profile, type Member } from './profile.ts';

const count = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

describe('buildPreviewSvg', () => {
  const brand = buildPreviewSvg(profile);

  it('is a 1200 x 630 image on the flat page colour', () => {
    expect([PREVIEW_WIDTH, PREVIEW_HEIGHT]).toEqual([1200, 630]);
    expect(brand).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1200" height="630" viewBox="0 0 1200 630"/);
    expect(brand).toContain('<rect width="1200" height="630" fill="#111827"/>');
  });

  it('shows the real front face, built by the same function as the card', () => {
    // Everything inside the face's root element is carried over unchanged.
    const face = buildFrontFace(profile);
    const inner = face.slice(face.indexOf('>') + 1, face.lastIndexOf('</svg>'));
    expect(brand).toContain(inner);
    expect(brand).toContain('viewBox="0 0 1020 660"');
  });

  it('keeps the card inside the centre square that chat apps crop to', () => {
    const card = brand.match(/<svg x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" viewBox="0 0 1020 660"/);
    const [x, y, width, height] = [1, 2, 3, 4].map((index) => Number(card?.[index])) as [number, number, number, number];
    expect(x + width / 2).toBeCloseTo(600, 5);
    expect(y).toBeGreaterThanOrEqual(40);
    expect(y + height).toBeLessThanOrEqual(590);
    expect(width / height).toBeCloseTo(1020 / 660, 2);
  });

  it('names nobody on the brand preview', () => {
    for (const member of members) {
      expect(brand).not.toContain(member.familyName);
      expect(brand).not.toContain(`<tspan>${member.area}</tspan>`);
    }
    expect(brand).not.toContain('Partner');
    expect(count(brand, /<text /g)).toBe(count(buildFrontFace(profile), /<text /g));
  });

  it.each(members)('says whose card it is for $slug: name and "Partner · área"', (member) => {
    const preview = buildPreviewSvg(profile, member);
    expect(preview).toContain(`>${member.name}</text>`);
    expect(preview).toMatch(new RegExp(`<tspan>Partner</tspan><tspan[^>]*> · </tspan><tspan>${member.area}</tspan>`));
    // The centre 630px square holds the card and both lines, even for the longest name.
    const card = preview.match(/<svg x="([^"]+)" y="[^"]+" width="([^"]+)"/);
    expect(Number(card?.[1])).toBeGreaterThanOrEqual(285);
    expect(Number(card?.[1]) + Number(card?.[2])).toBeLessThanOrEqual(915);
    const name = preview.match(/<text x="600" y="[^"]+" font-size="([^"]+)"[^>]*text-anchor="middle"[^>]*>[^<]*<\/text>/);
    const size = Number(name?.[1]);
    expect(size).toBeGreaterThanOrEqual(28);
    expect(member.name.length * size * 0.6).toBeLessThanOrEqual(630);
  });

  it('escapes member text', () => {
    const tricky: Member = { slug: 'x', name: 'A & <B>', givenName: 'A &', familyName: '<B>', area: 'Q&A' };
    const preview = buildPreviewSvg(profile, tricky);
    expect(preview).toContain('>A &amp; &lt;B&gt;</text>');
    expect(preview).toContain('<tspan>Q&amp;A</tspan>');
  });
});
