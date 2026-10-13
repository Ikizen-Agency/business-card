import { describe, expect, it } from 'vitest';
import { profile } from './profile.ts';
import { buildVCard, escapeVCardText } from './vcard.ts';

const lines = (vcard: string): string[] => vcard.split('\r\n');

describe('escapeVCardText', () => {
  it('escapes backslash, comma and semicolon', () => {
    expect(escapeVCardText('a\\b,c;d')).toBe('a\\\\b\\,c\\;d');
  });

  it('turns every newline flavor into a literal \\n', () => {
    expect(escapeVCardText('one\r\ntwo\nthree\rfour')).toBe('one\\ntwo\\nthree\\nfour');
  });
});

describe('buildVCard', () => {
  it('wraps the card in a vCard 3.0 envelope with CRLF line endings', () => {
    const vcard = buildVCard({ name: 'Acme' });
    const all = lines(vcard);

    expect(all[0]).toBe('BEGIN:VCARD');
    expect(all[1]).toBe('VERSION:3.0');
    expect(all.at(-2)).toBe('END:VCARD');
    expect(vcard.endsWith('\r\n')).toBe(true);
    expect(vcard.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });

  it('writes the organization as FN, ORG and an organization-style N', () => {
    const all = lines(buildVCard({ name: 'Ikizen' }));

    expect(all).toContain('FN:Ikizen');
    expect(all).toContain('ORG:Ikizen');
    expect(all).toContain('N:Ikizen;;;;');
  });

  it('writes the phone as a cell number and one URL per link', () => {
    const all = lines(
      buildVCard({
        name: 'Acme',
        phone: '+5355002026',
        links: [{ url: 'https://a.example/' }, { url: 'https://b.example/?id=1' }],
      }),
    );

    expect(all).toContain('TEL;TYPE=CELL:+5355002026');
    expect(all.filter((line) => line.startsWith('URL:'))).toEqual([
      'URL:https://a.example/',
      'URL:https://b.example/?id=1',
    ]);
  });

  it('escapes text values', () => {
    const all = lines(buildVCard({ name: 'Acme, Inc; Ltd', description: 'Line one\nLine two' }));

    expect(all).toContain('FN:Acme\\, Inc\\; Ltd');
    expect(all).toContain('N:Acme\\, Inc\\; Ltd;;;;');
    expect(all).toContain('NOTE:Line one\\nLine two');
  });

  it('omits properties whose value is missing or blank', () => {
    const vcard = buildVCard({ name: 'Acme', phone: '', description: '   ', links: [] });

    expect(vcard).not.toContain('TEL');
    expect(vcard).not.toContain('URL');
    expect(vcard).not.toContain('NOTE');
  });

  it('folds lines longer than 75 octets without splitting a character', () => {
    const description = 'ñ'.repeat(60); // 120 octets in UTF-8
    const vcard = buildVCard({ name: 'Acme', description });
    const encoder = new TextEncoder();

    for (const line of lines(vcard)) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolding (CRLF + space removed) gives the original value back.
    expect(vcard.replaceAll('\r\n ', '')).toContain(`NOTE:${description}`);
  });

  it('writes a person: structured N, separate ORG, TITLE and EMAIL', () => {
    const all = lines(
      buildVCard({
        name: 'Ana Maria Perez; Lopez',
        person: { givenName: 'Ana Maria', familyName: 'Perez; Lopez' },
        organization: 'Acme, Inc',
        title: 'Partner',
        phone: '+5350000000',
        email: 'ana@example.com',
      }),
    );

    expect(all.slice(2, 8)).toEqual([
      'FN:Ana Maria Perez\\; Lopez',
      'N:Perez\\; Lopez;Ana Maria;;;',
      'ORG:Acme\\, Inc',
      'TITLE:Partner',
      'TEL;TYPE=CELL:+5350000000',
      'EMAIL;TYPE=INTERNET:ana@example.com',
    ]);
  });

  it('writes ROLE after TITLE, and omits it when blank', () => {
    const all = lines(buildVCard({ name: 'Ana', title: 'Partner', role: 'Marca, digital' }));
    expect(all.slice(4, 7)).toEqual(['ORG:Ana', 'TITLE:Partner', 'ROLE:Marca\\, digital']);
    expect(buildVCard({ name: 'Ana', role: '  ' })).not.toContain('ROLE');
  });

  it('omits TITLE and EMAIL when they are missing or blank', () => {
    const vcard = buildVCard({ name: 'Acme', title: ' ', email: '' });
    expect(vcard).not.toContain('TITLE');
    expect(vcard).not.toContain('EMAIL');
  });

  it('builds the brand card from the profile', () => {
    const unfolded = lines(buildVCard(profile).replaceAll('\r\n ', ''));

    expect(unfolded).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Ikizen',
      'N:Ikizen;;;;',
      'ORG:Ikizen',
      'TEL;TYPE=CELL:+5355002026',
      'EMAIL;TYPE=INTERNET:ikizen.agency@gmail.com',
      'URL:https://ikizen.vercel.app/',
      'URL:https://www.linkedin.com/in/ikizen-agency-615244377/',
      'URL:https://www.facebook.com/profile.php?id=61578920502554',
      'NOTE:Creamos sitios web y marcas memorables para empresas que quieren destacar.',
      'END:VCARD',
      '',
    ]);
  });
});
