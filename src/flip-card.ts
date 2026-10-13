/**
 * Turning the card: by tap or keyboard (the flip control's click), by dragging
 * it sideways, and the one-time "peek" that shows it has another side.
 *
 * The card's resting state is the `is-flipped` class (see style.css). While a
 * drag or its release is in progress an inline transform takes over; it is
 * always removed again, so the card can only rest on a clean face.
 */

import { classifyMove, decideRelease, dragRotation, restingAngle } from './gesture.ts';

export interface FlipCardOptions {
  /** Element that holds the card and the control; pointer gestures are read here. */
  stage: HTMLElement;
  card: HTMLElement;
  /** The button under the card. Its click (tap, Enter, Space) flips. */
  control: HTMLButtonElement;
  front: HTMLElement;
  back: HTMLElement;
  /** Called after the showing face changed. */
  onChange: (flipped: boolean) => void;
}

export interface FlipCard {
  readonly flipped: boolean;
  /** Tilts the card a little and back, once, unless the visitor is already interacting. */
  peek: () => void;
  /** Ends any motion at once, leaving the card flat on its current face. */
  settle: () => void;
}

/** How long the release may take before it is finished by force. */
const RELEASE_TIMEOUT_MS = 900;
/** Samples older than this do not count towards the release speed. */
const VELOCITY_WINDOW_MS = 100;
const PEEK_ANGLE = 14;
const PEEK_MS = 1100;

