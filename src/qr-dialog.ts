/**
 * The enlarged QR: a native modal dialog showing the code alone on a white
 * tile, sized for someone else to scan it off the screen, with a way to save
 * it as a file.
 *
 * Opening is a shared-element transition: the tile starts over the QR plate on
 * the card and travels to the centre while growing, and goes back on close.
 * Only `transform`, `opacity` and the corner radius are animated; the tile's
 * final state has no transform, so the code is rendered at its real size.
 */

import { qrModulesPath, type QrMatrix } from './card-faces.ts';
import { flipTransform, toCssTransform, type Box } from './flip.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Any size works: the SVG scales. This keeps the path numbers short. */
const VIEW_SIZE = 400;

const OPEN_MS = 340;
/** Closing is a little quicker than opening. */
const CLOSE_MS = 250;
/** Soft ease-out, no overshoot. */
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** With reduced motion nothing travels or scales: a short fade only. */
const FADE_MS = 120;

export interface QrDialogOptions {
  matrix: QrMatrix;
  /** Whose card the code opens, e.g. "Abre la tarjeta de Ikizen". */
  caption: string;
  /** The encoded address, shown without its protocol. */
  url: string;
  onDownload: () => void;
}

export interface QrDialog {
  element: HTMLDialogElement;
  /** Line for feedback while the dialog covers the page's own status line. */
  status: HTMLElement;
  /**
   * Opens the dialog. `trigger` gets the focus back on close; `origin` is the
   * element the tile appears to grow out of (the QR plate on the card).
   */
  open: (trigger: HTMLElement | SVGElement, origin: Element) => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** The code as SVG: ink modules on white, quiet zone included, nothing else. */
function qrSvg(matrix: QrMatrix): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Código QR');

  const ground = document.createElementNS(SVG_NS, 'rect');
  ground.setAttribute('width', String(VIEW_SIZE));
  ground.setAttribute('height', String(VIEW_SIZE));
  ground.setAttribute('fill', '#ffffff');

  const modules = document.createElementNS(SVG_NS, 'path');
  modules.setAttribute('d', qrModulesPath(matrix, 0, 0, VIEW_SIZE));
  modules.setAttribute('fill', '#111827');

  svg.append(ground, modules);
  return svg;
}

const toBox = (rect: DOMRect): Box => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

