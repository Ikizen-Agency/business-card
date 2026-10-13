# Ikizen — web business card

A single static page that shows the Ikizen business card as an object: one
landscape card (85 x 55 mm ratio) with two dark faces: a brand face (the wordmark
centred over a large, faint logo) and a contact face (headline, three contact
lines, QR on a light plate, the logo as a watermark). It can be handed over as a
link, a QR code, a native share, a contact file (`.vcf`), a PNG of either face,
or a print.

## Using the page

The screen holds the card and one line of text links, nothing else.

- **Flip**: tap or click the card, drag it sideways like a real card, or focus
  it and press Enter or Space. A drag turns the card with the finger; past a
  third of its width, or with a quick flick, it completes the turn, otherwise
  it settles back. Vertical scrolling and pinch zoom are left to the browser.
- **Peek**: a first-time visitor sees the card tilt a little, once, shortly
  after it appears, to show it has another side. It does not happen once the
  visitor is interacting, nor again on a device where a card has been flipped
  (remembered in `localStorage`). With reduced motion there is no tilt and no
  finger-following: a text hint is shown under the card instead and a sideways
  swipe simply changes the face.
- **Position**: the card sits exactly on the middle of the viewport, with the
  links hanging below it, at every viewport size. On viewports shorter
  than 34rem (a phone on its side) only the links stay under the card; the hint
  and status line move above it, so the card stays centred without shrinking.
- **Contact**: the back of every card has three lines: the phone opens a
  WhatsApp chat, the email opens a new message, the website opens the landing
  page. The brand's LinkedIn and Facebook are not on the card; they are in the
  profile and in the vCards.
- **Compartir**: native share sheet where available, otherwise copies the link.
  Where the share sheet accepts files (most phones), it sends the image of the
  face currently showing together with the link.
- **Guardar contacto**: downloads the vCard.
- **Descargar**: saves the face currently showing as a PNG.
- **QR**: the code on the card is small on purpose (about 12.5 mm when the
  card is printed at 85 mm): it is there to be opened, not scanned in place.
  Tap it or its caption, "Toca para ampliar" (or focus it and press Enter or
  Space). It travels to the centre of the screen and grows
  into a white tile on a dimmed page, for someone else to scan off the screen. "Descargar
  QR" there saves the code alone as a PNG (`ikizen-qr.png`, or `<slug>-qr.png`
  on a member card) for a signature, a slide or a print job. Esc, "Cerrar" or
  a tap outside closes it.

Built with Vite and TypeScript, without a UI framework.

## Commands

Requires Node and pnpm.

```sh
pnpm install
pnpm dev        # local server
pnpm test       # unit tests (Vitest)
pnpm typecheck  # tsc --noEmit
pnpm build      # typecheck + production build into dist/
pnpm preview    # serve the production build
```

## Pages

| Address | What it is |
| --- | --- |
| `/` | The brand card. |
| `/<slug>/` | One card per team member (`/johny/`, `/fernando/`, ...). Same front; the back leads with the person's name, the shared title and their area ("Partner · Marca"). |

Each member page is a real static file (`dist/<slug>/index.html`) with its own
title, description and link-preview tags, because chat previews do not run
JavaScript. Each has its own vCard at `/<slug>/contacto.vcf`; the brand's stays
at `/ikizen.vcf`. The QR, "Guardar contacto" and "Descargar" on a member page
are that member's.

No page links to or lists the member cards and no sitemap is generated: each
address is shared deliberately, one by one. An unknown address shows the brand
card (dev and preview) or the host's 404 page.

## Changing the data

Edit **`src/profile.ts`**. It is the only place that holds data: the brand
(name, headline, services, phone, links, preview image) and the team members.
Card faces, vCards, pages and link-preview tags are all derived from it.

The headline has two parts: `lead` is set quietly and `payoff` is the
emphasized line on the back of the brand card (and the sign-off of a member card).

The card has little room: keep the headline parts and each link's `handle`
short, because type on the card is sized to stay readable on a 320px-wide phone.

### Team members

Add an entry to `members` with a `slug`, the full `name`, its two halves
(`givenName`, `familyName`) and an `area`. That is enough to get a page and a
vCard at the next build. The area is what the member works on, shown next to
the title and written to the vCard as `ROLE`; it is not a rank. Members share the title in `DEFAULT_MEMBER_TITLE`; set `title` on
an entry only to override it.

`phone`, `email` and `whatsappMessage` are optional. A member card shows the
member's own phone and email where they are set and the brand's where they are
not, line by line. Long names are fitted automatically: smaller type first, then a
break into given names and family names.

## Link previews

Every card has its own 1200 x 630 preview image for chats and social networks:
the front face as a card on the page colour, plus the person's name and
"Partner · área" on a member's. `src/preview.ts` composes it from the same
function that draws the card, and the build rasterizes it with
`@resvg/resvg-js` (a dev dependency with prebuilt binaries, no system packages).

**Per-card previews need `VITE_SITE_URL`.** Chat apps only honour an absolute
`og:image`, so without the site URL every page falls back to the generic image
in `profile.previewImage`. The images are emitted as `assets/preview-<hash>.png`:
the name does not say whose card it is, and nothing lists them.

The rasterizer cannot read the woff2 web font, so `src/preview/fonts/` holds
Geist Regular and Bold as TTF (SIL Open Font License, see `LICENSE.txt` there).
They are the latin WOFF files of `@fontsource/geist` 5.3.0, unwrapped to TTF
without modification; to refresh them, unwrap the same two files again.

## Offline

