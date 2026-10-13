import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROBOTS, cardPage, cardVCard, renderHead } from './cards.ts';
import { contactLines } from './contacts.ts';
import { members, profile, type Member } from './profile.ts';

const johny = members.find((member) => member.slug === 'johny') as Member;
const lines = (vcard: string): string[] => vcard.replaceAll('\r\n ', '').split('\r\n');

describe('contactLines', () => {
  it('gives the brand card three text lines: WhatsApp, email, website', () => {
    expect(contactLines(profile)).toEqual([
      {
        icon: 'whatsapp',
        text: '+53 5500 2026',
        href: 'https://wa.me/5355002026?text=Me%20interesan%20sus%20servicios',
        label: 'Escribir por WhatsApp al +53 5500 2026',
      },
      { icon: 'mail', text: 'ikizen.agency@gmail.com', href: 'mailto:ikizen.agency@gmail.com' },
      { icon: 'globe', text: 'ikizen.vercel.app', href: 'https://ikizen.vercel.app/' },
    ]);
  });

  it('gives every member the brand contacts, since none has their own', () => {
    for (const member of members) expect(contactLines(profile, member)).toEqual(contactLines(profile));
  });

  it('uses the member phone for WhatsApp when there is one, and changes only that line', () => {
    const withPhone = contactLines(profile, { ...johny, phone: '+53 5111 2233' });
    expect(withPhone[0]).toMatchObject({
      text: '+53 5111 2233',
      href: 'https://wa.me/5351112233?text=Me%20interesan%20sus%20servicios',
      label: 'Escribir por WhatsApp al +53 5111 2233',
    });
    expect(withPhone.slice(1)).toEqual(contactLines(profile).slice(1));
  });

  it('uses the member WhatsApp message when there is one', () => {
    const [whatsapp] = contactLines(profile, { ...johny, phone: '+5351112233', whatsappMessage: 'Hola Johny' });
    expect(whatsapp?.href).toBe('https://wa.me/5351112233?text=Hola%20Johny');
  });

  it('uses the member email when there is one, still as three lines', () => {
    const withEmail = contactLines(profile, { ...johny, email: 'j@example.com' });
    expect(withEmail).toHaveLength(3);
    expect(withEmail[1]).toEqual({ icon: 'mail', text: 'j@example.com', href: 'mailto:j@example.com' });
  });
});

describe('cardPage', () => {
  it('keeps the brand card at the root with its own vCard', () => {
    expect(cardPage(profile)).toMatchObject({ path: '', vcardPath: 'ikizen.vcf' });
  });

  it('gives each member a directory, a vCard inside it and a title naming the person', () => {
    expect(cardPage(profile, johny)).toMatchObject({
      path: 'johny/',
      vcardPath: 'johny/contacto.vcf',
      title: 'Johny A. Pedraza Romero — Partner en Ikizen',
    });
  });
});

describe('cardPage QR file names', () => {
  it('names the standalone QR after the card it opens', () => {
    expect(cardPage(profile).qrFilename).toBe('ikizen-qr.png');
    expect(cardPage(profile, johny).qrFilename).toBe('johny-qr.png');
  });
});

describe('cardVCard', () => {
  it('leaves the brand vCard as an organization card, now with its email', () => {
    const vcard = lines(cardVCard(profile));
    expect(vcard).toContain('FN:Ikizen');
    expect(vcard).toContain('N:Ikizen;;;;');
    expect(vcard).toContain('EMAIL;TYPE=INTERNET:ikizen.agency@gmail.com');
    expect(vcard.some((line) => line.startsWith('TITLE') || line.startsWith('ROLE'))).toBe(false);
    // The social networks left the card face; the contact file still has them.
    expect(vcard).toContain('URL:https://www.linkedin.com/in/ikizen-agency-615244377/');
    expect(vcard).toContain('URL:https://www.facebook.com/profile.php?id=61578920502554');
  });

  it('builds a personal vCard: shared title, the area as ROLE, brand contacts as fallback', () => {
    const vcard = lines(cardVCard(profile, johny));
    expect(vcard.slice(2, 9)).toEqual([
      'FN:Johny A. Pedraza Romero',
      'N:Pedraza Romero;Johny A.;;;',
      'ORG:Ikizen',
      'TITLE:Partner',
      'ROLE:Desarrollo',
      `TEL;TYPE=CELL:${profile.phone}`,
      'EMAIL;TYPE=INTERNET:ikizen.agency@gmail.com',
    ]);
    expect(vcard.filter((line) => line.startsWith('URL:'))).toEqual(
      profile.links.map((link) => `URL:${link.url}`),
    );
  });

  it('writes each member area as their ROLE', () => {
    for (const member of members) {
      expect(lines(cardVCard(profile, member))).toContain(`ROLE:${member.area}`);
    }
  });

  it('prefers the member phone and email', () => {
    const vcard = lines(cardVCard(profile, { ...johny, phone: '+53 5111 2233', email: 'j@example.com' }));
    expect(vcard).toContain('TEL;TYPE=CELL:+5351112233');
    expect(vcard).toContain('EMAIL;TYPE=INTERNET:j@example.com');
    expect(vcard).not.toContain('EMAIL;TYPE=INTERNET:ikizen.agency@gmail.com');
  });
});

