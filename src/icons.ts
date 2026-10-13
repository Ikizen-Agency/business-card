/**
 * Hand-drawn icons on a 24x24 grid, printed next to the contact lines of the
 * card (see card-faces.ts). Paths are stroked by default; `fill: true` marks
 * solid shapes (brand glyphs).
 */

export interface IconPath {
  d: string;
  fill?: boolean;
}

export const ICONS = {
  whatsapp: [
    { d: 'M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z' },
    {
      d: 'M9.6 7.9c-.4 0-1.3.6-1.3 1.9 0 2.8 3.1 5.9 5.9 5.9 1.3 0 1.9-.9 1.9-1.3 0-.3-.1-.5-.4-.6l-1.5-.8c-.3-.1-.6-.1-.8.2l-.5.6c-.2.2-.4.2-.6.1-1-.5-1.7-1.2-2.2-2.2-.1-.2-.1-.4.1-.6l.6-.5c.3-.2.3-.5.2-.8l-.8-1.5c-.1-.3-.3-.4-.6-.4z',
      fill: true,
    },
  ],
  mail: [
    { d: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z' },
    { d: 'M3.5 7.5l8.5 6 8.5-6' },
  ],
  globe: [
    { d: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z' },
    { d: 'M3 12h18' },
    { d: 'M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z' },
  ],
} satisfies Record<string, IconPath[]>;

export type IconName = keyof typeof ICONS;