After a first visit a card opens again without a connection, with flip, the
enlarged QR and "Guardar contacto" working. The build emits a small service
worker, `sw.js`, generated from `src/offline.ts`; it is registered only in
production builds, never by `pnpm dev`.

- It precaches only shared files (script, stylesheet, fonts, favicon). It
  holds **no list of pages**: `sw.js` is public, and a list would reveal the
  member addresses. Each device keeps just the cards opened on it, and their
  vCards.
- Pages and vCards are fetched from the network first, waiting at most three
  seconds when a saved copy exists, so a redeploy reaches returning visitors.
  Hashed assets are served from the cache.
- Each build uses its own cache. When a new worker takes over it fetches the
  visitor's saved pages again before deleting the old cache, so no page is left
  pointing at files that no longer exist.
- An address never opened on that device shows a short "Sin conexión" message
  when offline. It is never answered with another card.

`vercel.json` serves `sw.js` with `Cache-Control: no-cache`, so browsers and
the CDN always revalidate it. Like the other Vercel rules, this is unverified
until deployed.

## Search engines

The whole site is kept out of search engines, the brand card included:

- **`<meta name="robots" content="noindex, nofollow, noarchive">`** is in the
  static HTML of every page (written at build time, not by JavaScript).
- **`X-Robots-Tag: noindex, nofollow, noarchive`** is sent on every path by one
  catch-all rule in `vercel.json`. This is what covers the `.vcf` files, which
  have no HTML to hold a meta tag. A single rule cannot go stale when a member
  is added.
- **No `robots.txt`**. A `Disallow` would stop crawlers from fetching the pages,
  so they would never see the `noindex`, and a blocked address can still be
  listed if something links to it.

Two limits to keep in mind:

- The header rule assumes the site is hosted on Vercel and is **unverified
  until deployed**. After deploying, check it with
  `curl -I https://<site>/johny/contacto.vcf` and look for `X-Robots-Tag`. On
  another host, configure the same header there.
- `noindex` is **not access control**. Anyone who has a link can open the card
  and save the contact. Only put data in `src/profile.ts` that may be public.

## How it is built

| Part | Where | How |
| --- | --- | --- |
| Card faces | `src/card-faces.ts` | Two pure functions return each face as a standalone SVG string (shared 1020 x 660 viewBox, all profile text XML-escaped). The same markup is shown inline, exported and printed. Contact lines on the back are real links. |
| QR code | `src/qr.ts` | `qrcode-generator` (error correction M) turns the card's own address (the site origin plus the card's path) into a module matrix, so the code always points to that card on whatever domain serves it. The back face draws it with a 4-module quiet zone. `src/qr-dialog.ts` shows the same matrix enlarged in a native modal `<dialog>`, opened with a shared-element transition from the plate on the card (`src/flip.ts` holds its geometry; only transform, opacity and corner radius are animated, and reduced motion gets a short fade), and `src/export.ts` rasterizes it alone: ink on white, 4-module quiet zone, a whole number of pixels per module, at least 1024px on a side. |
| Logo | `src/logo.ts` | The four gold rings, redrawn as vector from the brand artwork (measured geometry, per-ring gold gradient). Both faces and `public/favicon.svg` draw it from there: the front as a large gold backdrop that a mask dissolves behind the wordmark and the services line only, so all four rings stay visible (gradients only, no blur filter, so export and print match the screen), the back as a fainter watermark bleeding off the right edge, clipped to the card. A test fails if the favicon file drifts from the builder. |
| Flip | `src/flip-card.ts`, `src/gesture.ts`, `src/style.css` | A 3D `rotateY` toggled by a button the size of the card that lies under it; the card lets pointer events through, except on the contact links. `src/flip-card.ts` also reads sideways drags and runs the peek; the decisions (tap or drag, how far the card turns, what a release does) are pure functions in `src/gesture.ts`. The hidden face is `inert`. With `prefers-reduced-motion` the faces swap without rotation. |
| PNG export | `src/export.ts` | "Descargar" rasterizes the visible face through an image and a canvas at 3060 x 1980 px. The Geist font is embedded in the SVG as base64 first, because an SVG drawn as an image cannot load external fonts. |
| Print | `src/style.css` | `@page` is 85 x 55 mm: printing gives two pages, front and back, at true card size. Disable margins and enable background graphics in the print dialog. |
| Pages | `src/cards.ts`, `vite.config.ts` | `src/cards.ts` says what each page is (address, title, vCard) and renders its head tags. The plugin writes them into `index.html` and derives one `<slug>/index.html` per member from the built brand page. A member page carries the member as a small JSON block, so the script knows whose card it is without reading the URL and the shared bundle holds no member data. |
| vCard | `src/vcard.ts` | A vCard 3.0 string built from the profile; a member's has the person's structured name, `ORG`, `TITLE`, the area as `ROLE`, and the brand's phone and email as fallback. The plugin emits them at build time and serves them in dev and preview. "Guardar contacto" is a plain download link to that file. |

`src/links.ts` builds the WhatsApp and `tel:` links; `src/contacts.ts` picks
each card's three contact lines (member first, brand as fallback); `src/icons.ts` holds the
hand-drawn icons printed next to the contact lines.

## Deploying

`pnpm build` produces a static site in `dist/`; upload it to any static host.
`vercel.json` holds the Vercel settings (the robots header and trailing-slash
addresses, so `/johny/` is the canonical form the QR encodes).

Set `VITE_SITE_URL` at build time to the public address of the site to add the
`og:url` tag to every page. It is optional: without it the tag is left out.

```sh
VITE_SITE_URL=https://example.com/ pnpm build
```
