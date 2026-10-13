/** vCard 3.0 (RFC 2426) builder. Pure: no DOM, usable at build time. */

export interface VCardSource {
  /** Formatted name. For an organization card it is also the organization. */
  name: string;
  /** Set for a person: fills the structured name instead of the organization-style one. */
  person?: { givenName: string; familyName: string };
  /** Defaults to `name` (an organization card). */
  organization?: string;
  title?: string;
  /** What the person does, as free text (vCard 3.0 ROLE). */
  role?: string;
  phone?: string;
  email?: string;
  description?: string;
  links?: ReadonlyArray<{ url: string }>;
}

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;

/** Escapes a text value: backslash, comma, semicolon and newlines. */
export function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Folds a content line at 75 octets. Continuation lines start with one space,
 * and the split never lands inside a multi-byte character.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let chunk = '';
  let octets = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (octets + size > MAX_LINE_OCTETS) {
      chunks.push(chunk);
      chunk = ' ';
      octets = 1;
    }
    chunk += char;
    octets += size;
  }
  chunks.push(chunk);
  return chunks.join(CRLF);
}

const hasValue = (value: string | undefined): value is string =>
  value !== undefined && value.trim() !== '';

export function buildVCard(source: VCardSource): string {
  const name = escapeVCardText(source.name.trim());
  const organization = hasValue(source.organization)
    ? escapeVCardText(source.organization.trim())
    : name;
  // N is family;given;additional;prefix;suffix. Without a person it is
  // organization-style: the name goes in the family-name slot.
  const structuredName = source.person
    ? `${escapeVCardText(source.person.familyName.trim())};${escapeVCardText(source.person.givenName.trim())};;;`
    : `${name};;;;`;

  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`, `N:${structuredName}`, `ORG:${organization}`];

  if (hasValue(source.title)) {
    lines.push(`TITLE:${escapeVCardText(source.title.trim())}`);
  }
  if (hasValue(source.role)) {
    lines.push(`ROLE:${escapeVCardText(source.role.trim())}`);
  }
  if (hasValue(source.phone)) {
    lines.push(`TEL;TYPE=CELL:${source.phone.trim()}`);
  }
  if (hasValue(source.email)) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardText(source.email.trim())}`);
  }
  for (const link of source.links ?? []) {
    // URL is a URI value, not text, so it is written without text escaping.
    if (hasValue(link.url)) lines.push(`URL:${link.url.trim()}`);
  }
  if (hasValue(source.description)) {
    lines.push(`NOTE:${escapeVCardText(source.description.trim())}`);
  }
  lines.push('END:VCARD');

  return lines.map(foldLine).join(CRLF) + CRLF;
}
