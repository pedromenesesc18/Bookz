/** Book-cloth colors, dark enough for light text on the spine. */
export const SPINE_PALETTE = Object.freeze([
  '#7a2e2a',
  '#3b4a6b',
  '#2f5d50',
  '#6b4a2b',
  '#5a3a6e',
  '#8a5a1f',
  '#2d4f6e',
  '#6e2f4a',
  '#4a5d2f',
  '#43403c',
]);

export const SPINE = Object.freeze({
  minHeight: 76,
  maxHeight: 116,
  defaultHeight: 94,
  minWidth: 18,
  maxWidth: 34,
  defaultWidth: 24,
  thinPages: 100,
  thickPages: 800,
});

const MIN_ALPHA = 128;
// Cloth look: never gray, never light (the spine text is light).
const GRAY_SATURATION = 0.12;
const MIN_SATURATION = 0.35;
const MAX_SATURATION = 0.6;
const MIN_LIGHTNESS = 0.2;
const MAX_LIGHTNESS = 0.36;

const hashString = (text) =>
  [...String(text)].reduce((hash, char) => (hash * 31 + char.codePointAt(0)) >>> 0, 7);

/** Same title → same color, so a book keeps its look without a cover. */
export const fallbackSpineColor = (title) =>
  SPINE_PALETTE[hashString(title) % SPINE_PALETTE.length];

const lerp = (from, to, t) => Math.round(from + (to - from) * t);

/** Taller and thicker spines for longer books. */
export const spineSize = (pages) => {
  if (!pages) return { height: SPINE.defaultHeight, width: SPINE.defaultWidth };
  const t = Math.min(
    1,
    Math.max(0, (pages - SPINE.thinPages) / (SPINE.thickPages - SPINE.thinPages)),
  );
  return {
    height: lerp(SPINE.minHeight, SPINE.maxHeight, t),
    width: lerp(SPINE.minWidth, SPINE.maxWidth, t),
  };
};

const toHsl = ({ r, g, b }) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};

const fromHsl = ({ h, s, l }) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h / 60) % 6];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * Average RGB of opaque pixels in canvas ImageData, weighted toward colorful
 * pixels so a cover's accent color wins over its gray/white areas. Null if none.
 */
export const averageColor = (data) => {
  const sum = { r: 0, g: 0, b: 0, w: 0 };
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < MIN_ALPHA) continue;
    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const weight = 0.05 + toHsl(pixel).s;
    sum.r += pixel.r * weight;
    sum.g += pixel.g * weight;
    sum.b += pixel.b * weight;
    sum.w += weight;
  }
  if (!sum.w) return null;
  return {
    r: Math.round(sum.r / sum.w),
    g: Math.round(sum.g / sum.w),
    b: Math.round(sum.b / sum.w),
  };
};

const hex = (n) => n.toString(16).padStart(2, '0');

/**
 * Turns a cover color into a book-cloth spine color: same hue, rich but dark.
 * Gray covers return null so the title-based palette color is kept.
 */
export const toSpineColor = (rgb) => {
  const { h, s, l } = toHsl(rgb);
  if (s < GRAY_SATURATION) return null;
  const cloth = {
    h,
    s: clamp(s, MIN_SATURATION, MAX_SATURATION),
    l: clamp(l, MIN_LIGHTNESS, MAX_LIGHTNESS),
  };
  return `#${fromHsl(cloth).map(hex).join('')}`;
};

/** Left to right in the order they were finished; undated books at the end. */
export const shelfOrder = (books) =>
  [...books].sort(
    (a, b) =>
      (a.finishedAt || '9999').localeCompare(b.finishedAt || '9999') ||
      a.title.localeCompare(b.title),
  );
