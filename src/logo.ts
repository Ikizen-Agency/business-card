/**
 * The Ikizen logo: four overlapping gold rings, redrawn as vector from the
 * brand's 500 x 500 raster artwork. Pure and DOM-free; the card faces and the
 * favicon both come from here.
 *
 * Geometry was measured from the artwork and fitted against it. In the source
 * frame the mark is centred on (249.5, 249.45) with an 11px stroke; here it is
 * moved into a tight box that includes the stroke.
 */

export const LOGO_WIDTH = 344;
export const LOGO_HEIGHT = 446;

/** Stroke of the artwork, in logo units. */
const STROKE = 11;

const CENTER_X = LOGO_WIDTH / 2;
const CENTER_Y = LOGO_HEIGHT / 2;
/** Tall ellipses, stacked: their centres sit this far above and below the middle. */
const ELLIPSE = { rx: 105.7, ry: 131.65, offset: 85.85 };
/** Circles, side by side: their centres sit this far left and right of the middle. */
const CIRCLE = { r: 105.75, offset: 60.75 };

/**
 * Metallic gold, top to bottom. The gradient uses bounding-box units, so each
 * ring gets its own full sweep, as in the artwork.
 */
const GOLD_STOPS: ReadonlyArray<readonly [offset: number, color: string]> = [
  [0, '#eab058'],
  [0.225, '#fce094'],
  [0.5, '#905b1c'],
  [0.765, '#e4a74f'],
  [1, '#b07634'],
];

/** `<linearGradient>` to place in the `<defs>` of the SVG that draws the logo. */
export function logoGradient(id: string): string {
  const stops = GOLD_STOPS.map(
    ([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`,
  ).join('');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;
}

/**
 * The rings, in the LOGO_WIDTH x LOGO_HEIGHT box, stroked with the gradient
 * `gradientId`. The rings simply overlap (no over/under weave); the artwork
 * paints the circles first, then the top and the bottom ellipse.
 *
 * A heavier `strokeWidth` keeps the mark legible at small sizes; the rings
 * then overhang the box by half the extra width.
 */
export function logoRings(gradientId: string, strokeWidth: number = STROKE): string {
  const { rx, ry } = ELLIPSE;
  return (
    `<g fill="none" stroke="url(#${gradientId})" stroke-width="${strokeWidth}">` +
    `<circle cx="${CENTER_X - CIRCLE.offset}" cy="${CENTER_Y}" r="${CIRCLE.r}"/>` +
    `<circle cx="${CENTER_X + CIRCLE.offset}" cy="${CENTER_Y}" r="${CIRCLE.r}"/>` +
    `<ellipse cx="${CENTER_X}" cy="${CENTER_Y - ELLIPSE.offset}" rx="${rx}" ry="${ry}"/>` +
    `<ellipse cx="${CENTER_X}" cy="${CENTER_Y + ELLIPSE.offset}" rx="${rx}" ry="${ry}"/>` +
    '</g>'
  );
}

/**
 * The favicon: the logo on a dark rounded tile, with a much heavier stroke so
 * it still reads at 16px. `public/favicon.svg` must hold exactly this output;
 * a test compares the two.
 */
export function buildFaviconSvg(): string {
  const strokeWidth = 30;
  const scale = 0.11;
  const x = (64 - LOGO_WIDTH * scale) / 2;
  const y = (64 - LOGO_HEIGHT * scale) / 2;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    `<defs>${logoGradient('gold')}</defs>` +
    '<rect width="64" height="64" rx="14" fill="#111827"/>' +
    `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale})">${logoRings('gold', strokeWidth)}</g>` +
    '</svg>'
  );
}
