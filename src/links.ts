/** Contact link builders. Pure: no DOM. */

const digitsOnly = (phone: string): string => phone.replace(/\D/g, '');

/** WhatsApp click-to-chat URL, optionally with a prefilled message. */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const base = `https://wa.me/${digitsOnly(phone)}`;
  const text = message?.trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** `tel:` href that keeps a leading "+" and drops every separator. */
export function buildTelHref(phone: string): string {
  const prefix = phone.trim().startsWith('+') ? '+' : '';
  return `tel:${prefix}${digitsOnly(phone)}`;
}
