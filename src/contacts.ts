/**
 * Resolves the contact links printed on a card. Pure: no DOM.
 *
 * The brand's social networks are not printed: they stay in the profile and
 * go into the vCards only.
 */

import type { IconName } from './icons.ts';
import { buildWhatsAppUrl } from './links.ts';
import type { Member, Profile } from './profile.ts';

export interface ContactLine {
  icon: IconName;
  text: string;
  href: string;
  /** Accessible name when the printed text alone is not enough. */
  label?: string;
}

/**
 * The three text contact lines of every card: WhatsApp, email, website.
 * With `member`, their own phone and email are used where they exist and the
 * brand's everywhere else, so a member card differs only in the lines the
 * member actually has.
 */
export function contactLines(profile: Profile, member?: Member): ContactLine[] {
  // A member's phone is shown as they wrote it; the brand has a display form.
  const phoneText = member?.phone ?? profile.phoneDisplay;
  const email = member?.email ?? profile.email;
  const website = profile.links.find((link) => link.id === 'website');

  return [
    {
      icon: 'whatsapp',
      text: phoneText,
      href: buildWhatsAppUrl(
        member?.phone ?? profile.phone,
        (member?.phone ? member.whatsappMessage : undefined) ?? profile.whatsappMessage,
      ),
      label: `Escribir por WhatsApp al ${phoneText}`,
    },
    { icon: 'mail', text: email, href: `mailto:${email}` },
    ...(website
      ? [{ icon: 'globe', text: website.handle, href: website.url } satisfies ContactLine]
      : []),
  ];
}
