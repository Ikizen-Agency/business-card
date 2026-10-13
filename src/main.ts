import '@fontsource-variable/geist';
import './style.css';
import { buildBackFace, buildFrontFace, buildMemberBackFace } from './card-faces.ts';
import { CARD_DATA_ID, cardPage } from './cards.ts';
import { downloadBlob, renderFacePng, renderQrPng } from './export.ts';
import { createFlipCard } from './flip-card.ts';
import { headlineText, profile, type Member } from './profile.ts';
import { createQrDialog } from './qr-dialog.ts';
import { createQrMatrix } from './qr.ts';
import { shareMode, sharePayload } from './share.ts';

const STATUS_TIMEOUT_MS = 4000;

/**
 * The member this page belongs to, from the data the build wrote into the
 * HTML. Absent on the brand page, which is also what any unknown address gets.
 */
function readMember(): Member | undefined {
  const data = document.getElementById(CARD_DATA_ID)?.textContent;
  if (!data) return undefined;
  try {
    return JSON.parse(data) as Member;
  } catch {
    return undefined;
  }
}

const member = readMember();
const page = cardPage(profile, member);

/**
 * The card's own address, built from its page data rather than from the
 * address bar, so the QR and the share link stay right under any query, hash
 * or mistyped path. BASE_URL keeps it valid when the site lives under a sub-path.
 */
const pageUrl = location.origin + import.meta.env.BASE_URL + page.path;
/** Emitted by the build plugin in vite.config.ts. */
const vcardHref = import.meta.env.BASE_URL + page.vcardPath;

