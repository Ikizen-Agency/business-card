import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { cardPage, cardVCard, renderHead } from './src/cards.ts';
import { buildServiceWorker, selectPrecache } from './src/offline.ts';
import { PREVIEW_WIDTH, buildPreviewSvg } from './src/preview.ts';
import { members, profile, type Member } from './src/profile.ts';

/**
 * Static Geist files the rasterizer can read. It cannot read the woff2 the
 * page uses, so these two TTFs (regular and bold, unwrapped from the WOFF
 * files of @fontsource/geist 5.3.0) are loaded explicitly. See README.
 */
const PREVIEW_FONTS = ['Geist-Regular.ttf', 'Geist-Bold.ttf'].map((file) =>
  fileURLToPath(new URL(`./src/preview/fonts/${file}`, import.meta.url)),
);

/** Rasterizes a card's link-preview image (see src/preview.ts) to PNG. */
function renderPreviewPng(member?: Member): Uint8Array {
  // The faces name the variable web font; here the static family stands in.
  const svg = buildPreviewSvg(profile, member).replaceAll("'Geist Variable', system-ui, sans-serif", 'Geist');
  const image = new Resvg(svg, {
    fitTo: { mode: 'width', value: PREVIEW_WIDTH },
    font: { fontFiles: PREVIEW_FONTS, loadSystemFonts: false, defaultFontFamily: 'Geist' },
  }).render();
  return image.asPng();
}

/** Placeholder in index.html where the per-page head tags go. */
const HEAD_MARKER = '<!--card:head-->';
/** The rendered head tags stay between these comments so a page can be re-headed. */
const HEAD_BLOCK = /<!--card:head:start-->[\s\S]*?<!--card:head:end-->/;

/** Every vCard of the site, by path under the base: the brand's and one per member. */
const vcards = new Map<string, string>(
  [undefined, ...members].map((member) => [
    cardPage(profile, member).vcardPath,
    cardVCard(profile, member),
  ]),
);

/** The member whose card lives at `url`, if any (`/slug`, `/slug/` or `/slug/index.html`). */
function memberAt(url: string | undefined, base: string): Member | undefined {
  const path = url?.split(/[?#]/)[0] ?? '';
  if (!path.startsWith(base)) return undefined;
  const slug = path.slice(base.length).replace(/\/(index\.html)?$/, '');
  return members.find((member) => member.slug === slug);
}

/**
 * Serves the vCards as text/vcard. Dev has no emitted files and the preview
 * server does not know the .vcf media type, so both answer them explicitly.
 */
function serveVCards(base: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = req.url?.split('?')[0] ?? '';
    const vcard = path.startsWith(base) ? vcards.get(path.slice(base.length)) : undefined;
    if (vcard === undefined) return next();
    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.end(vcard);
  };
}

/**
 * Keeps the build outputs in sync with src/profile.ts:
 * - writes the head tags (title, description, robots, link previews) into the
 *   brand page and into one static page per member, `<slug>/index.html`;
 * - renders one link-preview PNG per card;
 * - emits the vCards, and serves them and the member routes in dev;
 * - emits the service worker that makes opened cards available offline.
 */
function profileOutputs(): Plugin {
  let siteUrl: string | undefined;
  let base = '/';

  const headBlock = (member?: Member, cardImagePath?: string): string =>
    `<!--card:head:start-->\n    ${renderHead(profile, member, siteUrl, cardImagePath)}\n    <!--card:head:end-->`;

  return {
    name: 'ikizen-profile-outputs',
    // Runs after Vite has put the final index.html into the bundle.
    enforce: 'post',

    configResolved(config) {
      base = config.base;
      // Optional public address of the deployed site; og:url is skipped without it.
      const value: unknown = config.env.VITE_SITE_URL;
      siteUrl = typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
    },

    configureServer(server) {
      server.middlewares.use(serveVCards(base));
      // Dev has one index.html: a member route is answered with it, and
      // transformIndexHtml below picks the member from the original URL.
      server.middlewares.use((req, _res, next) => {
        if (memberAt(req.url, base)) req.url = `${base}index.html`;
        next();
      });
    },

    configurePreviewServer(server) {
      server.middlewares.use(serveVCards(base));
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        // `originalUrl` only exists in dev; the build always renders the brand page here.
        return html.replace(HEAD_MARKER, headBlock(memberAt(context.originalUrl, base)));
      },
    },

    generateBundle(_options, bundle) {
      for (const [fileName, source] of vcards) {
        this.emitFile({ type: 'asset', fileName, source });
      }

      const index = bundle['index.html'];
      if (index?.type !== 'asset' || typeof index.source !== 'string' || !HEAD_BLOCK.test(index.source)) {
        this.error('index.html with its head block was not found in the bundle');
      }
      const builtPage = index.source;

      // Every card's page is the built page with its own head tags, now that
      // its preview image has a name. They are real files because link
      // previews and crawlers do not run scripts. The images all share one
      // base name and differ only by content hash, so no file name tells whose it is.
      for (const member of [undefined, ...members]) {
        const image = this.emitFile({ type: 'asset', name: 'preview.png', source: renderPreviewPng(member) });
        // A function replacement keeps "$" in the data from being read as a pattern.
        const source = builtPage.replace(HEAD_BLOCK, () => headBlock(member, this.getFileName(image)));
        if (member) {
          this.emitFile({ type: 'asset', fileName: `${cardPage(profile, member).path}index.html`, source });
        } else {
          index.source = source;
        }
      }

      // Last, so it sees every shared file. It lists none of the pages.
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: buildServiceWorker(selectPrecache(Object.keys(bundle))),
      });
    },
  };
}

export default defineConfig({
  plugins: [profileOutputs()],
});