export function createFlipCard(options: FlipCardOptions): FlipCard {
  const { stage, card, control, front, back, onChange } = options;
  let flipped = false;

  const reducedMotion = (): boolean =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyFace(next: boolean, notify: boolean): void {
    flipped = next;
    card.classList.toggle('is-flipped', flipped);
    // The hidden face must not be reachable by keyboard or assistive tech.
    front.inert = flipped;
    back.inert = !flipped;
    control.setAttribute('aria-pressed', String(flipped));
    if (notify) onChange(flipped);
  }

  // --- Peek ----------------------------------------------------------------

  let peekAnimation: Animation | undefined;
  let interacted = false;

  function stopPeek(): void {
    peekAnimation?.cancel();
    peekAnimation = undefined;
  }

  function peek(): void {
    if (interacted || flipped || peekAnimation || reducedMotion()) return;
    peekAnimation = card.animate(
      [
        { transform: 'rotateY(0deg)' },
        { transform: `rotateY(${PEEK_ANGLE}deg)`, offset: 0.45 },
        { transform: 'rotateY(0deg)' },
      ],
      { duration: PEEK_MS, easing: 'ease-in-out' },
    );
    peekAnimation.addEventListener('finish', () => (peekAnimation = undefined));
  }

  // --- Release animation ---------------------------------------------------

  /** Runs when the release in progress ends; calling it early finishes it at once. */
  let finishRelease: (() => void) | undefined;

  /** Turns the card to `angle` with the CSS transition, then hands over to the class. */
  function releaseTo(angle: number, next: boolean): void {
    let timer = 0;
    const done = (): void => {
      window.clearTimeout(timer);
      card.removeEventListener('transitionend', onEnd);
      finishRelease = undefined;
      // Swap the inline angle for the resting class without animating the swap:
      // they show the same face, half a turn or a whole turn apart.
      card.classList.add('is-dragging');
      if (next !== flipped) applyFace(next, true);
      card.style.transform = '';
      void card.offsetWidth; // apply before transitions come back
      card.classList.remove('is-dragging');
    };
    const onEnd = (event: TransitionEvent): void => {
      if (event.target === card && event.propertyName === 'transform') done();
    };
    finishRelease = done;

    if (reducedMotion()) return done();
    card.classList.remove('is-dragging'); // transitions back on
    card.addEventListener('transitionend', onEnd);
    timer = window.setTimeout(done, RELEASE_TIMEOUT_MS);
    card.style.transform = `rotateY(${angle}deg)`;
  }

  function settle(): void {
    stopPeek();
    drag = undefined;
    finishRelease?.();
    // A flip started by tap is a CSS transition: jump to its end.
    for (const animation of card.getAnimations()) animation.finish();
    card.classList.remove('is-dragging');
    card.style.transform = '';
  }

  // --- Drag ----------------------------------------------------------------

  interface Drag {
    pointerId: number;
    startX: number;
    startY: number;
    mode: 'pending' | 'drag' | 'scroll';
    samples: Array<{ time: number; x: number }>;
  }
  let drag: Drag | undefined;
  /** Set after a drag so the click that follows the release does nothing. */
  let suppressClick = false;

  function endDrag(event: PointerEvent, cancelled: boolean): void {
    const current = drag;
    if (!current || event.pointerId !== current.pointerId) return;
    drag = undefined;
    if (stage.hasPointerCapture(current.pointerId)) stage.releasePointerCapture(current.pointerId);
    if (current.mode === 'pending') return; // a tap: the click flips

    // Anything that moved is not a tap, wherever the pointer ends up.
    suppressClick = true;
    window.setTimeout(() => (suppressClick = false), 400);
    if (current.mode === 'scroll') return;

    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    const recent = current.samples.filter((sample) => event.timeStamp - sample.time <= VELOCITY_WINDOW_MS);
    const first = recent[0];
    const elapsed = first ? event.timeStamp - first.time : 0;
    const velocityX = first && elapsed > 0 ? (event.clientX - first.x) / elapsed : 0;

    const outcome = cancelled
      ? ({ kind: 'settle' } as const)
      : decideRelease({ dx, dy, velocityX, cardWidth: stage.offsetWidth, flipped });
    if (outcome.kind === 'flip') {
      releaseTo(restingAngle(flipped) + outcome.direction * 180, outcome.flipped);
    } else {
      releaseTo(restingAngle(flipped), flipped);
    }
  }

  stage.addEventListener('pointerdown', (event) => {
    interacted = true;
    stopPeek();
    suppressClick = false;
    if (drag) {
      // A second finger: this is not a drag of the card any more.
      const first = drag;
      drag = undefined;
      if (first.mode === 'drag') releaseTo(restingAngle(flipped), flipped);
      return;
    }
    if (!event.isPrimary || event.button !== 0) return;
    finishRelease?.();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      mode: 'pending',
      samples: [{ time: event.timeStamp, x: event.clientX }],
    };
  });

  stage.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    drag.samples.push({ time: event.timeStamp, x: event.clientX });
    if (drag.samples.length > 12) drag.samples.shift();

    if (drag.mode === 'pending') {
      const move = classifyMove(dx, dy);
      if (move === 'tap') return;
      drag.mode = move;
      if (move === 'drag') {
        // Keep receiving the pointer when it leaves the card or the window.
        stage.setPointerCapture(drag.pointerId);
        card.classList.add('is-dragging');
      }
    }
    // With reduced motion the card does not follow the finger; the release still counts.
    if (drag.mode === 'drag' && !reducedMotion()) {
      card.style.transform = `rotateY(${restingAngle(flipped) + dragRotation(dx, stage.offsetWidth)}deg)`;
    }
  });

  stage.addEventListener('pointerup', (event) => endDrag(event, false));
  stage.addEventListener('pointercancel', (event) => endDrag(event, true));

  // Capture phase: runs before the control's and the links' own click handlers.
  stage.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  control.addEventListener('click', () => {
    interacted = true;
    stopPeek();
    finishRelease?.();
    applyFace(!flipped, true);
  });
  // Tabbing to the card is interaction too: no peek under a keyboard user.
  control.addEventListener('focus', () => {
    interacted = true;
    stopPeek();
  });

  applyFace(false, false);
  return {
    get flipped() {
      return flipped;
    },
    peek,
    settle,
  };
}
