import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./style.css', import.meta.url), 'utf8');

describe('viewport units', () => {
  it('only uses dvh behind a support check, so older browsers keep a sized card', () => {
    const guarded = /@supports \(height: 1dvh\) \{\s*:root \{\s*--viewport-height: 100dvh;\s*\}\s*\}/;

    expect(css).toMatch(guarded);
    expect(css).toContain('--viewport-height: 100vh;');
    expect(css.replace(guarded, '')).not.toContain('dvh');
  });

  it('gives the card a height without aspect-ratio support', () => {
    expect(css).toMatch(/@supports not \(aspect-ratio: 1\) \{\s*\.card \{\s*padding-bottom: 64\.7059%;/);
  });
});
