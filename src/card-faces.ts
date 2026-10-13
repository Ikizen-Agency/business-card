/**
 * The two faces of the business card as standalone SVG strings.
 *
 * Pure and DOM-free: the same markup is shown inline on the page, rasterized
 * to PNG and printed. Both faces share one viewBox with the 85 x 55 mm card
 * ratio and one safe margin. Type sizes are in viewBox units; nothing goes below
 * 32 units so text stays at about 9px on a 290px-wide card.
 */

import { ICONS, type IconName } from './icons.ts';
import { contactLines, type ContactLine } from './contacts.ts';
import { LOGO_HEIGHT, LOGO_WIDTH, logoGradient, logoRings } from './logo.ts';
import { memberTitle, type Member, type Profile } from './profile.ts';

export const CARD_WIDTH = 1020;
export const CARD_HEIGHT = 660;

/** QR symbol as rows of modules, `true` meaning dark. */
export type QrMatrix = ReadonlyArray<ReadonlyArray<boolean>>;

/** Light margin required around a QR symbol, in modules. */
const QUIET_ZONE = 4;

/** Safe margin on every side of both faces: 9% of the card width. */
const MARGIN = 92;
/** Baseline of the last line of each face, sitting on the bottom margin. */
const LAST_BASELINE = CARD_HEIGHT - MARGIN;

const INK = '#111827';
/** Solid gold for small details; one of the logo gradient's stops. */
const GOLD = '#e4a74f';
/** Warm near-white of the QR plate: scanners need a light ground. */
const PLATE = '#fbf8f1';
const MUTED_ON_INK = '#9ca3af';

const SVG_OPEN =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" ` +
  `viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" font-family="'Geist Variable', system-ui, sans-serif"`;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Inserts a `<style>` element as the first child of an SVG root. */
export function embedSvgStyle(svg: string, css: string): string {
  const rootEnd = svg.indexOf('>') + 1;
  return `${svg.slice(0, rootEnd)}<style>${css}</style>${svg.slice(rootEnd)}`;
}

/** Trims float noise so the markup stays short and stable. */
const num = (value: number): string => String(Math.round(value * 100) / 100);

/**
 * Path data for the dark modules of `matrix`, fitted with its quiet zone into
 * the square at (`x`, `y`) with side `size`. Horizontal runs become one rect.
 */
export function qrModulesPath(matrix: QrMatrix, x: number, y: number, size: number): string {
  const cell = size / (matrix.length + QUIET_ZONE * 2);
  let d = '';

  matrix.forEach((row, rowIndex) => {
    let col = 0;
    while (col < row.length) {
      if (!row[col]) {
        col++;
        continue;
      }
      const start = col;
      while (col < row.length && row[col]) col++;
      const left = x + (start + QUIET_ZONE) * cell;
      const top = y + (rowIndex + QUIET_ZONE) * cell;
      const width = (col - start) * cell;
      d += `M${num(left)} ${num(top)}h${num(width)}v${num(cell)}h-${num(width)}z`;
    }
  });
  return d;
}

/**
 * The logo scaled to `height`, with its top-left corner at (`x`, `y`).
 * `strokeWidth` is in logo units (see logo.ts) and defaults to the artwork's.
 */
function logo(x: number, y: number, height: number, gradientId: string, strokeWidth?: number): string {
  return `<g transform="translate(${num(x)} ${num(y)}) scale(${num(height / LOGO_HEIGHT)})">${logoRings(gradientId, strokeWidth)}</g>`;
}

/** One of the shared 24-unit icons as thin line art, with its left edge at `x`. */
function icon(name: IconName, x: number, cy: number, size: number, color: string): string {
  const paths = ICONS[name]
    .map(({ d, fill }: { d: string; fill?: boolean }) =>
      fill
        ? `<path d="${d}" fill="${color}"/>`
        : `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  return `<g aria-hidden="true" transform="translate(${num(x)} ${num(cy - size / 2)}) scale(${num(size / 24)})">${paths}</g>`;
}

/**
 * The dark ink ground both faces share, so they read as one object: a faint
 * diagonal sheen, enough to suggest coated stock and no more.
 */
function paperGradient(id: string): string {
  return (
    `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">` +
    '<stop offset="0" stop-color="#19212f"/><stop offset="1" stop-color="#0d131f"/>' +
    '</linearGradient>'
  );
}