const qr = createQrMatrix(pageUrl);
const faces = {
  front: { svg: buildFrontFace(profile), filename: `${page.exportName}-frente.png` },
  back: {
    svg: member ? buildMemberBackFace(profile, member, qr) : buildBackFace(profile, qr),
    filename: `${page.exportName}-reverso.png`,
  },
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Parses face markup as XML, so malformed SVG fails loudly instead of rendering half a card. */
function renderFace(side: keyof typeof faces): HTMLDivElement {
  const parsed = new DOMParser().parseFromString(faces[side].svg, 'image/svg+xml').documentElement;
  if (parsed.nodeName !== 'svg') throw new Error(`Invalid SVG for the ${side} face`);

  const face = el('div', `card__face card__face--${side}`);
  face.append(document.importNode(parsed, true));
  return face;
}

// --- Status line -----------------------------------------------------------

const status = el('p', 'status');
status.setAttribute('role', 'status');
status.setAttribute('aria-live', 'polite');

/** Extra status lines that mirror the main one (the QR dialog's, while it covers the page). */
const statusMirrors: HTMLElement[] = [];

let statusTimer: number | undefined;
function announce(message: string, persistent = false): void {
  const lines = [status, ...statusMirrors];
  for (const line of lines) line.textContent = message;
  window.clearTimeout(statusTimer);
  if (!persistent) {
    statusTimer = window.setTimeout(() => {
      for (const line of lines) line.textContent = '';
    }, STATUS_TIMEOUT_MS);
  }
}

// --- Card and flip ---------------------------------------------------------

const front = renderFace('front');
const back = renderFace('back');
const card = el('div', 'card');
card.append(front, back);

/**
 * The flip control is a real button lying under the card. The card lets
 * pointer events through to it (except on the contact links), so one element
 * handles tap, click, Enter and Space, and the links are not nested inside it.
 * Dragging the card sideways turns it too: see flip-card.ts.
 */
const flipControl = el('button', 'flip');
flipControl.type = 'button';
flipControl.setAttribute('aria-label', 'Girar la tarjeta');
// The instruction for screen readers, which never see the card tilt.
const flipHelp = el('span', 'visually-hidden', 'Toca o desliza la tarjeta para girarla.');
flipHelp.id = 'flip-help';
flipControl.setAttribute('aria-describedby', flipHelp.id);

/**
 * Shown only with reduced motion (see style.css), where the card does not
 * tilt to hint at its other side.
 */
const hint = el('p', 'hint', 'Toca la tarjeta para girarla');

/** Remembers, on this device, that the visitor already knows the card flips. */
const FLIPPED_KEY = 'ikizen:flipped';
const storage = {
  // Storage can be missing or throw (private mode, blocked cookies): never let that break the page.
  hasFlipped(): boolean {
    try {
      return window.localStorage.getItem(FLIPPED_KEY) === '1';
    } catch {
      return false;
    }
  },
  rememberFlip(): void {
    try {
      window.localStorage.setItem(FLIPPED_KEY, '1');
    } catch {
      // Nothing to do: the hint simply shows again next time.
    }
  },
};

const stage = el('div', 'stage');
stage.append(flipControl, card);

const flipCard = createFlipCard({
  stage,
  card,
  control: flipControl,
  front,
  back,
  onChange(flipped) {
    // Once the card has been flipped the hint has done its job.
    hint.classList.add('is-dismissed');
    storage.rememberFlip();
    // Have the image of the face now showing ready, in case it is shared.
    prepareShareImage(flipped ? 'back' : 'front');
  },
});

// --- Enlarged QR ------------------------------------------------------------

async function downloadQr(): Promise<void> {
  try {
    downloadBlob(await renderQrPng(qr), page.qrFilename);
    announce('Código QR descargado.');
  } catch (error) {
    console.error(error);
    announce('No se pudo generar el código QR. Inténtelo de nuevo.', true);
  }
}

const qrDialog = createQrDialog({
  matrix: qr,
  caption: `Abre la tarjeta de ${member ? member.name : profile.name}`,
  url: pageUrl.replace(/^https?:\/\//, ''),
  onDownload: () => void downloadQr(),
});
statusMirrors.push(qrDialog.status);

// The QR plate on the back is a button (see qrBlock in card-faces.ts). It sits
// above the flip control, so activating it opens the code and never flips.
const qrControl = back.querySelector<SVGGElement>('.qr-open');
if (qrControl) {
  // The enlarged code grows out of the plate itself, not out of the whole control.
  const plate = qrControl.querySelector('.qr-plate') ?? qrControl;
  // The dialog grows out of the plate's on-screen rectangle, so the card must
  // be flat first: no flip, drag or peek still in motion.
  const openQr = (): void => {
    flipCard.settle();
    qrDialog.open(qrControl, plate);
  };
  qrControl.addEventListener('click', openQr);
  qrControl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); // Space would scroll the page
    openQr();
  });
}

// --- Text actions ----------------------------------------------------------

async function copyLink(): Promise<void> {
  try {
    // `clipboard` is undefined on insecure origins; the throw lands in the catch.
    await navigator.clipboard.writeText(pageUrl);
    announce('Enlace copiado.');
  } catch {
    // Keep the address on screen so it can still be copied by hand.
    announce(`No se pudo copiar automáticamente. Enlace: ${pageUrl}`, true);
  }
}

type Side = keyof typeof faces;

/**
 * The card image of each face as a file, rendered ahead of time. Sharing has
 * to start while the tap is still fresh, so "Compartir" only ever uses an
 * image that is already here and never waits for one.
 */
const shareImages: Partial<Record<Side, File>> = {};
const shareImagesPending = new Set<Side>();

