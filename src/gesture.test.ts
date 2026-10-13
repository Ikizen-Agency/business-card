import { describe, expect, it } from 'vitest';
import { classifyMove, decideRelease, dragRotation, restingAngle } from './gesture.ts';

const CARD = 331; // card width on a 360px phone

describe('classifyMove', () => {
  it('treats a few pixels of movement as still a tap', () => {
    expect(classifyMove(0, 0)).toBe('tap');
    expect(classifyMove(4, -3)).toBe('tap');
  });

  it('locks to a sideways drag when the movement is mostly horizontal', () => {
    expect(classifyMove(12, 3)).toBe('drag');
    expect(classifyMove(-30, 20)).toBe('drag');
  });

  it('leaves mostly vertical movement to the page', () => {
    expect(classifyMove(3, 14)).toBe('scroll');
    expect(classifyMove(20, -30)).toBe('scroll');
  });
});

describe('dragRotation', () => {
  it('turns the card in proportion to the drag, following its direction', () => {
    expect(dragRotation(0, CARD)).toBe(0);
    expect(dragRotation(CARD / 2, CARD)).toBeCloseTo(90);
    expect(dragRotation(-CARD / 4, CARD)).toBeCloseTo(-45);
  });

  it('never turns past half a turn', () => {
    expect(dragRotation(CARD * 3, CARD)).toBe(180);
    expect(dragRotation(-CARD * 3, CARD)).toBe(-180);
  });
});

describe('decideRelease', () => {
  const release = (dx: number, velocityX = 0, flipped = false, dy = 0) =>
    decideRelease({ dx, dy, velocityX, cardWidth: CARD, flipped });

  it('is a tap when the pointer barely moved', () => {
    expect(release(2)).toEqual({ kind: 'tap' });
    expect(release(-3, 0, true, 4)).toEqual({ kind: 'tap' });
  });

  it('settles back after a short, slow drag', () => {
    expect(release(40)).toEqual({ kind: 'settle' });
    expect(release(-60, -0.1, true)).toEqual({ kind: 'settle' });
  });

  it('flips after a long drag, in the direction of the drag, from either face', () => {
    expect(release(140)).toEqual({ kind: 'flip', direction: 1, flipped: true });
    expect(release(-140)).toEqual({ kind: 'flip', direction: -1, flipped: true });
    expect(release(140, 0, true)).toEqual({ kind: 'flip', direction: 1, flipped: false });
    expect(release(-140, 0, true)).toEqual({ kind: 'flip', direction: -1, flipped: false });
  });

  it('flips after a short but fast flick', () => {
    expect(release(30, 0.8)).toEqual({ kind: 'flip', direction: 1, flipped: true });
    expect(release(-30, -0.8, true)).toEqual({ kind: 'flip', direction: -1, flipped: false });
  });

  it('does not flip on a flick that goes against the drag', () => {
    // Dragged right, then thrown back left: the card returns.
    expect(release(40, -0.9)).toEqual({ kind: 'settle' });
  });

  it('ignores speed when the pointer hardly travelled', () => {
    expect(release(8, 2)).toEqual({ kind: 'settle' });
  });

  it('never flips on a mostly vertical gesture, however long or fast', () => {
    expect(release(40, 1.2, false, 160)).toEqual({ kind: 'settle' });
    expect(release(-150, -1, true, 300)).toEqual({ kind: 'settle' });
  });

  it('scales the distance threshold with the card', () => {
    expect(decideRelease({ dx: 140, dy: 0, velocityX: 0, cardWidth: 576, flipped: false })).toEqual({ kind: 'settle' });
    expect(decideRelease({ dx: 200, dy: 0, velocityX: 0, cardWidth: 576, flipped: false })).toMatchObject({ kind: 'flip' });
  });
});

describe('restingAngle', () => {
  it('is 0 for the front and half a turn for the back', () => {
    expect(restingAngle(false)).toBe(0);
    expect(restingAngle(true)).toBe(180);
  });
});
