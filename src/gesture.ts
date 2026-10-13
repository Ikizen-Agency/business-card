/**
 * The decisions behind flipping the card by dragging it, as pure functions:
 * what a movement is, how far the card turns under the finger, and what
 * happens on release. No DOM, so every threshold is unit-tested.
 */

/** Movement below this many pixels is still a tap. */
const TAP_SLOP = 6;
/** Share of the card's width a drag must cover to complete the flip by itself. */
const FLIP_DISTANCE_RATIO = 0.33;
/** Speed, in pixels per millisecond, at which a short flick also flips. */
const FLICK_VELOCITY = 0.5;
/** A flick still has to travel this far, so a jittery tap never flips twice. */
const FLICK_MIN_DISTANCE = 16;

/**
 * What a pointer movement from its start point is so far: still a `tap`, a
 * sideways `drag` of the card, or a mostly vertical move left to the page (`scroll`).
 */
export function classifyMove(dx: number, dy: number): 'tap' | 'drag' | 'scroll' {
  if (Math.abs(dx) < TAP_SLOP && Math.abs(dy) < TAP_SLOP) return 'tap';
  return Math.abs(dx) > Math.abs(dy) ? 'drag' : 'scroll';
}

/** Angle of the face at rest: 0 for the front, half a turn for the back. */
export const restingAngle = (flipped: boolean): number => (flipped ? 180 : 0);

/**
 * Degrees the card turns for a drag of `dx` pixels: the full width of the card
 * is half a turn, in the direction of the drag, and never more.
 */
export function dragRotation(dx: number, cardWidth: number): number {
  if (cardWidth <= 0) return 0;
  return Math.max(-180, Math.min(180, (dx / cardWidth) * 180));
}

export interface Release {
  /** Movement since the pointer went down, in pixels. */
  dx: number;
  dy: number;
  /** Horizontal speed at release, in pixels per millisecond, signed like `dx`. */
  velocityX: number;
  cardWidth: number;
  /** Whether the back was showing when the drag began. */
  flipped: boolean;
}

export type ReleaseOutcome =
  /** Not a drag: the control's ordinary click does the flip. */
  | { kind: 'tap' }
  /** The card returns to the face it was showing. */
  | { kind: 'settle' }
  /** The card completes the turn towards `direction` and ends on `flipped`. */
  | { kind: 'flip'; direction: 1 | -1; flipped: boolean };

export function decideRelease({ dx, dy, velocityX, cardWidth, flipped }: Release): ReleaseOutcome {
  const move = classifyMove(dx, dy);
  if (move === 'tap') return { kind: 'tap' };
  if (move === 'scroll') return { kind: 'settle' };

  const direction = dx > 0 ? 1 : -1;
  const farEnough = Math.abs(dx) >= cardWidth * FLIP_DISTANCE_RATIO;
  // A flick counts only when it goes the way the card was being dragged.
  const flicked =
    Math.abs(dx) >= FLICK_MIN_DISTANCE && velocityX * direction >= FLICK_VELOCITY;

  return farEnough || flicked ? { kind: 'flip', direction, flipped: !flipped } : { kind: 'settle' };
}
