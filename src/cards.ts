/**
 * What each page of the site is: the brand card at the root and one card per
 * team member at `/<slug>/`. Pure: used by the build (vite.config.ts) to write
 * the static pages and vCards, and by the page to know its own addresses.
 */

import { escapeXml } from './card-faces.ts';
import { PREVIEW_HEIGHT, PREVIEW_WIDTH } from './preview.ts';
import { headlineText, memberTitle, type Member, type Profile } from './profile.ts';
import { buildVCard } from './vcard.ts';

/**
 * Sent on every page, as a meta tag and as a response header: the whole site
 * is kept out of search engines. It is not access control.
 */
export const ROBOTS = 'noindex, nofollow, noarchive';

/** Id of the JSON block a member page carries so the script knows whose card it is. */
export const CARD_DATA_ID = 'card-data';

export interface CardPage {
  /** Path under the site base, with a trailing slash: '' for the brand card. */
  path: string;
  title: string;
  description: string;
  /** vCard path under the site base. */
  vcardPath: string;
  /** Name suggested when the vCard is saved. */
  vcardFilename: string;
  /** Prefix of the exported PNG names. */
  exportName: string;
  /** Name of the standalone QR image. */
  qrFilename: string;
}

export function cardPage(profile: Profile, member?: Member): CardPage {
  if (!member) {
    return {
      path: '',
      title: `${profile.name} — ${headlineText(profile)}`,
      description: profile.description,
      vcardPath: 'ikizen.vcf',
      vcardFilename: 'ikizen.vcf',
      exportName: 'ikizen-tarjeta',
      qrFilename: 'ikizen-qr.png',
    };
  }
  const role = `${memberTitle(member)} en ${profile.name}`;
  return {
    path: `${member.slug}/`,
    title: `${member.name} — ${role}`,
    description: `${member.name}, ${role} (${member.area}). ${profile.description}`,
    vcardPath: `${member.slug}/contacto.vcf`,
    vcardFilename: `${member.slug}-ikizen.vcf`,
    exportName: `ikizen-tarjeta-${member.slug}`,
    qrFilename: `${member.slug}-qr.png`,
  };
}

/** vCard of the brand or, with `member`, of that person with the brand as fallback. */
export function cardVCard(profile: Profile, member?: Member): string {
  if (!member) return buildVCard(profile);
  return buildVCard({
    name: member.name,
    person: member,
    organization: profile.name,
    title: memberTitle(member),
    role: member.area,
    // Digits only after the "+", whatever spacing the member used.
    phone: member.phone ? `+${member.phone.replace(/\D/g, '')}` : profile.phone,
    email: member.email ?? profile.email,
    links: profile.links,
    description: profile.description,
  });
}

/**
 * The `<head>` tags that differ per page, as static HTML: chat link previews
 * and crawlers do not run JavaScript, so title, description, robots and the
 * Open Graph / Twitter tags have to be in the file itself.
 *
 * `siteUrl` is the public address of the site; `og:url` is left out without it.
 *
 * `cardImagePath` is the card's own preview image, as a path under the site
 * (the build generates it). Chat apps only honour an absolute `og:image`, so
 * it is used only together with `siteUrl`; otherwise the profile's generic
 * image stands in.
 */
export function renderHead(
  profile: Profile,
  member?: Member,
  siteUrl?: string,
  cardImagePath?: string,
): string {
  const page = cardPage(profile, member);
  const site = siteUrl?.replace(/\/+$/, '');
  const previewImage =
    site && cardImagePath
      ? { url: `${site}/${cardImagePath}`, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }
      : profile.previewImage;
  const meta = (key: 'name' | 'property', id: string, content: string): string =>
    `<meta ${key}="${id}" content="${escapeXml(content)}">`;

  const tags = [
    `<title>${escapeXml(page.title)}</title>`,
    meta('name', 'description', page.description),
    meta('name', 'robots', ROBOTS),
    meta('property', 'og:type', member ? 'profile' : 'website'),
    meta('property', 'og:site_name', profile.name),
    meta('property', 'og:title', page.title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:image', previewImage.url),
    meta('property', 'og:image:width', String(previewImage.width)),
    meta('property', 'og:image:height', String(previewImage.height)),
    ...(site ? [meta('property', 'og:url', `${site}/${page.path}`)] : []),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', page.title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', previewImage.url),
  ];

  if (member) {
    // Inert data, not code. "<" is escaped so a value can never close the element.
    const json = JSON.stringify(member).replace(/</g, '\\u003c');
    tags.push(`<script type="application/json" id="${CARD_DATA_ID}">${json}</script>`);
  }
  return tags.join('\n    ');
}
