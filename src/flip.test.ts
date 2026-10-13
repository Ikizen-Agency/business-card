import { describe, expect, it } from 'vitest';
import { flipTransform, toCssTransform } from './flip.ts';

describe('flipTransform', () => {
  const target = { left: 36, top: 150, width: 288, height: 288 };

  it('is the identity when source and target coincide', () => {
    expect(flipTransform(target, target)).toEqual({ translateX: 0, translateY: 0, scaleX: 1, scaleY: 1 });
  });

  it('moves and scales the target onto the source, from the top-left corner', () => {
    const source = { left: 238, top: 293, width: 72, height: 72 };
    const transform = flipTransform(source, target);

    expect(transform).toEqual({ translateX: 202, translateY: 143, scaleX: 0.25, scaleY: 0.25 });
    // Applying it to the target's corners lands on the source's corners.
    expect(target.left + transform.translateX).toBe(source.left);
    expect(target.top + transform.translateY).toBe(source.top);
    expect(target.width * transform.scaleX).toBe(source.width);
    expect(target.height * transform.scaleY).toBe(source.height);
  });

  it('handles a source that is larger or off to the top-left', () => {
    const transform = flipTransform({ left: 0, top: 0, width: 576, height: 144 }, target);
    expect(transform).toEqual({ translateX: -36, translateY: -150, scaleX: 2, scaleY: 0.5 });
  });

  it('falls back to no scaling when the target has no size yet', () => {
    const transform = flipTransform({ left: 10, top: 20, width: 50, height: 50 }, { left: 0, top: 0, width: 0, height: 0 });
    expect(transform).toEqual({ translateX: 10, translateY: 20, scaleX: 1, scaleY: 1 });
  });
});

describe('toCssTransform', () => {
  it('writes translate before scale, for a top-left transform origin', () => {
    expect(toCssTransform({ translateX: 202, translateY: 143.5, scaleX: 0.25, scaleY: 0.25 })).toBe(
      'translate(202px, 143.5px) scale(0.25, 0.25)',
    );
  });
});