/** Renders one face for sharing, when the browser is idle. Failures only mean "link only". */
function prepareShareImage(side: Side): void {
  // Pointless where files cannot be shared at all (most desktop browsers).
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return;
  if (shareImages[side] || shareImagesPending.has(side)) return;
  shareImagesPending.add(side);

  const render = (): void => {
    // 2040 x 1320: sharp on any phone, and a much lighter file to send than the download.
    renderFacePng(faces[side].svg, 2)
      .then((blob) => {
        shareImages[side] = new File([blob], faces[side].filename, { type: 'image/png' });
      })
      .catch((error: unknown) => console.error(error))
      .finally(() => shareImagesPending.delete(side));
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(render, { timeout: 2000 });
  else setTimeout(render, 600);
}

async function share(): Promise<void> {
  const side: Side = flipCard.flipped ? 'back' : 'front';
  const image = shareImages[side];
  const hasShare = typeof navigator.share === 'function';
  const mode = shareMode({
    hasShare,
    canShareFiles:
      hasShare && image !== undefined && typeof navigator.canShare === 'function' && navigator.canShare({ files: [image] }),
    imageReady: image !== undefined,
  });
  if (mode === 'copy') return copyLink();

  // On a member card the title names the person.
  const content = {
    title: member ? page.title : profile.name,
    text: headlineText(profile),
    url: pageUrl,
  };
  try {
    // Nothing is awaited before this call: the tap's activation is still valid.
    await navigator.share(sharePayload(mode, content, image));
  } catch (error) {
    // Closing the share sheet is not a failure.
    if (error instanceof DOMException && error.name === 'AbortError') return;
    console.error(error);
    if (mode === 'files') {
      // The image was refused: try the link alone, then the clipboard.
      try {
        await navigator.share(sharePayload('link', content));
        return;
      } catch (linkError) {
        if (linkError instanceof DOMException && linkError.name === 'AbortError') return;
      }
    }
    await copyLink();
  }
}

function textButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', 'text-action', label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

const downloadButton = textButton('Descargar', () => void downloadFace());
downloadButton.setAttribute('aria-label', 'Descargar la cara visible como imagen PNG');

/** Saves the face currently showing as a PNG. */
async function downloadFace(): Promise<void> {
  const face = flipCard.flipped ? faces.back : faces.front;
  downloadButton.disabled = true;
  try {
    downloadBlob(await renderFacePng(face.svg), face.filename);
    announce('Imagen descargada.');
  } catch (error) {
    console.error(error);
    announce('No se pudo generar la imagen. Inténtelo de nuevo.', true);
  } finally {
    downloadButton.disabled = false;
  }
}

const saveContact = el('a', 'text-action', 'Guardar contacto');
saveContact.href = vcardHref;
saveContact.download = page.vcardFilename;

const actions = el('ul', 'text-actions');
for (const control of [textButton('Compartir', () => void share()), saveContact, downloadButton]) {
  const item = el('li');
  item.append(control);
  actions.append(item);
}

// --- Mount -----------------------------------------------------------------

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing #app mount point');

const heading = member ? `${member.name} — ${profile.name}` : profile.name;
// Everything under the card lives in one block of fixed height, so the card's
// position never depends on it (see the centring rules in style.css).
const below = el('div', 'below');
below.append(hint, actions, status);
app.append(el('h1', 'visually-hidden', heading), stage, flipHelp, below, qrDialog.element);

prepareShareImage('front');

// A first-time visitor sees the card tilt once, shortly after it appears, to
// show it has another side. Skipped for anyone who has flipped a card before,
// who is already interacting, or who asked for reduced motion (flip-card.ts).
if (!storage.hasFlipped()) window.setTimeout(() => flipCard.peek(), 900);

// --- Offline ---------------------------------------------------------------

/**
 * Registers the service worker (production builds only; `pnpm dev` has none)
 * and asks it to keep this page and its vCard. The worker precaches only
 * shared files and never knows other cards' addresses: each device keeps
 * just the cards opened on it.
 */
// Focus rings are shown to keyboard users only (see style.css): remember
// whether the visitor last moved through the page with the keyboard or a pointer.
window.addEventListener(
  'keydown',
  (event) => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) {
      document.documentElement.dataset.input = 'keyboard';
    }
  },
  true,
);
window.addEventListener(
  'pointerdown',
  () => {
    document.documentElement.dataset.input = 'pointer';
  },
  true,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        registration.active?.postMessage({
          type: 'keep',
          urls: [pageUrl, new URL(vcardHref, location.href).href],
        });
      })
      .catch((error: unknown) => console.error(error));
  });
}
