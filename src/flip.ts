/**
 * Geometry of a shared-element (FLIP) transition: the transform that makes an
 * element laid out at `target` appear to sit at `source`. Animating from that
 * transform to none moves and grows it without touching layout. Pure.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlipTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

/** Assumes `transform-origin: 0 0` on the element. */
export function flipTransform(source: Box, target: Box): FlipTransform {
  return {
    translateX: source.left - target.left,
    translateY: source.top - target.top,
    // An element with no size yet cannot be scaled onto anything.
    scaleX: target.width > 0 ? source.width / target.width : 1,
    scaleY: target.height > 0 ? source.height / target.height : 1,
  };
}

export function toCssTransform(transform: FlipTransform): string {
  const { translateX, translateY, scaleX, scaleY } = transform;
  return `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
}
