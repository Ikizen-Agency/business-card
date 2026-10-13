import { describe, expect, it } from 'vitest';
import { DEFAULT_MEMBER_TITLE, memberTitle, members, profile, type Member } from './profile.ts';

describe('members', () => {
  it('lists the four members, alphabetically by slug, with the names as written', () => {
    expect(members.map((member) => [member.slug, member.name])).toEqual([
      ['fernando', 'Fernando Jose Bernal Suarez'],
      ['johny', 'Johny A. Pedraza Romero'],
      ['patricia', 'Patricia Mieres Dias'],
      ['yanni', 'Yanni Alejandro Fernandez Quintana'],
    ]);
  });

  it('stores name parts that add up to the full name', () => {
    for (const member of members) {
      expect(`${member.givenName} ${member.familyName}`).toBe(member.name);
    }
  });

  it('gives everyone the shared title, stored once', () => {
    expect(DEFAULT_MEMBER_TITLE).toBe('Partner');
    for (const member of members) {
      expect(member.title).toBeUndefined();
      expect(memberTitle(member)).toBe('Partner');
    }
  });

  it('lets one member override the title', () => {
    const lead: Member = { ...(members[0] as Member), title: 'Director' };
    expect(memberTitle(lead)).toBe('Director');
  });

  it('gives each member the area the owner assigned, separate from the title', () => {
    expect(members.map((member) => [member.slug, member.area])).toEqual([
      ['fernando', 'Desarrollo'],
      ['johny', 'Desarrollo'],
      ['patricia', 'Marca'],
      ['yanni', 'Desarrollo'],
    ]);
  });

  it('holds no personal contact data that was not supplied', () => {
    for (const member of members) {
      expect(Object.keys(member).sort()).toEqual(['area', 'familyName', 'givenName', 'name', 'slug']);
    }
  });

  it('uses slugs that are safe as URL path segments', () => {
    for (const member of members) expect(member.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(new Set(members.map((member) => member.slug)).size).toBe(members.length);
  });
});

describe('profile', () => {
  it('has the brand email and still the single WhatsApp number', () => {
    expect(profile.email).toBe('ikizen.agency@gmail.com');
    expect(profile.phone).toBe('+5355002026');
  });
});