/** Where the front's two lines of text sit; the backdrop's fade is built around them. */
const FRONT_TEXT = {
  wordmark: { baseline: 356, size: 118 },
  services: { baseline: 408, size: 32 },
} as const;

/**
 * Tuning of the front-face backdrop, set by eye on a phone-size card. Exported
 * so tests can hold the result: the logo must read as gold and stay whole.
 */
export const FRONT_BACKDROP = {
  /** Logo height as a share of the card height. */
  heightRatio: 0.9,
  /** Stroke in logo units: thinner than the artwork, still over 1px on a 290px card. */
  strokeWidth: 6,
  /** High enough for the gradient to read as gold; lower and it turns bronze. */
  opacity: 0.68,
  /**
   * Ellipse behind the wordmark over which the rings dissolve. It is only as
   * wide as the word, so the left and right rings stay part of the mark.
   */
  fade: {
    cx: CARD_WIDTH / 2,
    cy: FRONT_TEXT.wordmark.baseline - FRONT_TEXT.wordmark.size * 0.36, // middle of the capitals
    rx: 240,
    ry: 96,
    /** Share of the ellipse where the rings are fully hidden. */
    core: 0.8,
  },
  /**
   * Horizontal band behind the services line, which is wider than the logo: the
   * rings are hidden across its height and return over `ramp` above and below.
   */
  band: {
    top: FRONT_TEXT.services.baseline - 28,
    bottom: FRONT_TEXT.services.baseline + 4,
    ramp: 28,
  },
  glowOpacity: 0.16,
} as const;

/**
 * How much of the backdrop shows at a point of the front face, from 0 (hidden
 * behind the text) to 1 (full strength). The same numbers build the SVG mask.
 */
export function backdropVisibility(x: number, y: number): number {
  const { fade, band } = FRONT_BACKDROP;
  const distance = Math.hypot((x - fade.cx) / fade.rx, (y - fade.cy) / fade.ry);
  const outsideWord = Math.min(1, Math.max(0, (distance - fade.core) / (1 - fade.core)));
  const outsideBand = Math.min(
    1,
    Math.max(0, (band.top - y) / band.ramp, (y - band.bottom) / band.ramp),
  );
  return outsideWord * outsideBand;
}

/**
 * Brand face: symmetric. The logo is a large, crisp, faint backdrop that
 * dissolves toward the centre, where the wordmark and services line sit.
 * All softness comes from gradients (no blur filter), so the PNG export and
 * the print match the screen.
 */
