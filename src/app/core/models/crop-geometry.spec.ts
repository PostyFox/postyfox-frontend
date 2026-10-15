import { constrainCrop, initialCrop, intersectRanges, moveCrop } from './crop-geometry';

const IG = { min: 0.8, max: 1.91 };
const ratio = (r: { width: number; height: number }, w: number, h: number) =>
  (r.width * w) / (r.height * h);

describe('crop geometry', () => {
  it('intersects ranges, and reports none when they do not overlap', () => {
    expect(intersectRanges([IG, { min: 0.5, max: 1.5 }])).toEqual({ min: 0.8, max: 1.5 });
    expect(intersectRanges([])).toEqual({ min: 0, max: Number.POSITIVE_INFINITY });
    expect(
      intersectRanges([
        { min: 2, max: 3 },
        { min: 0, max: 1 },
      ]),
    ).toBeNull();
  });

  it('starts with the largest centred region inside the range', () => {
    expect(initialCrop(400, 1000, IG)).toEqual({ x: 0, y: 0.25, width: 1, height: 0.5 });
    const wide = initialCrop(4000, 1000, IG);
    expect(wide.height).toBe(1);
    expect(ratio(wide, 4000, 1000)).toBeCloseTo(1.91);
    expect(wide.x).toBeCloseTo((1 - wide.width) / 2);
    expect(initialCrop(1000, 1000, IG)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('widens a region that is too narrow, keeping its corner', () => {
    const r = constrainCrop({ x: 0, y: 0, width: 0.2, height: 0.5 }, 1000, 1000, IG);
    expect(r.x).toBe(0);
    expect(ratio(r, 1000, 1000)).toBeCloseTo(0.8);
  });

  it('shortens instead when widening would leave the image', () => {
    const r = constrainCrop({ x: 0.5, y: 0, width: 0.5, height: 1 }, 1000, 1000, IG);
    expect(r.x + r.width).toBeLessThanOrEqual(1);
    expect(ratio(r, 1000, 1000)).toBeCloseTo(0.8);
  });

  it('heightens a region that is too wide', () => {
    const r = constrainCrop({ x: 0, y: 0, width: 1, height: 0.2 }, 1000, 1000, IG);
    expect(ratio(r, 1000, 1000)).toBeCloseTo(1.91);
  });

  it('keeps a region inside the image', () => {
    const r = constrainCrop({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 }, 1000, 1000, IG);
    expect(r.x + r.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.y + r.height).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('moves a region without resizing it, stopping at the edges', () => {
    const r = moveCrop({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 }, 0.9, -0.9);
    expect(r).toEqual({ x: 0.5, y: 0, width: 0.5, height: 0.5 });
  });
});
