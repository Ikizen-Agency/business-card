# Digital business card

Locator: `odd/tasks/digital-business-card.md` · Engram mirror: `odd/digital-business-card/tasks`

## Objective

A web business card for Ikizen Agency that can be handed over as a link, a QR code, a native share, or a contact file.

## Problem and why

The agency has a landing page (https://ikizen.vercel.app/) but nothing short enough to hand over in person or in a chat. A single-screen card with one-tap contact actions closes that gap.

## Scope

- Standalone project in `business-card/` (own git repository) inside the agency projects folder.
- Single static page, mobile first, deployable to any static host.
- Sharing formats: link, QR code (on screen and downloadable), Web Share API, copy link, vCard (`.vcf`) download, link previews (Open Graph).
- Contact actions taken from the landing: WhatsApp, LinkedIn, Facebook, website.

Out of scope: deployment, custom domain, analytics, a CMS. Per-member cards were added to scope by the owner in T9.

## Constraints

- Brand palette from the landing: background `#111827`, primary `#fde095`, secondary `#f4ad46`, dark ink `#2f2733`, Geist typeface.
- UI copy in neutral Spanish (matches the landing); code, comments and docs in English.
- All agency data lives in one profile module so it can be edited without touching the UI.
- The QR must encode the URL the card is actually served from, so it works on any domain.
- Agency email: `ikizen.agency@gmail.com` (supplied by the owner in T12). No street address and no personal member contacts are known; do not invent contact data.

## Stack

Vite + TypeScript (no UI framework), Vitest, `qrcode-generator`, `@fontsource-variable/geist`, pnpm.

## Tasks

- [x] T1 — Scaffold, profile data, vCard and share-link logic with tests. Route: delegated direct (writer trigger: 2+ non-trivial files).
- [x] T2 — Card UI: brand styling, contact actions, QR panel, share/copy/download actions, static `.vcf`, Open Graph metadata, README. Route: delegated direct (same writer, same trigger).

- [x] T3 — Rework the UI into a real business card object: landscape 3.5 x 2 in ratio, front (brand) and back (contact details + QR) faces, flip interaction, PNG export and print at card size. Reopens the T2 presentation. Reason: the owner rejected the T2 layout as a contact page, not a business card, and supplied physical-card references. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T4 — Polish pass requested by the owner: brand name is "Ikizen" only (no "Agency") everywhere; front becomes a pure brand face; the back carries a new emotive headline ("No hacemos sitios web. Hacemos que te recuerden."); refined, more professional typography, geometry, icons and action row. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T5 — Use the real agency logo supplied by the owner (four interlaced gold rings) instead of the placeholder "I" monogram: vector redraw as a shared mark, on the front face and as favicon. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T6 — Remove the action buttons while keeping every function (owner decision): flip by tapping the card with a one-time hint, WhatsApp through the phone line on the back, and Compartir / Guardar contacto / Descargar as one quiet line of text links under the card. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T7 — Centered front face (owner decision): the logo large, crisp and faint behind a centered "Ikizen" wordmark, fading out behind the letters, with a soft gold glow; no corner band on the front; a small full-strength logo on the back. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T8 — Dark back face (owner decision): same ink material as the front with gold as the only accent; no corner band, no small floating logo; faint cropped logo watermark; headline as the lead; gold line icons; QR on a cream plate with a fine gold frame. The front stays as is. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T9 — Per-member cards (owner decision): four members (Johny A. Pedraza Romero, Fernando Jose Bernal Suarez, Yanni Alejandro Fernandez Quintana, Patricia Mieres Dias), all with the same title, each with a static page at `/<slug>/`, a personal back face, a personal vCard and link preview. No page or vCard on the site may be indexed by search engines, the agency card included (owner: very important; extended to the agency card after the task was briefed). Personal contact data was not supplied: members fall back to the agency contacts until theirs are added. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T10 — QR enlarge and standalone download (owner decision): tapping the QR on the back opens it large on a light background for in-person scanning, and from that view it can be downloaded as a standalone PNG. The QR keeps encoding the card's page URL. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T11 — QR and centering polish (owner decision): the QR caption reads "Toca para ampliar"; enlarging the QR is a smooth transition from its place on the card to the center of the screen; the enlarged QR is clean and minimal but stands out; the card is exactly centered vertically in the viewport instead of sitting slightly high. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T12 — Cleaner back faces (owner decision): three text contact lines only (WhatsApp, email, website); agency email `ikizen.agency@gmail.com` added; agency socials become a small icon-only row; member cards carry no socials and no sign-off; each member gets an area next to the shared title (Patricia: Marca; Johny, Fernando, Yanni: Desarrollo); fainter watermark; taller contact tap areas. All five cards keep the single existing WhatsApp number. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T13 — Minimalism pass (owner decisions): remove the social icon row from the agency back; make the QR plate much smaller (it enlarges on tap); raise the gold of the front logo and recover its side circles; flat page background without the glows. The back watermark stays and contact icons stay gold. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T14 — Reach and resilience (owner decision): a link-preview image per card generated at build; the card opens offline after a first visit; "Compartir" can send the card image as well as the link. Route: delegated direct (same writer, 2+ non-trivial files).
- [x] T15 — Natural interaction (owner decision): flip by swiping the card sideways (tap still works); the text hint is replaced by a one-time "peek" tilt on load. Route: delegated direct (same writer, 2+ non-trivial files).

## Acceptance criteria

- Each member has a static page with their name and title and a personal `.vcf`.
- Every page carries a `noindex` robots meta and the hosting config sends `X-Robots-Tag: noindex` site-wide.

- The page shows one landscape card with two faces that can be flipped by tap, click or keyboard.
- Each face can be downloaded as a PNG, and printing yields both faces at 85 x 55 mm.

- The card renders the agency name, tagline, services and the four contact actions on a 360px wide screen without horizontal scroll.
- The QR decodes to the current page URL and can be downloaded.
- "Save contact" delivers a valid vCard 3.0 file with the organization, phone and URLs.
- Share uses the Web Share API when available and falls back to copying the link.
- `pnpm test`, `pnpm typecheck` and `pnpm build` pass.

## Checks

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

Test-first applies to the vCard and share-link modules (pure, deterministic). The UI has no meaningful runnable RED; it is checked by build plus a visual pass.

## Delivery

Strategy: `ask-on-risk`. Forecast: about 600 authored lines, above the 400-line budget; no remote exists yet, so slicing is deferred until a pull request is actually requested.

## Progress

- T1 and T2 implemented by one delegated writer (1305 authored lines, lockfile excluded; above the forecast because of the stylesheet and hand-drawn icons).
- Evidence: RED `pnpm test` failed on missing `./vcard` and `./links` modules; GREEN 15 tests in 2 files pass. `pnpm typecheck` and `pnpm build` exit 0. Parent spot check re-ran `pnpm test` and `pnpm build` (both pass) and reviewed a 390px screenshot of the built page.
- `dist/ikizen.vcf` is a valid vCard 3.0; Open Graph tags are injected from the profile.
- Not exercised: native share, clipboard copy, QR download, print, and scanning the QR with a phone.

- T3 implemented by the same writer: SVG face builders (`src/card-faces.ts`), flip, PNG export (`src/export.ts`), card-size print. Evidence: RED `pnpm test` failed on the missing `./card-faces` module; GREEN 27 tests in 3 files pass; `pnpm typecheck` and `pnpm build` exit 0. Headless Chromium: no horizontal scroll at 320px, smallest card text 10.4px at 360px, PNG export 3060 x 1980, print PDF of 2 pages at 85 x 55 mm. Parent spot check re-ran `pnpm test` (27 pass) and reviewed the front (1280px) and back (360px) screenshots.
- T3 not exercised: keyboard flip, reduced-motion swap, native share, clipboard, vCard download click, paper print, phone QR scan; export driven in Chromium only.
- Known gaps: back-face links are about 27px tall on phones (below the 44px target); `vite.config.ts` uses extension-less imports that Vite warns about (fix needs `tsconfig.json`); no touch icon or web manifest.

- T4 implemented by the same writer: name is "Ikizen" only, headline moved to the back as `{ lead, payoff }`, front is a pure brand face, slimmer geometry, line icons, quieter action row, `.ts` config imports. Evidence: RED `pnpm test` 5 failed / 24 passed; GREEN 29 tests in 3 files pass; `pnpm typecheck` and `pnpm build` exit 0 with no config warning; vCard emits `FN:Ikizen` / `ORG:Ikizen`. Parent spot check re-ran `pnpm test` and reviewed both faces at 1280px; parent also dropped "Agency" from the `package.json` description (mechanical one-line edit).
- T4 known gap: back-face contact links are about 25px tall on phones.

- T5 implemented by the same writer: `src/logo.ts` redraws the supplied logo as vector (two ellipses, two circles, 11px stroke, five-stop gold gradient measured from the JPEG); front face lockup and favicon derive from it; the corner band takes the logo gradient. Evidence: RED `pnpm test` failed on the missing `./logo` module; GREEN 37 tests pass; overlay against the source: mean absolute difference under 2.5 of 255 per channel, ring-mask IoU 0.959.
- T6 implemented by the same writer: action buttons removed; flip by tapping the card (button under the card, keyboard operable) with a one-time hint; Compartir / Guardar contacto / Descargar as one line of text links. Evidence: RED `pnpm test` 2 failed / 37 passed; GREEN 39 tests in 4 files pass; `pnpm typecheck` and `pnpm build` exit 0; one row at 320px, links 44px tall, WhatsApp line 42.2px at 360px; keyboard flip with Enter and Space confirmed in headless Chromium. Parent spot check re-ran `pnpm test` (39 pass) and reviewed the front at 1280px, the back at 360px and the logo comparison.

- T7 implemented by the same writer: centered front with the logo at 90% of the card height, opacity 0.4, an elliptical fade mask behind the wordmark and a gradient-only gold glow; no band on the front; small full-strength logo and gold rule on the back. Evidence: RED `pnpm test` 5 failed; GREEN 44 tests in 4 files pass; `pnpm typecheck` and `pnpm build` exit 0; exported front PNG 3060 x 1980 with mask and gradient rendered; print PDF 2 pages at 85 x 55 mm. Parent spot check re-ran `pnpm test` (44 pass) and reviewed the front at 360px and 1280px and the back at 1280px.
- T7 open design notes: the faint rings read bronze rather than gold and the side circles fade heavily; the small logo on the back floats between the contacts and the QR.

- T8 implemented by the same writer: dark back on the same ink ground as the front, clipped logo watermark (opacity 0.22), gold hairline divider, gold contact icons, QR on a `#fbf8f1` plate with a gold frame; corner band and small logo removed. Evidence: RED `pnpm test` 6 failed / 42 passed; GREEN 48 tests in 4 files pass; `pnpm typecheck` and `pnpm build` exit 0; front pixel-identical to T7; `ZXingReader` decodes the QR from the 360px back screenshot to the page URL; exported back PNG 3060 x 1980; print PDF 2 pages at 85 x 55 mm. Parent spot check re-ran `pnpm test` (48 pass) and reviewed the back at 360px and 1280px.
- T8 known gap: LinkedIn, Facebook and website lines are 24.7px tall on phones; WhatsApp is 42.2px.

- T9 implemented by the same writer: four member pages at `/<slug>/` with personal back face, `contacto.vcf` and link preview; shared title "Partner"; members fall back to agency contacts (no personal data supplied); every built page carries a `noindex, nofollow, noarchive` robots meta and `vercel.json` sends the same `X-Robots-Tag` site-wide. Evidence: RED `pnpm test` 7 failed and 2 files failed to load; GREEN 87 tests in 6 files pass; `pnpm typecheck` and `pnpm build` exit 0; member data absent from `dist/index.html` and the shared bundle; agency faces pixel-identical; QR on `/patricia/` decodes to that page. Parent spot check re-ran `pnpm test` and `pnpm build`, counted the robots meta in all five built pages, read `vercel.json`, and reviewed the longest-name back at 360px and the shortest at 1280px.
- T9 unverified: `vercel.json` headers and `trailingSlash` until deployed (Vercel hosting is an assumption); a member with personal contacts in the browser (tests only).
- T9 known gap: member contact lines are 18.2px tall on phones (WhatsApp 25–42px depending on name length).

- T10 implemented by the same writer: the QR plate is a button ("Ampliar código QR") that opens a native modal dialog with the code alone on white; "Descargar QR" saves a standalone PNG (`ikizen-qr.png` / `<slug>-qr.png`). Evidence: RED `pnpm test` 3 failed and `export.test.ts` failed to load; GREEN 99 tests in 7 files pass; `pnpm typecheck` and `pnpm build` exit 0; main screen pixel-identical; dialog fits without scroll at 320 x 568, 360 x 740 and 740 x 360 (QR 256–288px); keyboard open/close and focus return confirmed; downloads are 1056 and 1036 px square and decode to the card URLs; print with the dialog open still yields 2 pages at 85 x 55 mm. Parent spot check re-ran `pnpm test` (99 pass), decoded both downloaded PNGs and reviewed the dialog screenshot at 360px.
- T10 not exercised: a real phone scanning the enlarged code, a screen reader. The caption stayed "Escanear" because the tap hint did not fit.

- T11 implemented by the same writer: caption "Toca para ampliar" (plate moved 18 units left, watermark 50 units right); FLIP transition from the plate to the screen center via a pure helper (`src/flip.ts`); enlarged view without the boxed panel; card exactly centered when the viewport is at least 34rem tall, group centering below that. Evidence: RED `pnpm test` 4 failed and `flip.test.ts` failed to load; GREEN 106 tests in 8 files pass; `pnpm typecheck` and `pnpm build` exit 0; card midpoint within 0.01px of the viewport midpoint at five viewports; settled tile has transform `none`; interruption cases (Esc mid-flight, double activation, resize) end in a clean state; downloads still decode. Parent spot check re-ran `pnpm test` (106 pass) and reviewed the settled dialog, a mid-transition frame and the back at 360px.
- T11 not exercised: smoothness on a real device (frames sampled by pausing the animation), browsers without backdrop blur.

- T11 correction (owner: the card was still off-center): measured -62px on viewports under 34rem tall, the group-centering fallback. Parent made centering unconditional in `src/style.css` (inline, one mechanical file): the mirror block now applies at every size, and on short viewports only the links stay under the card while the hint and status move into the mirror block above it. Evidence: card midpoint equals viewport midpoint (0.0px, both axes) at 13 viewports from 360 x 740 to 1920 x 420 against the dev server; the card is also larger on short viewports (329px wide at 740 x 360, was 273px); 106 tests pass; `pnpm build` exits 0; landscape screenshot reviewed.

- Small owner-requested edits, done inline by the parent (one mechanical file each): the cream focus ring around the card was replaced by a slightly brighter paper edge on keyboard focus (`src/style.css`); the gold frame on the QR plate was removed (`src/card-faces.ts`, test first: RED 1 failed / 105 passed, GREEN 106 pass). `pnpm typecheck` and `pnpm build` exit 0. Neither edit was reviewed in a screenshot.

- T12 implemented by the same writer: three text contact lines on every back (WhatsApp, email, website); agency email in the profile and vCards; agency socials as an icon-only row; member backs show "Partner · <área>" with no socials and no sign-off; `ROLE` in member vCards; watermark opacity 0.16. Evidence: RED `pnpm test` 22 failed; GREEN 112 tests in 8 files pass; `pnpm typecheck` and `pnpm build` exit 0; front pixel-identical; card still exactly centered at 360 x 740 and 740 x 360; QR decodes from the back screenshots. Parent spot check re-ran `pnpm test` and `pnpm build`, read the `EMAIL`/`ROLE`/`TITLE` lines of the built vCards, and reviewed the agency back at 360px, Patricia at 1280px and Yanni at 360px.
- T12 target missed: agency text lines are 31px tall at 360px (target 40px); member lines are 41.7–47px; agency social icons about 41px.

- T13 implemented by the same writer: agency back without the social row (same structure as member backs); QR plate 150 units with a larger invisible tap area; front rings at opacity 0.68 with a fade shaped to the wordmark and a band behind the services line; flat `#111827` page. Evidence: RED `pnpm test` 12 failed; GREEN 115 tests in 8 files pass; `pnpm typecheck` and `pnpm build` exit 0; tap heights at 360px 44.8px (agency), 47.0px (Patricia), 41.7px (Yanni); card still exactly centered; dialog opens from the smaller plate. Parent spot check re-ran `pnpm test` and `pnpm build` and reviewed the front at 360px and 1280px and the agency back at 360px.
- T13 scannability of the small plate: the agency code (25 modules) decodes from the exported PNG and from 360px screenshots at scale 1–3; a member code (29 modules) does not decode at scale 1, decodes at scale 2 and 3. Printed plate is 12.5 mm (0.34–0.38 mm per module). A deployed URL is longer than `localhost`, so the denser case is the realistic one. Not exercised: a real phone camera, a paper print.

- T14 implemented by the same writer: a 1200 x 630 preview PNG per card built from the face builders with `@resvg/resvg-js` (dev dependency; Geist vendored as TTF because resvg cannot read woff2), absolute `og:image` when `VITE_SITE_URL` is set; a hand-written service worker that precaches only shared assets and caches pages at runtime; "Compartir" sends the visible face as a PNG plus the link where the share sheet accepts files. Evidence: RED `pnpm test` 2 failed and 3 files failed to load; GREEN 138 tests; `pnpm build` exits 0 with and without the site URL; previews 107–117 KB; offline reload of `/` and `/yanni/` works after one online load, unopened pages show an offline message; stubbed share receives one PNG and the URL. Parent spot check re-ran `pnpm test` (152 pass after T15), `pnpm typecheck` and both builds, read the `og:image` tags, confirmed no member name in `dist/sw.js`, `dist/index.html` or the shared bundle, counted the robots meta on five pages, and reviewed a member preview image.
- T14 not exercised: a real share sheet, real chat previews, the redeploy cache migration, the Vercel `sw.js` header.
- T15 implemented by the same writer: swipe to flip with a pure release decision (`src/gesture.ts`), tap and keyboard unchanged; a one-time 12.9° peek replaces the visible hint (text hint kept under reduced motion). Evidence: RED `gesture.test.ts` failed to load; GREEN 152 tests in 12 files; ten synthetic gestures end in a clean resting state; card still exactly centered at four viewports; QR dialog still starts over the plate; print still 2 pages at 85 x 55 mm. Parent reviewed a peek frame.
- T15 not exercised: real fingers on a real phone.

- Owner-reported defect, fixed inline by the parent: tapping a contact or the QR drew a selection outline. Cause, confirmed by driving the page: browsers outline SVG links on plain `:focus` (computed `auto 5px` after a click, with `:focus-visible` false). Fix in `src/style.css` and `src/main.ts`: that outline is removed, tap highlights are transparent, and focus rings show only when the visitor last used the keyboard (`data-input` on the root). Evidence after the fix: outline `none` after clicking the card, a contact, and after closing the QR view; outline `solid 2px` after pressing Tab; 152 tests pass; `pnpm build` exits 0.

## Pending

- Work-unit commits: blocked, git has no `user.name` / `user.email` configured on this machine.
- Native review: on (global). Preflight asks for an untracked-file selection because the repository has no commits; deferred until the work-unit commits exist.
- Engram mirror `odd/digital-business-card/tasks`: pending, the save failed with a host session registration error.

## Next step

Configure the git identity, commit the work units on `feat/digital-business-card`, then deploy the static `dist/` and set `VITE_SITE_URL`.