export function buildFrontFace(profile: Profile): string {
  const descriptor = profile.services.join(' · ');
  const label = escapeXml(`${profile.name}. ${descriptor}`);
  const centerX = CARD_WIDTH / 2;
  const centerY = CARD_HEIGHT / 2;

  const logoHeight = CARD_HEIGHT * FRONT_BACKDROP.heightRatio;
  const logoWidth = (LOGO_WIDTH / LOGO_HEIGHT) * logoHeight;
  const { fade, band } = FRONT_BACKDROP;
  const { wordmark, services } = FRONT_TEXT;
  const fullCard = `width="${CARD_WIDTH}" height="${CARD_HEIGHT}"`;
  // The band gradient runs from where the rings start to fade to where they are back.
  const bandStart = band.top - band.ramp;
  const bandLength = band.bottom + band.ramp - bandStart;

  return (
    `${SVG_OPEN} role="img" aria-label="${label}">` +
    '<defs>' +
    paperGradient('front-paper') +
    logoGradient('front-gold') +
    // Soft gold light behind the logo.
    `<radialGradient id="front-glow" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${centerX} ${centerY}) scale(${num(CARD_WIDTH * 0.46)} ${num(CARD_HEIGHT * 0.52)})">` +
    `<stop offset="0" stop-color="#e4a74f" stop-opacity="${FRONT_BACKDROP.glowOpacity}"/>` +
    `<stop offset="0.55" stop-color="#e4a74f" stop-opacity="${num(FRONT_BACKDROP.glowOpacity * 0.3)}"/>` +
    '<stop offset="1" stop-color="#e4a74f" stop-opacity="0"/></radialGradient>' +
    // The mask is white (rings shown) with two black shapes laid over it,
    // each fading out through its own opacity: see backdropVisibility.
    `<radialGradient id="front-fade-word" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(${fade.cx} ${num(fade.cy)}) scale(${fade.rx} ${fade.ry})">` +
    `<stop offset="${fade.core}" stop-color="#000000"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="front-fade-band" gradientUnits="userSpaceOnUse" x1="0" y1="${bandStart}" x2="0" y2="${bandStart + bandLength}">` +
    '<stop offset="0" stop-color="#000000" stop-opacity="0"/>' +
    `<stop offset="${num(band.ramp / bandLength)}" stop-color="#000000"/>` +
    `<stop offset="${num(1 - band.ramp / bandLength)}" stop-color="#000000"/>` +
    '<stop offset="1" stop-color="#000000" stop-opacity="0"/></linearGradient>' +
    `<mask id="front-fade" maskUnits="userSpaceOnUse" x="0" y="0" ${fullCard}>` +
    `<rect ${fullCard} fill="#ffffff"/>` +
    `<rect ${fullCard} fill="url(#front-fade-word)"/>` +
    `<rect ${fullCard} fill="url(#front-fade-band)"/></mask>` +
    '</defs>' +
    `<rect ${fullCard} fill="url(#front-paper)"/>` +
    `<rect ${fullCard} fill="url(#front-glow)"/>` +
    `<g mask="url(#front-fade)" opacity="${FRONT_BACKDROP.opacity}">` +
    logo(centerX - logoWidth / 2, centerY - logoHeight / 2, logoHeight, 'front-gold', FRONT_BACKDROP.strokeWidth) +
    '</g>' +
    `<text x="${centerX}" y="${wordmark.baseline}" font-size="${wordmark.size}" font-weight="700" letter-spacing="-5" text-anchor="middle" fill="#ffffff">${escapeXml(profile.name)}</text>` +
    `<text x="${centerX}" y="${services.baseline}" font-size="${services.size}" font-weight="400" letter-spacing="2.5" text-anchor="middle" fill="${MUTED_ON_INK}">${escapeXml(descriptor)}</text>` +
    '</svg>'
  );
}

/** Tuning of the back-face watermark: the front's backdrop, echoed off the right edge. */
const WATERMARK = {
  /**
   * Nearly as tall as the card and centred past its right edge, so most of it
   * bleeds off and its lower ring passes to the right of the QR caption.
   */
  height: 640,
  centerX: CARD_WIDTH + 100,
  centerY: 350,
  strokeWidth: 6,
  /** Much fainter than the front: text, icons and the QR sit close to it. */
  opacity: 0.16,
} as const;

const FULL_CARD = `width="${CARD_WIDTH}" height="${CARD_HEIGHT}"`;

/** Dark ground, definitions and watermark shared by every back face. */
function backGround(): string {
  const watermarkWidth = (LOGO_WIDTH / LOGO_HEIGHT) * WATERMARK.height;
  return (
    // Each face defines its own ids: both live in one document on the page.
    '<defs>' +
    paperGradient('back-paper') +
    logoGradient('back-gold') +
    // The divider: logo gold that thins out to nothing toward the right.
    '<linearGradient id="back-divider" x1="0" y1="0" x2="1" y2="0">' +
    `<stop offset="0" stop-color="${GOLD}"/><stop offset="0.3" stop-color="#fce094"/>` +
    '<stop offset="1" stop-color="#b07634" stop-opacity="0"/></linearGradient>' +
    // Keeps the watermark's bleed inside the card in the PNG and in print.
    `<clipPath id="back-clip"><rect ${FULL_CARD}/></clipPath>` +
    '</defs>' +
    `<rect ${FULL_CARD} fill="url(#back-paper)"/>` +
    `<g clip-path="url(#back-clip)" opacity="${WATERMARK.opacity}">` +
    logo(
      WATERMARK.centerX - watermarkWidth / 2,
      WATERMARK.centerY - WATERMARK.height / 2,
      WATERMARK.height,
      'back-gold',
      WATERMARK.strokeWidth,
    ) +
    '</g>'
  );
}

/** The gold hairline that separates the lead block from the contacts. */
function divider(y: number): string {
  return `<rect x="${MARGIN}" y="${num(y)}" width="520" height="3" fill="url(#back-divider)"/>`;
}

/** Lowest point a tap area may reach: just inside the card's bottom edge. */
const TAP_AREA_FLOOR = CARD_HEIGHT - 10;