describe('renderHead', () => {
  const robotsMeta = `<meta name="robots" content="${ROBOTS}">`;

  it('keeps every page out of search engines: the brand page and each member page', () => {
    expect(ROBOTS).toBe('noindex, nofollow, noarchive');
    expect(renderHead(profile)).toContain(robotsMeta);
    for (const member of members) expect(renderHead(profile, member)).toContain(robotsMeta);
  });

  it('titles the brand page with the headline and never names a member there', () => {
    const head = renderHead(profile);
    expect(head).toContain('<title>Ikizen — No hacemos sitios web. Hacemos que te recuerden.</title>');
    for (const member of members) {
      expect(head).not.toContain(member.slug);
      expect(head).not.toContain(member.familyName);
    }
  });

  it('names the person in the title and link-preview tags of a member page', () => {
    const head = renderHead(profile, johny);
    const title = 'Johny A. Pedraza Romero — Partner en Ikizen';
    expect(head).toContain(`<title>${title}</title>`);
    expect(head).toContain(`<meta property="og:title" content="${title}">`);
    expect(head).toContain(`<meta name="twitter:title" content="${title}">`);
  });

  it('adds og:url only when the site URL is known, pointing at the card itself', () => {
    expect(renderHead(profile, johny)).not.toContain('og:url');
    expect(renderHead(profile, johny, 'https://example.com')).toContain(
      '<meta property="og:url" content="https://example.com/johny/">',
    );
    expect(renderHead(profile, undefined, 'https://example.com/')).toContain(
      '<meta property="og:url" content="https://example.com/">',
    );
  });

  it('points link previews at the card\'s own image when the site URL and the image are known', () => {
    const head = renderHead(profile, johny, 'https://example.com/', 'assets/preview-AbC123.png');
    const image = 'https://example.com/assets/preview-AbC123.png';
    expect(head).toContain(`<meta property="og:image" content="${image}">`);
    expect(head).toContain('<meta property="og:image:width" content="1200">');
    expect(head).toContain('<meta property="og:image:height" content="630">');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(head).toContain(`<meta name="twitter:image" content="${image}">`);
    expect(head).not.toContain(profile.previewImage.url);
  });

  it('falls back to the generic image without the site URL or without a generated image', () => {
    const fallback = `<meta property="og:image" content="${profile.previewImage.url}">`;
    // A relative og:image is ignored by chat apps, so no site URL means no per-card image.
    expect(renderHead(profile, johny, undefined, 'assets/preview-AbC123.png')).toContain(fallback);
    expect(renderHead(profile, johny, 'https://example.com/')).toContain(fallback);
    expect(renderHead(profile)).toContain(fallback);
    expect(renderHead(profile)).toContain(
      `<meta property="og:image:width" content="${profile.previewImage.width}">`,
    );
  });

  it('embeds the member as inert JSON data, and nothing for the brand page', () => {
    expect(renderHead(profile)).not.toContain('application/json');
    const data = renderHead(profile, johny).match(
      /<script type="application\/json" id="card-data">(.*?)<\/script>/,
    )?.[1];
    expect(JSON.parse(data ?? 'null')).toEqual(johny);
  });

  it('escapes HTML in text and cannot close the data script early', () => {
    const tricky: Member = { ...johny, name: 'A "B" <C> & </script>' };
    const head = renderHead(profile, tricky);
    expect(head).toContain('<title>A &quot;B&quot; &lt;C&gt; &amp; &lt;/script&gt; — Partner en Ikizen</title>');
    expect(count(head, /<\/script>/g)).toBe(1);
  });
});

const count = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

describe('vercel.json', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };

  it('keeps the service worker from being cached by the browser or the CDN', () => {
    const rule = config.headers.find((entry) => entry.source === '/sw.js');
    expect(rule?.headers).toContainEqual({ key: 'Cache-Control', value: 'no-cache, max-age=0, must-revalidate' });
  });

  it('sends X-Robots-Tag on every path with one catch-all rule', () => {
    // One rule for the whole site: pages, vCards and assets. It cannot go
    // stale when a member is added, unlike a rule per slug.
    const rule = config.headers.find((entry) => entry.source === '/(.*)');
    expect(rule?.headers).toContainEqual({ key: 'X-Robots-Tag', value: ROBOTS });
  });
});
