import { describe, expect, it } from 'vitest';
import { cardPage } from './cards.ts';
import { buildServiceWorker, selectPrecache } from './offline.ts';
import { members, profile } from './profile.ts';

/** What a build emits: shared assets plus every card's page, vCard and preview. */
const builtFiles = [
  'index.html',
  'ikizen.vcf',
  'assets/index-AbC123.js',
  'assets/index-XyZ789.css',
  'assets/geist-latin-wght-normal-BgDaEnEv.woff2',
  'assets/preview-Qw12Er34.png',
  ...members.flatMap((member) => [
    `${cardPage(profile, member).path}index.html`,
    cardPage(profile, member).vcardPath,
    `assets/preview-${member.slug.length}Zz9.png`,
  ]),
];

describe('selectPrecache', () => {
  const precache = selectPrecache(builtFiles);

  it('keeps only shared assets: script, stylesheet, fonts and the favicon', () => {
    expect(precache).toEqual([
      'assets/geist-latin-wght-normal-BgDaEnEv.woff2',
      'assets/index-AbC123.js',
      'assets/index-XyZ789.css',
      'favicon.svg',
    ]);
  });

  it('never lists a page, a vCard or a preview image', () => {
    for (const file of precache) expect(file).not.toMatch(/\.(html|vcf|png)$/);
  });
});

describe('buildServiceWorker', () => {
  const worker = buildServiceWorker(selectPrecache(builtFiles));

  it('is plain script source with the precache list inside', () => {
    expect(worker).toContain('"assets/index-AbC123.js"');
    expect(worker).toContain("addEventListener('fetch'");
    expect(() => new Function(worker)).not.toThrow(); // parses as JavaScript
  });

  it('does not enumerate the team: no slug, name, vCard or preview path of any member', () => {
    for (const member of members) {
      const page = cardPage(profile, member);
      for (const secret of [member.slug, member.givenName, member.familyName, page.vcardPath, 'contacto']) {
        expect(worker.toLowerCase()).not.toContain(secret.toLowerCase());
      }
    }
    expect(worker).not.toMatch(/preview-/);
    expect(worker).not.toContain('ikizen.vcf');
  });

  it('names its cache after its content, so every deploy gets a fresh one', () => {
    const version = (source: string): string => source.match(/const CACHE = "([^"]+)"/)?.[1] ?? '';
    const other = buildServiceWorker(['assets/index-Changed.js', 'favicon.svg']);
    expect(version(worker)).toMatch(/^ikizen-[0-9a-f]{8,}$/);
    expect(version(other)).not.toBe(version(worker));
    expect(version(buildServiceWorker(selectPrecache(builtFiles)))).toBe(version(worker));
  });
});