/**
 * The text contact links, one per baseline in `baselines`. Their tap areas are
 * invisible, as wide as the column, and split the band from `areaTop` to
 * `areaBottom` into equal parts, so each line gets all the height the layout
 * has: the empty space above the first and below the last included.
 */
function contactColumn(
  lines: ContactLine[],
  baselines: number[],
  areaTop: number,
  areaBottom: number,
): string {
  const areaHeight = (areaBottom - areaTop) / lines.length;
  return lines
    .map((line, index) => {
      const baseline = baselines[index] ?? LAST_BASELINE;
      const label = line.label ? ` aria-label="${escapeXml(line.label)}"` : '';
      return (
        `<a href="${escapeXml(line.href)}" target="_blank" rel="noopener noreferrer"${label}>` +
        `<rect x="${MARGIN - 16}" y="${num(areaTop + index * areaHeight)}" width="540" height="${num(areaHeight)}" fill="transparent"/>` +
        icon(line.icon, MARGIN, baseline - 12, 34, GOLD) +
        `<text x="${MARGIN + 56}" y="${num(baseline)}" font-size="34" font-weight="400" fill="#ffffff">${escapeXml(line.text)}</text>` +
        '</a>'
      );
    })
    .join('');
}

const QR_CAPTION = 'Toca para ampliar';
const QR_CAPTION_SIZE = 32;

/**
 * Conservative width of regular-weight text in card units: 0.5 em per
 * character, a little above what this caption measures in the typeface.
 */
export function estimateCaptionWidth(text: string, size: number): number {
  return text.length * size * 0.5;
}

/**
 * Side of the QR plate. Small on purpose: on the card the code is an
 * affordance, and it opens enlarged for scanning (see qr-dialog.ts).
 */
const QR_PLATE_SIZE = 150;

/**
 * QR on its light plate with the caption centred beneath it, on the last
 * baseline. The caption is wider than the plate, so the pair is placed where
 * the caption's right end sits on the safe margin.
 *
 * Plate and caption are one button. Its invisible tap area is as wide as the
 * caption and runs from just above the plate to the card's edge, so the small
 * plate is still easy to hit.
 */
function qrBlock(qr: QrMatrix): string {
  const size = QR_PLATE_SIZE;
  const halfWidth = Math.max(size, estimateCaptionWidth(QR_CAPTION, QR_CAPTION_SIZE)) / 2;
  const centerX = CARD_WIDTH - MARGIN - halfWidth;
  const x = centerX - size / 2;
  const y = LAST_BASELINE - 46 - size;
  const hitTop = y - 16;
  return (
    '<g class="qr-open" role="button" tabindex="0" aria-label="Ampliar código QR">' +
    `<rect class="qr-hit" x="${num(centerX - halfWidth)}" y="${hitTop}" width="${num(halfWidth * 2)}" height="${TAP_AREA_FLOOR - hitTop}" fill="transparent"/>` +
    `<rect class="qr-plate" x="${num(x)}" y="${y}" width="${size}" height="${size}" rx="9" fill="${PLATE}"/>` +
    `<path class="qr-modules" d="${qrModulesPath(qr, x, y, size)}" fill="${INK}"/>` +
    `<text x="${num(centerX)}" y="${LAST_BASELINE}" font-size="${QR_CAPTION_SIZE}" font-weight="400" text-anchor="middle" fill="${MUTED_ON_INK}">${QR_CAPTION}</text>` +
    '</g>'
  );
}

/**
 * Baselines of the three contact lines on every back face: widely spaced, the
 * last on the bottom margin beside the QR caption.
 */
const CONTACT_BASELINES = [LAST_BASELINE - 224, LAST_BASELINE - 112, LAST_BASELINE];

/**
 * Brand contact face: the same dark ground as the front. The headline leads, a
 * gold hairline separates it from the three contact lines, and the QR sits on
 * a small light plate. Same structure as a member's back.
 */
