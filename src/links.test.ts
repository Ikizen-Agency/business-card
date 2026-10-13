import { describe, expect, it } from 'vitest';
import { profile } from './profile.ts';
import { buildTelHref, buildWhatsAppUrl } from './links.ts';

describe('buildWhatsAppUrl', () => {
  it('builds the brand chat link with the prefilled message', () => {
    expect(buildWhatsAppUrl(profile.phone, profile.whatsappMessage)).toBe(
      'https://wa.me/5355002026?text=Me%20interesan%20sus%20servicios',
    );
  });

  it('strips everything that is not a digit from the phone', () => {
    expect(buildWhatsAppUrl('+53 (5) 500-20.26', 'Hola')).toBe('https://wa.me/5355002026?text=Hola');
  });

  it('URL-encodes reserved and non-ASCII characters in the message', () => {
    expect(buildWhatsAppUrl('5355002026', '¿Precio & plazo?')).toBe(
      'https://wa.me/5355002026?text=%C2%BFPrecio%20%26%20plazo%3F',
    );
  });

  it('omits the text parameter when there is no message', () => {
    expect(buildWhatsAppUrl('+5355002026')).toBe('https://wa.me/5355002026');
    expect(buildWhatsAppUrl('+5355002026', '  ')).toBe('https://wa.me/5355002026');
  });
});

describe('buildTelHref', () => {
  it('keeps the international prefix and drops separators', () => {
    expect(buildTelHref('+53 5500 2026')).toBe('tel:+5355002026');
  });

  it('does not add a prefix to a local number', () => {
    expect(buildTelHref('5500-2026')).toBe('tel:55002026');
  });
});
