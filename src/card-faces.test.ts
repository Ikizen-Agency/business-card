import { describe, expect, it } from 'vitest';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  FRONT_BACKDROP,
  NAME_MAX_WIDTH,
  backdropVisibility,
  buildBackFace,
  buildFrontFace,
  buildMemberBackFace,
  embedSvgStyle,
  escapeXml,
  estimateCaptionWidth,
  estimateTextWidth,
  fitName,
  qrModulesPath,
  type QrMatrix,
} from './card-faces.ts';
import { buildWhatsAppUrl } from './links.ts';
import { members, profile, type Member, type Profile } from './profile.ts';

const T = true;
const F = false;
/** 3x3 matrix with three horizontal runs of dark modules. */
const TINY_QR: QrMatrix = [
  [T, F, T],
  [F, F, F],
  [T, T, F],
];

const count = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

/** The tap rect and visible text of every link on a face, in document order. */
function linkAreas(face: string) {
  return [...face.matchAll(/<a ([^>]*)><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"[^>]*\/>(.*?)<\/a>/g)].map(
    (match) => {
      const text = match[6]?.match(/<text x="[^"]+" y="([^"]+)"[^>]*>([^<]*)<\/text>/);
      return {
        attributes: match[1] ?? '',
        left: Number(match[2]),
        top: Number(match[3]),
        right: Number(match[2]) + Number(match[4]),
        bottom: Number(match[3]) + Number(match[5]),
        width: Number(match[4]),
        height: Number(match[5]),
        text: text?.[2],
        baseline: text ? Number(text[1]) : undefined,
      };
    },
  );
}

/** True when two tap rects share any area. */
const overlaps = (a: ReturnType<typeof linkAreas>[number], b: ReturnType<typeof linkAreas>[number]): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

function expectNoOverlap(areas: ReturnType<typeof linkAreas>): void {
  areas.forEach((area, index) => {
    for (const other of areas.slice(index + 1)) expect(overlaps(area, other)).toBe(false);
    // Inside the card, and around its own text when it has one (cap top to baseline).
    expect(area.left).toBeGreaterThanOrEqual(0);
    expect(area.top).toBeGreaterThanOrEqual(0);
    expect(area.right).toBeLessThanOrEqual(CARD_WIDTH);
    expect(area.bottom).toBeLessThanOrEqual(CARD_HEIGHT);
    if (area.baseline !== undefined) {
      expect(area.top).toBeLessThanOrEqual(area.baseline - 26);
      expect(area.bottom).toBeGreaterThanOrEqual(area.baseline + 8);
    }
  });
}

describe('escapeXml', () => {
  it('escapes the five XML-special characters', () => {
    expect(escapeXml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f');
  });
});

describe('qrModulesPath', () => {
  it('draws one sub-path per horizontal run, inside a 4-module quiet zone', () => {
    // 3 modules + 4 quiet modules on each side = 11 modules across 110 units.
    expect(qrModulesPath(TINY_QR, 0, 0, 110)).toBe(
      'M40 40h10v10h-10zM60 40h10v10h-10zM40 60h20v10h-20z',
    );
  });

  it('offsets the symbol by the given origin', () => {
    expect(qrModulesPath([[T]], 100, 50, 90)).toBe('M140 90h10v10h-10z');
  });
});

describe('buildFrontFace', () => {
  const front = buildFrontFace(profile);

  it('is a standalone SVG with the shared card viewBox', () => {
    expect(front.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(front).toContain(`viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"`);
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(85 / 55);
  });

  it('is a pure brand face: wordmark and the services descriptor', () => {
    expect(front).toContain('>Ikizen</text>');
    expect(front).toContain('>Desarrollo Web · Identidad de Marca</text>');
    expect(front).toContain('aria-label="Ikizen. Desarrollo Web · Identidad de Marca"');
  });

  it('carries neither the headline nor the old "Agency" suffix', () => {
    expect(front).not.toContain(profile.headline.lead);
    expect(front).not.toContain(profile.headline.payoff);
    expect(front).not.toMatch(/agency/i);
  });

  it('has no links', () => {
    expect(front).not.toContain('<a ');
  });

  it('centres the wordmark on the card', () => {
    expect(front).toMatch(
      new RegExp(`<text x="${CARD_WIDTH / 2}"[^>]*text-anchor="middle"[^>]*>Ikizen</text>`),
    );
  });

  it('draws the logo as a backdrop inside a masked group', () => {
    expect(front).toContain('<mask id="front-fade"');
    const backdrop = front.match(/<g mask="url\(#front-fade\)" opacity="([^"]+)">(.*?)<\/g><\/g><\/g>/)
    expect(backdrop).not.toBeNull();
    // Strong enough to read as gold, not bronze; still a backdrop.
    expect(Number(backdrop?.[1])).toBeGreaterThanOrEqual(0.55);
    expect(Number(backdrop?.[1])).toBeLessThan(1);
    expect(Number(backdrop?.[1])).toBe(FRONT_BACKDROP.opacity);
    expect(count(backdrop?.[2] ?? '', /<ellipse /g)).toBe(2);
    expect(count(backdrop?.[2] ?? '', /<circle /g)).toBe(2);
  });

  it('keeps the whole mark recognizable: the side circles show at their outermost points', () => {
    // The left and right rings reach furthest out at mid-height.
    const reach = (0.9 * CARD_HEIGHT * (344 / 446)) / 2 - 4;
    for (const x of [CARD_WIDTH / 2 - reach, CARD_WIDTH / 2 + reach]) {
      expect(backdropVisibility(x, CARD_HEIGHT / 2)).toBeGreaterThanOrEqual(0.6);
    }
    // Top and bottom of the tall rings are untouched by the fade.
    expect(backdropVisibility(CARD_WIDTH / 2, 40)).toBe(1);
    expect(backdropVisibility(CARD_WIDTH / 2, CARD_HEIGHT - 40)).toBe(1);
  });

  it('lets no ring cross the wordmark, and next to nothing cross the services line', () => {
    const wordmark = front.match(/<text x="510" y="([^"]+)" font-size="([^"]+)"[^>]*>Ikizen<\/text>/);
    const [baseline, size] = [Number(wordmark?.[1]), Number(wordmark?.[2])];
    // Box of the letters: they measure 2.6 em across at this tracking; 2.7 em
    // leaves a margin. Cap height is 0.72 em.
    for (const x of [-1.35, -0.7, 0, 0.7, 1.35]) {
      for (const y of [baseline - size * 0.72, baseline - size * 0.36, baseline]) {
        expect(backdropVisibility(510 + x * size, y)).toBeLessThanOrEqual(0.05);
      }
    }
    const services = front.match(/<text x="510" y="([^"]+)" font-size="([^"]+)"[^>]*>Desarrollo Web/);
    const [servicesBaseline, servicesSize] = [Number(services?.[1]), Number(services?.[2])];
    expect(servicesSize).toBeGreaterThanOrEqual(32);
    for (const x of [-300, -229, -140, 0, 140, 229, 300]) {
      for (const y of [servicesBaseline - servicesSize * 0.72, servicesBaseline]) {
        expect(backdropVisibility(510 + x, y)).toBeLessThanOrEqual(0.12);
      }
    }
  });

  it('keeps softness to gradients: no blur filter and no corner band', () => {
    expect(front).toContain('<radialGradient id="front-glow"');
    expect(front).not.toContain('<filter');
    expect(front).not.toContain('<polygon');
  });
});

describe('buildBackFace', () => {
  const back = buildBackFace(profile, TINY_QR);

  it('leads with both parts of the headline, the payoff in bold', () => {
    expect(back).toContain('>No hacemos sitios web.</text>');
    expect(back).toMatch(/<text[^>]*font-weight="700"[^>]*>Hacemos que te recuerden\.<\/text>/);
  });

  it('has exactly three text contact lines: WhatsApp, email, website', () => {
    const textLines = linkAreas(back).filter((area) => area.text !== undefined);
    expect(textLines.map((area) => area.text)).toEqual([
      '+53 5500 2026',
      'ikizen.agency@gmail.com',
      'ikizen.vercel.app',
    ]);
    expect(textLines[1]?.attributes).toContain('href="mailto:ikizen.agency@gmail.com"');
    expect(back).not.toContain('>LinkedIn</text>');
    expect(back).not.toContain('>Facebook</text>');
  });

  it('has no social links: the networks stay in the profile and the vCard only', () => {
    expect(linkAreas(back)).toHaveLength(3);
    expect(back).not.toMatch(/linkedin|facebook/i);
    expect(profile.links.map((link) => link.id)).toEqual(['website', 'linkedin', 'facebook']);
  });

  it('is dark like the front: ink background, white and muted grey text only', () => {
    expect(back).toContain('<linearGradient id="back-paper"');
    expect(back).toContain(`<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#back-paper)"/>`);

    const textFills = [...back.matchAll(/<text[^>]*fill="([^"]+)"/g)].map((match) => match[1]);
    expect(textFills.length).toBeGreaterThan(0);
    for (const fill of textFills) expect(['#ffffff', '#9ca3af']).toContain(fill);
  });

  it('sets the headline payoff in white', () => {
    expect(back).toMatch(/<text[^>]*fill="#ffffff"[^>]*>Hacemos que te recuerden\.<\/text>/);
  });

  it('draws the contact icons in the logo gold', () => {
    const icons = [...back.matchAll(/<g aria-hidden="true"[^>]*>(.*?)<\/g>/g)].map((match) => match[1] ?? '');
    expect(icons).toHaveLength(3); // one per contact line
    for (const icon of icons) {
      const paints = [...icon.matchAll(/(?:stroke|fill)="(#[0-9a-f]{6})"/g)].map((match) => match[1]);
      expect(paints.length).toBeGreaterThan(0);
      for (const paint of paints) expect(paint).toBe('#e4a74f');
    }
  });

  it('opens every link in a new tab', () => {
    const whatsapp = escapeXml(buildWhatsAppUrl(profile.phone, profile.whatsappMessage));
    expect(back).toContain(`<a href="${whatsapp}"`);
    expect(count(back, /<a /g)).toBe(3);
    expect(count(back, /target="_blank" rel="noopener noreferrer"/g)).toBe(3);
  });

  it('names the phone line as the way into WhatsApp', () => {
    expect(back).toContain(`aria-label="Escribir por WhatsApp al ${profile.phoneDisplay}"`);
  });

  it('tiles the tap areas without overlap, each 40px or more tall on a phone', () => {
    const areas = linkAreas(back);
    expectNoOverlap(areas);
    expect(new Set(areas.map((area) => Math.round(area.height))).size).toBe(1);
    // 123 units is 40px on the 331px-wide card of a 360px viewport.
    for (const area of areas) expect(area.height).toBeGreaterThanOrEqual(123);
  });

  it('sets the three lines on the same baselines as a member card', () => {
    const patricia = members.find((member) => member.slug === 'patricia') as Member;
    const memberBaselines = linkAreas(buildMemberBackFace(profile, patricia, TINY_QR)).map((area) => area.baseline);
    expect(linkAreas(back).map((area) => area.baseline)).toEqual(memberBaselines);
  });

  it('has no corner band, and the logo only as a watermark clipped to the card', () => {
    expect(back).not.toContain('<polygon');
    expect(back).toContain('<clipPath id="back-clip">');

    const watermark = back.match(/<g clip-path="url\(#back-clip\)" opacity="([^"]+)">(.*?)<\/g><\/g><\/g>/);
    expect(watermark).not.toBeNull();
    expect(Number(watermark?.[1])).toBeGreaterThan(0.05);
    expect(Number(watermark?.[1])).toBeLessThan(0.4); // fainter than the front backdrop
    // Every ring of the face is inside that group: no second, floating logo.
    expect(count(watermark?.[2] ?? '', /<(?:ellipse|circle) /g)).toBe(4);
    expect(count(back, /<(?:ellipse|circle) /g)).toBe(4);
  });

  it('uses the logo gold, not flat amber or cream, for every accent', () => {
    expect(back).not.toContain('#f4ad46');
    expect(back).not.toContain('fill="#fde095"');
  });

  it('puts the QR on a plain light plate with dark modules and no frame', () => {
    expect(back).toMatch(/<rect class="qr-plate"[^>]*fill="#fbf8f1"/);
    expect(back).not.toMatch(/<rect class="qr-plate"[^>]*stroke/);
    expect(back).toMatch(/<path class="qr-modules"[^>]*fill="#111827"/);
  });

  it('gives every contact line a full-width tap area, clear of the QR plate', () => {
    const plateX = Number(back.match(/<rect class="qr-plate" x="([^"]+)"/)?.[1]);
    const textLines = linkAreas(back).filter((area) => area.text !== undefined);
    for (const area of textLines) {
      expect(area.width).toBe(540);
      expect(area.right).toBeLessThan(plateX);
    }
  });

  it('draws the QR modules from the matrix', () => {
    const d = back.match(/<path class="qr-modules" d="([^"]+)"/)?.[1] ?? '';
    expect(count(d, /M/g)).toBe(3);
  });

  it('escapes XML-special characters coming from the profile', () => {
    const tricky: Profile = {
      ...profile,
      name: 'Tom & <Jerry>',
      headline: { lead: 'Fast & "loud".', payoff: 'a < b' },
      services: ['R&D', '"Quotes"'],
      email: 'a<b@example.com',
      links: [{ id: 'website', handle: 'a<b', url: 'https://example.com/?a=1&b=2' }],
    };

    const trickyFront = buildFrontFace(tricky);
    expect(trickyFront).toContain('>Tom &amp; &lt;Jerry&gt;</text>');
    expect(trickyFront).toContain('>R&amp;D · &quot;Quotes&quot;</text>');
    expect(trickyFront).not.toContain('<Jerry>');

    const trickyBack = buildBackFace(tricky, TINY_QR);
    expect(trickyBack).toContain('>Fast &amp; &quot;loud&quot;.</text>');
    expect(trickyBack).toContain('>a &lt; b</text>');
    expect(trickyBack).toContain('>a&lt;b</text>');
    expect(trickyBack).toContain('>a&lt;b@example.com</text>');
    expect(trickyBack).toContain('href="https://example.com/?a=1&amp;b=2"');
  });
});

describe('fitName', () => {
  it('keeps every member name inside the width left free by the watermark', () => {
    for (const member of members) {
      const fit = fitName(member);
      expect(fit.lines.join(' ')).toBe(member.name);
      for (const line of fit.lines) {
        expect(estimateTextWidth(line, fit.size)).toBeLessThanOrEqual(NAME_MAX_WIDTH);
      }
      expect(fit.size).toBeGreaterThanOrEqual(40); // large enough to lead the face
    }
  });

  it('breaks the longest name into given names and family names', () => {
    const longest = [...members].sort((a, b) => b.name.length - a.name.length)[0] as Member;
    expect(longest.name).toHaveLength(34);
    expect(fitName(longest).lines).toEqual(['Yanni Alejandro', 'Fernandez Quintana']);
  });

  it('keeps a short name on one line at the largest size', () => {
    const shortest = [...members].sort((a, b) => a.name.length - b.name.length)[0] as Member;
    expect(fitName(shortest)).toEqual({ lines: ['Patricia Mieres Dias'], size: 54 });
  });

  it('shrinks rather than overflows when even a broken name is too wide', () => {
    const huge: Member = {
      slug: 'x',
      area: 'Desarrollo',
      name: 'Maximiliano Bartolomeo Hernandez-Villavicencio de la Torre',
      givenName: 'Maximiliano Bartolomeo',
      familyName: 'Hernandez-Villavicencio de la Torre',
    };
    const fit = fitName(huge);
    for (const line of fit.lines) {
      expect(estimateTextWidth(line, fit.size)).toBeLessThanOrEqual(NAME_MAX_WIDTH);
    }
    expect(fit.size).toBeGreaterThanOrEqual(32); // the card's minimum type size
  });
});

describe('buildMemberBackFace', () => {
  const yanni = members.find((member) => member.slug === 'yanni') as Member;
  const patricia = members.find((member) => member.slug === 'patricia') as Member;
  const back = buildMemberBackFace(profile, patricia, TINY_QR);
  const long = buildMemberBackFace(profile, yanni, TINY_QR);

  it('leads with the person: name in bold white, then the title and area', () => {
    expect(back).toMatch(/<text[^>]*font-weight="700"[^>]*fill="#ffffff"[^>]*>Patricia Mieres Dias<\/text>/);
    expect(back).toMatch(/<tspan>Partner<\/tspan><tspan fill="#e4a74f"> · <\/tspan><tspan>Marca<\/tspan>/);
    expect(long).toMatch(/<tspan>Partner<\/tspan><tspan fill="#e4a74f"> · <\/tspan><tspan>Desarrollo<\/tspan>/);
    expect(back).toContain('aria-label="Patricia Mieres Dias, Partner en Ikizen (Marca). Datos de contacto"');
  });

  it('sets a long name on two lines', () => {
    expect(long).toContain('>Yanni Alejandro</text>');
    expect(long).toContain('>Fernandez Quintana</text>');
  });

  it('has the same three text contact lines as the brand card', () => {
    for (const face of [back, long]) {
      expect(linkAreas(face).map((area) => area.text)).toEqual([
        '+53 5500 2026',
        'ikizen.agency@gmail.com',
        'ikizen.vercel.app',
      ]);
    }
  });

  it('has no social links and no sign-off line', () => {
    for (const face of [back, long]) {
      expect(count(face, /<a /g)).toBe(3);
      expect(face).not.toMatch(/linkedin|facebook/i);
      expect(face).not.toContain(profile.headline.payoff);
      expect(face).not.toContain(profile.headline.lead);
    }
  });

  it('shows the member phone and email when they have their own', () => {
    const own = buildMemberBackFace(profile, { ...patricia, phone: '+53 5111 2233', email: 'p@example.com' }, TINY_QR);
    expect(own).toContain('<a href="https://wa.me/5351112233?');
    expect(own).toContain('>+53 5111 2233</text>');
    expect(own).toContain('<a href="mailto:p@example.com"');
    expect(own).not.toContain(`>${profile.phoneDisplay}</text>`);
    expect(own).not.toContain(profile.email);
  });

  it('gives each contact line a tap area of 40px or more on a phone, without overlap', () => {
    for (const face of [back, long]) {
      const areas = linkAreas(face);
      expectNoOverlap(areas);
      // 123 units is 40px on the 331px-wide card of a 360px viewport.
      for (const area of areas) expect(area.height).toBeGreaterThanOrEqual(123);
      // The first tap area starts below the name block and its divider.
      const dividerY = Number(face.match(/<rect x="92" y="([^"]+)" width="520" height="3"/)?.[1]);
      expect(areas[0]?.top).toBeGreaterThan(dividerY);
    }
  });

  it('shares the dark design system of the brand back', () => {
    expect(back).toContain(`fill="url(#back-paper)"/>`);
    expect(back).toContain('<clipPath id="back-clip">');
    expect(back).toMatch(/<rect class="qr-plate"[^>]*fill="#fbf8f1"/);
    expect(back).not.toContain('<polygon');
  });

  it('escapes XML-special characters in the member data', () => {
    const tricky = buildMemberBackFace(
      profile,
      { slug: 'x', name: 'A & <B>', givenName: 'A &', familyName: '<B>', title: 'R&D', area: 'Q&A' },
      TINY_QR,
    );
    expect(tricky).toContain('>A &amp; &lt;B&gt;</text>');
    expect(tricky).toContain('<tspan>R&amp;D</tspan>');
    expect(tricky).toContain('<tspan>Q&amp;A</tspan>');
  });
});

describe('brand back face, after adding member cards', () => {
  it('still leads with the headline and names no member', () => {
    const back = buildBackFace(profile, TINY_QR);
    expect(back).toContain('>No hacemos sitios web.</text>');
    expect(back).toContain('aria-label="Datos de contacto"');
    for (const member of members) expect(back).not.toContain(member.familyName);
  });
});

describe('QR control on the back faces', () => {
  const patricia = members.find((member) => member.slug === 'patricia') as Member;
  const backs = {
    brand: buildBackFace(profile, TINY_QR),
    member: buildMemberBackFace(profile, patricia, TINY_QR),
  };

  it.each(Object.entries(backs))('makes the QR plate of the %s card a button that enlarges it', (_name, back) => {
    const control = back.match(
      /<g class="qr-open" role="button" tabindex="0" aria-label="Ampliar código QR">(.*?)<\/g>/,
    )?.[1];
    expect(control).toBeDefined();
    expect(control).toContain('class="qr-plate"');
    expect(control).toContain('class="qr-modules"');
    // Exactly one such control, and the code is no longer a plain image.
    expect(count(back, /role="button"/g)).toBe(1);
    expect(back).not.toContain('role="img"');
  });

  it.each(Object.entries(backs))('invites the tap with the same caption on the %s card', (_name, back) => {
    expect(back).toContain('>Toca para ampliar</text>');
    expect(back).not.toContain('Escanear');
  });

  it.each(Object.entries(backs))('keeps that caption inside the safe margin on the %s card', (_name, back) => {
    const caption = back.match(/<text x="([^"]+)" y="([^"]+)" font-size="([^"]+)"[^>]*text-anchor="middle"[^>]*>Toca para ampliar<\/text>/);
    expect(caption).not.toBeNull();
    const [center, baseline, size] = [Number(caption?.[1]), Number(caption?.[2]), Number(caption?.[3])];

    expect(size).toBeGreaterThanOrEqual(32); // the card's minimum type size
    expect(baseline).toBe(CARD_HEIGHT - 92);
    const halfWidth = estimateCaptionWidth('Toca para ampliar', size) / 2;
    expect(center + halfWidth).toBeLessThanOrEqual(CARD_WIDTH - 92);

    // The plate stays whole, inside the margin, and centred over its caption.
    const plate = back.match(/<rect class="qr-plate" x="([^"]+)" y="[^"]+" width="([^"]+)"/);
    const [plateX, plateSize] = [Number(plate?.[1]), Number(plate?.[2])];
    expect(plateSize).toBeGreaterThanOrEqual(140);
    expect(plateSize).toBeLessThanOrEqual(160);
    expect(plateX + plateSize / 2).toBeCloseTo(center, 5);
    expect(plateX + plateSize).toBeLessThanOrEqual(CARD_WIDTH - 92);
    // Contact tap areas (76 to 616) and the member sign-off stay clear of both.
    expect(center - halfWidth).toBeGreaterThan(616);
  });

  it.each(Object.entries(backs))('gives the small QR of the %s card a tap area of 44px or more', (_name, back) => {
    const hit = back.match(/<rect class="qr-hit" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="transparent"\/>/);
    expect(hit).not.toBeNull();
    const [left, top, width, height] = [1, 2, 3, 4].map((index) => Number(hit?.[index])) as [number, number, number, number];
    // 136 units is 44px on the 331px-wide card of a 360px viewport.
    expect(width).toBeGreaterThanOrEqual(136);
    expect(height).toBeGreaterThanOrEqual(136);
    expect(left + width).toBeLessThanOrEqual(CARD_WIDTH);
    expect(top + height).toBeLessThanOrEqual(CARD_HEIGHT);
    // It covers the plate and the caption, and stays clear of the contact lines.
    const plate = back.match(/<rect class="qr-plate" x="([^"]+)" y="([^"]+)" width="([^"]+)"/);
    const [plateX, plateY, plateSize] = [1, 2, 3].map((index) => Number(plate?.[index])) as [number, number, number];
    expect(left).toBeLessThanOrEqual(plateX);
    expect(top).toBeLessThanOrEqual(plateY);
    expect(left + width).toBeGreaterThanOrEqual(plateX + plateSize);
    expect(top + height).toBeGreaterThanOrEqual(CARD_HEIGHT - 92);
    for (const area of linkAreas(back)) expect(area.right).toBeLessThanOrEqual(left);
  });

  it('adds no control to the front', () => {
    expect(buildFrontFace(profile)).not.toContain('role="button"');
  });
});

describe('embedSvgStyle', () => {
  it('adds a style element as the first child of the root', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect/></svg>';
    expect(embedSvgStyle(svg, '@font-face{font-family:X}')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><style>@font-face{font-family:X}</style><rect/></svg>',
    );
  });
});
