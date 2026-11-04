import { describe, expect, test } from 'vitest';
import {
  SPINE_PALETTE,
  fallbackSpineColor,
  spineSize,
  averageColor,
  toSpineColor,
  shelfOrder,
  SPINE,
} from '../../src/domain/spine.js';
import { makeBook } from './fixtures.js';

describe('fallbackSpineColor', () => {
  test('is deterministic and comes from the palette', () => {
    const color = fallbackSpineColor('Dom Casmurro');
    expect(fallbackSpineColor('Dom Casmurro')).toBe(color);
    expect(SPINE_PALETTE).toContain(color);
  });
  test('spreads different titles across the palette', () => {
    const titles = ['A', 'B', 'Duna', 'O Hobbit', 'Torto Arado', 'Cem Anos', 'Ulisses', 'Emma'];
    expect(new Set(titles.map(fallbackSpineColor)).size).toBeGreaterThan(3);
  });
});

describe('spineSize', () => {
  test('uses a medium size when pages are unknown', () => {
    expect(spineSize(0)).toEqual({ height: SPINE.defaultHeight, width: SPINE.defaultWidth });
  });
  test('grows with pages within limits', () => {
    const thin = spineSize(90);
    const thick = spineSize(900);
    expect(thick.height).toBeGreaterThan(thin.height);
    expect(thick.width).toBeGreaterThan(thin.width);
    expect(spineSize(99999)).toEqual({ height: SPINE.maxHeight, width: SPINE.maxWidth });
    expect(spineSize(1)).toEqual({ height: SPINE.minHeight, width: SPINE.minWidth });
  });
});

describe('averageColor', () => {
  test('averages opaque pixels and skips transparent ones', () => {
    const data = new Uint8ClampedArray([200, 0, 0, 255, 0, 0, 200, 255, 9, 9, 9, 0]);
    expect(averageColor(data)).toEqual({ r: 100, g: 0, b: 100 });
  });
  test('gives colorful pixels more weight than gray ones', () => {
    const data = new Uint8ClampedArray([200, 0, 0, 255, 128, 128, 128, 255]);
    const { r, g } = averageColor(data);
    expect(r - g).toBeGreaterThan(120);
  });
  test('returns null when nothing is opaque', () => {
    expect(averageColor(new Uint8ClampedArray([1, 2, 3, 0]))).toBeNull();
  });
});

const toHsl = (hex) => {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { s, l, r, b };
};

describe('toSpineColor', () => {
  test('returns null for gray covers so the cloth palette is used', () => {
    expect(toSpineColor({ r: 120, g: 122, b: 125 })).toBeNull();
  });
  test('makes light colors dark enough for light text, keeping the hue', () => {
    const c = toHsl(toSpineColor({ r: 250, g: 230, b: 180 }));
    expect(c.l).toBeLessThanOrEqual(0.4);
    expect(c.r).toBeGreaterThan(c.b);
  });
  test('boosts muddy colors so spines look like cloth, not mud', () => {
    const c = toHsl(toSpineColor({ r: 120, g: 100, b: 80 }));
    expect(c.s).toBeGreaterThanOrEqual(0.3);
  });
  test('returns a hex color', () => {
    expect(toSpineColor({ r: 40, g: 60, b: 90 })).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('shelfOrder', () => {
  test('oldest finished first (left to right), undated last', () => {
    const books = [
      makeBook({ title: 'C', finishedAt: '2024-05-01' }),
      makeBook({ title: 'Z' }),
      makeBook({ title: 'A', finishedAt: '2024-01-01' }),
    ];
    expect(shelfOrder(books).map((b) => b.title)).toEqual(['A', 'C', 'Z']);
  });
});
