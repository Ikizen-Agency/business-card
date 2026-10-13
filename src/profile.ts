/**
 * Single source of truth for the card. Edit this file to change any brand
 * data: the page, the vCard, the QR caption and the link-preview meta tags
 * all derive from it. Keep it pure (no DOM access) because the build imports it.
 */

export type LinkId = 'website' | 'linkedin' | 'facebook';

export interface ProfileLink {
  id: LinkId;
  /** Short text printed on the card next to the channel icon. */
  handle: string;
  url: string;
}

export interface Profile {
  name: string;
  /**
   * Two short sentences. The card sets `lead` quietly and `payoff` as the
   * emphasized line, so the copy can change without touching the layout code.
   */
  headline: { lead: string; payoff: string };
  description: string;
  services: string[];
  /** International format, digits with a leading "+". */
  phone: string;
  /** Same number, grouped for reading. */
  phoneDisplay: string;
  email: string;
  /** Text prefilled in the WhatsApp chat. */
  whatsappMessage: string;
  links: ProfileLink[];
  /** Image used by link previews (Open Graph / Twitter). */
  previewImage: { url: string; width: number; height: number };
}

export const profile: Profile = {
  name: 'Ikizen',
  headline: { lead: 'No hacemos sitios web.', payoff: 'Hacemos que te recuerden.' },
  description: 'Creamos sitios web y marcas memorables para empresas que quieren destacar.',
  services: ['Desarrollo Web', 'Identidad de Marca'],
  phone: '+5355002026',
  phoneDisplay: '+53 5500 2026',
  email: 'ikizen.agency@gmail.com',
  whatsappMessage: 'Me interesan sus servicios',
  links: [
    {
      id: 'website',
      handle: 'ikizen.vercel.app',
      url: 'https://ikizen.vercel.app/',
    },
    {
      id: 'linkedin',
      handle: 'LinkedIn',
      url: 'https://www.linkedin.com/in/ikizen-agency-615244377/',
    },
    {
      id: 'facebook',
      handle: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=61578920502554',
    },
  ],
  previewImage: {
    url: 'https://ikizen.vercel.app/og-image.jpg',
    width: 1200,
    height: 630,
  },
};

/** A team member with their own card at `/<slug>/`. */
export interface Member {
  /** URL path segment of the card: lowercase letters, digits and hyphens. */
  slug: string;
  /** Full name, exactly as the person writes it. */
  name: string;
  /** The two halves of `name`: used for the vCard and for a two-line break on the card. */
  givenName: string;
  familyName: string;
  /** Only when it differs from DEFAULT_MEMBER_TITLE. */
  title?: string;
  /** What the member works on, shown next to the title. It is not a rank. */
  area: string;
  /** International format, e.g. '+53 5xxx xxxx'. Shown as written; used for WhatsApp and the vCard. */
  phone?: string;
  /** Overrides the brand's prefilled WhatsApp text for this member's phone. */
  whatsappMessage?: string;
  email?: string;
}

/** The title every member shares unless their entry sets its own. */
export const DEFAULT_MEMBER_TITLE = 'Partner';

export const memberTitle = (member: Member): string => member.title ?? DEFAULT_MEMBER_TITLE;

/**
 * Team members, alphabetical by slug. The order carries no rank and is never
 * shown: each card stands alone and no page lists the others.
 *
 * A member card shows the member's own contact where it is set and the
 * brand's where it is not. To give a member their own contacts, add the
 * optional fields to their entry, for example:
 *
 *   { slug: 'ana', name: 'Ana Perez', givenName: 'Ana', familyName: 'Perez',
 *     area: 'Marca', phone: '+53 5xxx xxxx', email: 'ana@example.com' },
 *
 * Only add data the person has agreed to publish: anyone with the link can
 * open the card and save the contact.
 */
export const members: Member[] = [
  {
    slug: 'fernando',
    name: 'Fernando Jose Bernal Suarez',
    givenName: 'Fernando Jose',
    familyName: 'Bernal Suarez',
    area: 'Desarrollo',
  },
  {
    slug: 'johny',
    name: 'Johny A. Pedraza Romero',
    givenName: 'Johny A.',
    familyName: 'Pedraza Romero',
    area: 'Desarrollo',
  },
  {
    slug: 'patricia',
    name: 'Patricia Mieres Dias',
    givenName: 'Patricia',
    familyName: 'Mieres Dias',
    area: 'Marca',
  },
  {
    slug: 'yanni',
    name: 'Yanni Alejandro Fernandez Quintana',
    givenName: 'Yanni Alejandro',
    familyName: 'Fernandez Quintana',
    area: 'Desarrollo',
  },
];

/** The headline as one sentence run, for titles, previews and share text. */
export const headlineText = (source: Pick<Profile, 'headline'>): string =>
  `${source.headline.lead} ${source.headline.payoff}`;