export function createQrDialog(options: QrDialogOptions): QrDialog {
  const dialog = el('dialog', 'qr-dialog');
  dialog.setAttribute('aria-label', 'Código QR ampliado');

  // A real element instead of ::backdrop, so it can fade in step with the tile.
  const scrim = el('div', 'qr-dialog__scrim');

  const tile = el('div', 'qr-dialog__tile');
  tile.append(qrSvg(options.matrix));

  const download = el('button', 'text-action', 'Descargar QR');
  download.type = 'button';
  download.addEventListener('click', options.onDownload);

  const closeButton = el('button', 'text-action', 'Cerrar');
  closeButton.type = 'button';

  // Same quiet text links, with the same separator, as the line under the card.
  const actions = el('ul', 'text-actions');
  for (const control of [download, closeButton]) {
    const item = el('li', '');
    item.append(control);
    actions.append(item);
  }

  const status = el('p', 'qr-dialog__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const details = el('div', 'qr-dialog__details');
  details.append(
    el('p', 'qr-dialog__caption', options.caption),
    el('p', 'qr-dialog__url', options.url),
    actions,
    status,
  );

  const layout = el('div', 'qr-dialog__layout');
  layout.append(tile, details);
  dialog.append(scrim, layout);

  type Phase = 'closed' | 'opening' | 'open' | 'closing';
  let phase: Phase = 'closed';
  let trigger: HTMLElement | SVGElement | undefined;
  let origin: Element | undefined;
  let running: Animation[] = [];

  const reducedMotion = (): boolean =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Stops whatever is animating, leaving every part in its laid-out state. */
  function stopAnimations(): void {
    for (const animation of running) animation.cancel();
    running = [];
  }

  /** The tile's start: over the origin, with a radius that looks right at that scale. */
  function tileOverOrigin(): Keyframe {
    const target = toBox(tile.getBoundingClientRect());
    const source = origin ? toBox(origin.getBoundingClientRect()) : target;
    const transform = flipTransform(source, target);
    // Scaling shrinks the corners too; a larger radius keeps them matching the plate's.
    const radius = source.width * 0.05;
    return {
      transform: toCssTransform(transform),
      borderRadius: `${radius / transform.scaleX}px / ${radius / transform.scaleY}px`,
    };
  }

  function open(from: HTMLElement | SVGElement, fromOrigin: Element): void {
    // A second activation while it is opening or open changes nothing.
    if (phase !== 'closed') return;
    trigger = from;
    origin = fromOrigin;
    phase = 'opening';
    dialog.showModal();

    if (reducedMotion()) {
      running = [dialog.animate({ opacity: [0, 1] }, { duration: FADE_MS, easing: 'ease-out' })];
    } else {
      const settledRadius = getComputedStyle(tile).borderRadius;
      const timing: KeyframeAnimationOptions = { duration: OPEN_MS, easing: EASING };
      running = [
        tile.animate([tileOverOrigin(), { transform: 'none', borderRadius: settledRadius }], timing),
        scrim.animate({ opacity: [0, 1] }, timing),
        // The text does not travel: it fades in once the tile has nearly landed.
        details.animate(
          { opacity: [0, 1] },
          { duration: OPEN_MS * 0.5, delay: OPEN_MS * 0.75, easing: 'ease-out', fill: 'backwards' },
        ),
      ];
    }
    const started = running;
    void Promise.all(started.map((animation) => animation.finished))
      .then(() => {
        if (running === started && phase === 'opening') phase = 'open';
      })
      .catch(() => undefined); // cancelled: a close took over
  }

  /** Animates out, then closes. Safe at any moment, including mid-opening. */
  function close(): void {
    if (phase === 'closed' || phase === 'closing') return;
    phase = 'closing';

    // Start from wherever each part is right now, so an interrupted opening
    // turns around smoothly instead of jumping to the end first.
    const tileNow = getComputedStyle(tile);
    const from: Keyframe = { transform: tileNow.transform, borderRadius: tileNow.borderRadius };
    const scrimNow = getComputedStyle(scrim).opacity;
    const detailsNow = getComputedStyle(details).opacity;
    const dialogNow = getComputedStyle(dialog).opacity;
    stopAnimations();

    if (reducedMotion()) {
      running = [
        dialog.animate(
          { opacity: [dialogNow, '0'] },
          { duration: FADE_MS, easing: 'ease-in', fill: 'forwards' },
        ),
      ];
    } else {
      const timing: KeyframeAnimationOptions = { duration: CLOSE_MS, easing: EASING, fill: 'forwards' };
      running = [
        // The origin is measured again: the page may have been resized meanwhile.
        tile.animate([from, tileOverOrigin()], timing),
        scrim.animate({ opacity: [scrimNow, '0'] }, timing),
        details.animate({ opacity: [detailsNow, '0'] }, { ...timing, duration: CLOSE_MS * 0.4 }),
      ];
    }
    const started = running;
    void Promise.all(started.map((animation) => animation.finished))
      .then(() => {
        if (running === started) dialog.close();
      })
      .catch(() => undefined);
  }

  closeButton.addEventListener('click', close);
  // A click that lands on the scrim, or on the empty layout around the tile, is outside.
  dialog.addEventListener('click', (event) => {
    if (event.target === scrim || event.target === layout || event.target === dialog) close();
  });
  // Esc: animate out instead of vanishing. If the browser closes it anyway
  // (a second Esc cannot be cancelled), the `close` handler below still tidies up.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  // Every way of closing ends here, so the dialog can never be left half-animated.
  dialog.addEventListener('close', () => {
    stopAnimations();
    phase = 'closed';
    status.textContent = '';
    trigger?.focus();
  });

  return { element: dialog, status, open };
}
