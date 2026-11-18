import { CropRegion } from './api.models';

/** Smallest crop edge, as a fraction of the image, so a region can't collapse to nothing. */
const MIN_EDGE = 0.05;

/** A width ÷ height range; either bound may be open. */
export interface AspectRange {
  min: number;
  max: number;
}

/**
 * The range every one of `ranges` accepts (issue #39): a crop inside it satisfies all of them at
 * once. Null when they don't overlap, so no single crop can.
 */
export function intersectRanges(ranges: AspectRange[]): AspectRange | null {
  const min = Math.max(0, ...ranges.map((r) => r.min));
  const max = Math.min(Number.POSITIVE_INFINITY, ...ranges.map((r) => r.max));
  return min <= max ? { min, max } : null;
}

/** Pixel aspect ratio of a normalised region on a `w` × `h` image. */
function ratioOf(r: CropRegion, w: number, h: number): number {
  return (r.width * w) / (r.height * h);
}

/** The largest region, centred, whose aspect ratio is inside `range`. */
export function initialCrop(w: number, h: number, range: AspectRange): CropRegion {
  const ratio = w / h;
  if (ratio < range.min) {
    const height = w / range.min / h;
    return { x: 0, y: (1 - height) / 2, width: 1, height };
  }
  if (ratio > range.max) {
    const width = (h * range.max) / w;
    return { x: (1 - width) / 2, y: 0, width, height: 1 };
  }
  return { x: 0, y: 0, width: 1, height: 1 };
}

/**
 * Brings a proposed region (from a drag) back inside the image and the aspect range, keeping its
 * top-left corner fixed where possible: a too-narrow region gets wider (or shorter when that would
 * leave the image), a too-wide one gets taller (or narrower).
 */
export function constrainCrop(r: CropRegion, w: number, h: number, range: AspectRange): CropRegion {
  let x = clamp(r.x, 0, 1 - MIN_EDGE);
  let y = clamp(r.y, 0, 1 - MIN_EDGE);
  let width = clamp(r.width, MIN_EDGE, 1 - x);
  let height = clamp(r.height, MIN_EDGE, 1 - y);

  const ratio = ratioOf({ x, y, width, height }, w, h);
  if (ratio < range.min) {
    width = (range.min * height * h) / w;
    if (width > 1 - x) {
      width = 1 - x;
      height = (width * w) / (range.min * h);
    }
  } else if (ratio > range.max) {
    height = (width * w) / (range.max * h);
    if (height > 1 - y) {
      height = 1 - y;
      width = (range.max * height * h) / w;
    }
  }
  x = clamp(x, 0, 1 - width);
  y = clamp(y, 0, 1 - height);
  return { x, y, width, height };
}

/** Shifts a region by (dx, dy), stopping at the image edges without changing its size. */
export function moveCrop(r: CropRegion, dx: number, dy: number): CropRegion {
  return {
    ...r,
    x: clamp(r.x + dx, 0, 1 - r.width),
    y: clamp(r.y + dy, 0, 1 - r.height),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