export function buildBackFace(profile: Profile, qr: QrMatrix): string {
  // Y of the hairline under the headline; the tap areas may start just below it.
  const dividerY = MARGIN + 132;

  return (
    `${SVG_OPEN} role="group" aria-label="Datos de contacto">` +
    backGround() +
    `<text x="${MARGIN}" y="${MARGIN + 30}" font-size="34" font-weight="400" fill="${MUTED_ON_INK}">${escapeXml(profile.headline.lead)}</text>` +
    `<text x="${MARGIN - 3}" y="${MARGIN + 96}" font-size="54" font-weight="700" letter-spacing="-1.6" fill="#ffffff">${escapeXml(profile.headline.payoff)}</text>` +
    divider(dividerY) +
    contactColumn(contactLines(profile), CONTACT_BASELINES, dividerY + 12, TAP_AREA_FLOOR) +
    qrBlock(qr) +
    '</svg>'
  );
}

// --- Member cards ----------------------------------------------------------

/**
 * Width a member's name may take: from the left margin to where the watermark
 * rings begin, above the QR plate.
 */
export const NAME_MAX_WIDTH = 760;
const NAME_MAX_SIZE = 54;
/** Below this a single line stops leading the face, so the name breaks in two. */
const NAME_MIN_SINGLE_LINE_SIZE = 40;
const NAME_MAX_TWO_LINE_SIZE = 48;
const NAME_TRACKING = -1.6;

/**
 * Conservative width of bold text in card units. A pure builder cannot measure
 * glyphs, so this assumes 0.6 em per character, above the typeface's real
 * average for names (about 0.53 em), which leaves a safety margin.
 */
export function estimateTextWidth(text: string, size: number): number {
  return text.length * (size * 0.6 + NAME_TRACKING);
}

/** Largest size, up to `maxSize`, at which `text` fits NAME_MAX_WIDTH. */
function fittingSize(text: string, maxSize: number): number {
  const perCharacter = NAME_MAX_WIDTH / Math.max(text.length, 1) - NAME_TRACKING;
  return Math.min(maxSize, Math.floor((perCharacter / 0.6) * 10) / 10);
}

/**
 * How a member's name is set: on one line when it fits at a leading size,
 * otherwise broken into given names and family names, shrinking further only
 * if one of those is itself too wide.
 */
export function fitName(member: Member): { lines: string[]; size: number } {
  const single = fittingSize(member.name, NAME_MAX_SIZE);
  if (single >= NAME_MIN_SINGLE_LINE_SIZE) return { lines: [member.name], size: single };

  const lines = [member.givenName, member.familyName];
  const size = Math.min(...lines.map((line) => fittingSize(line, NAME_MAX_TWO_LINE_SIZE)));
  return { lines, size };
}

/**
 * A member's contact face: same design as the brand back, with the person
 * leading (name, then title and area) above the same three contact lines.
 * Nothing else: no social icons and no sign-off, so the lines get the space.
 */
export function buildMemberBackFace(profile: Profile, member: Member, qr: QrMatrix): string {
  const title = memberTitle(member);
  const label = escapeXml(
    `${member.name}, ${title} en ${profile.name} (${member.area}). Datos de contacto`,
  );

  // The lead block grows downwards from the top margin: name, title, divider.
  const { lines: nameLines, size } = fitName(member);
  const firstBaseline = MARGIN + size * 0.74; // cap height sits on the margin
  const lineHeight = size * 1.1;
  const name = nameLines
    .map(
      (line, index) =>
        `<text x="${MARGIN - 3}" y="${num(firstBaseline + index * lineHeight)}" font-size="${size}" font-weight="700" letter-spacing="${NAME_TRACKING}" fill="#ffffff">${escapeXml(line)}</text>`,
    )
    .join('');
  const titleBaseline = firstBaseline + (nameLines.length - 1) * lineHeight + 48;
  const dividerY = titleBaseline + 24;

  // The tap areas of the three lines share everything from the divider to the card's edge.
  const lines = contactLines(profile, member);

  return (
    `${SVG_OPEN} role="group" aria-label="${label}">` +
    backGround() +
    name +
    // Title and area in grey, joined by a gold dot: the one gold detail of the block.
    `<text x="${MARGIN}" y="${num(titleBaseline)}" font-size="32" font-weight="400" letter-spacing="0.5" fill="${MUTED_ON_INK}">` +
    `<tspan>${escapeXml(title)}</tspan><tspan fill="${GOLD}"> · </tspan><tspan>${escapeXml(member.area)}</tspan></text>` +
    divider(dividerY) +
    contactColumn(lines, CONTACT_BASELINES, dividerY + 12, TAP_AREA_FLOOR) +
    qrBlock(qr) +
    '</svg>'
  );
}
