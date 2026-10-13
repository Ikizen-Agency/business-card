/**
 * The link-preview image of a card (Open Graph / Twitter), as an SVG string:
 * the real front face shown as a card on the flat page colour, plus the
 * person's name and area on a member's. Pure: the build rasterizes it to PNG
 * (see vite.config.ts), so the preview can never drift from the card.
 *
 * Chat apps often crop previews to a centred square, so the card and the two
 * lines of text stay inside the middle 630 pixels.
 */

import { CARD_HEIGHT, CARD_WIDTH, buildFrontFace, escapeXml } from './card-faces.ts';
import { memberTitle, type Member, type Profile } from './profile.ts';

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

const PAGE = '#111827';
const GOLD = '#e4a74f';
const MUTED = '#9ca3af';
/** Side of the centred square some apps crop the preview to. */
const SAFE_WIDTH = PREVIEW_HEIGHT;

/** Largest size, up to 46, at which the name stays inside the safe square (0.6 em per character). */
function nameSize(name: string): number {
  return Math.min(46, Math.floor((SAFE_WIDTH / (Math.max(name.length, 1) * 0.6)) * 10) / 10);
}

export function buildPreviewSvg(profile: Profile, member?: Member): string {
  // Brand: the card alone, centred. Member: a smaller card with two lines under it.
  const cardWidth = member ? 600 : 720;
  const cardHeight = (cardWidth * CARD_HEIGHT) / CARD_WIDTH;
  const cardX = (PREVIEW_WIDTH - cardWidth) / 2;
  const cardY = member ? 56 : (PREVIEW_HEIGHT - cardHeight) / 2;
  const radius = cardWidth * 0.035;
  const box = `x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}"`;

  // The face builder's root element becomes a nested, positioned <svg>.
  const face = buildFrontFace(profile);
  const faceBody = face.slice(face.indexOf('>') + 1);
  const card =
    `<svg ${box} viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" font-family="'Geist Variable', system-ui, sans-serif">` +
    faceBody;

  let caption = '';
  if (member) {
    const size = nameSize(member.name);
    const nameBaseline = cardY + cardHeight + 74;
    caption =
      `<text x="${PREVIEW_WIDTH / 2}" y="${nameBaseline}" font-size="${size}" font-weight="700" letter-spacing="-1" text-anchor="middle" fill="#ffffff">${escapeXml(member.name)}</text>` +
      `<text x="${PREVIEW_WIDTH / 2}" y="${nameBaseline + 48}" font-size="28" font-weight="400" letter-spacing="0.5" text-anchor="middle" fill="${MUTED}">` +
      `<tspan>${escapeXml(memberTitle(member))}</tspan><tspan fill="${GOLD}"> · </tspan><tspan>${escapeXml(member.area)}</tspan></text>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" viewBox="0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}" font-family="'Geist Variable', system-ui, sans-serif">` +
    '<defs>' +
    // The page's soft shadow under the card; a blur is fine here, it is a flat image.
    '<filter id="preview-shadow" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="22"/></filter>' +
    `<clipPath id="preview-card"><rect ${box} rx="${radius}"/></clipPath>` +
    '</defs>' +
    `<rect width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}" fill="${PAGE}"/>` +
    `<rect x="${cardX + 24}" y="${cardY + 40}" width="${cardWidth - 48}" height="${cardHeight - 24}" rx="${radius}" fill="#000000" fill-opacity="0.6" filter="url(#preview-shadow)"/>` +
    `<g clip-path="url(#preview-card)">${card}</g>` +
    // The lit paper edge of the card on the page.
    `<rect ${box} rx="${radius}" fill="none" stroke="#ffffff" stroke-opacity="0.07"/>` +
    caption +
    '</svg>'
  );
}
