import { averageColor, toSpineColor } from '../domain/spine.js';

export const COLOR_CACHE_PREF = 'spineColors';
const MAX_CACHED = 500;
const SAMPLE_SIZE = 12;
const MAX_PARALLEL = 3;
// Only hosts that send CORS headers can be sampled; others always fail.
const SAMPLE_HOSTS = new Set(['covers.openlibrary.org']);

const canSample = (url) => {
  try {
    return SAMPLE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
};

/** Runs async jobs with at most `limit` in flight. */
const createLimiter = (limit) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active += 1;
    const { job, resolve } = queue.shift();
    job()
      .then(resolve)
      .finally(() => {
        active -= 1;
        next();
      });
  };
  return (job) =>
    new Promise((resolve) => {
      queue.push({ job, resolve });
      next();
    });
};

/**
 * Reads a cover's pixels through a tiny canvas. Only works for hosts that send
 * CORS headers (Open Library does, Google Books doesn't) — callers handle the error.
 */
export const readPixelsFromUrl = (url, doc = document) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = Object.assign(doc.createElement('canvas'), {
          width: SAMPLE_SIZE,
          height: SAMPLE_SIZE,
        });
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        resolve(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('cover not readable'));
    img.src = url;
  });

const loadCache = (storage) => {
  try {
    const parsed = JSON.parse(storage.loadPref(COLOR_CACHE_PREF, '{}'));
    return new Map(parsed && typeof parsed === 'object' ? Object.entries(parsed) : []);
  } catch {
    return new Map();
  }
};

/** Gives spines the dominant color of their cover, remembering results across launches. */
export const createSpineColorizer = ({ storage, readPixels = readPixelsFromUrl }) => {
  const cache = loadCache(storage);
  const pending = new Map();
  const limit = createLimiter(MAX_PARALLEL);
  let dirty = false;

  const save = () => {
    if (!dirty) return;
    dirty = false;
    const recent = [...cache].slice(-MAX_CACHED);
    storage.savePref(COLOR_CACHE_PREF, JSON.stringify(Object.fromEntries(recent)));
  };

  const sample = async (url) => {
    const avg = averageColor(await readPixels(url));
    const color = avg ? toSpineColor(avg) : null;
    if (color) {
      cache.set(url, color);
      dirty = true;
    }
    return color;
  };

  const colorFor = (url) => {
    if (cache.has(url)) return Promise.resolve(cache.get(url));
    if (!canSample(url)) return Promise.resolve(null);
    if (!pending.has(url))
      pending.set(
        url,
        limit(() => sample(url).catch(() => null)),
      );
    return pending.get(url);
  };

  /** Colors every spine in `root`; the cache is written once, at the end. */
  const apply = async (root) => {
    await Promise.all(
      [...root.querySelectorAll('[data-spine-cover]')].map(async (spine) => {
        const color = await colorFor(spine.dataset.spineCover);
        if (color) spine.style.setProperty('--spine', color);
      }),
    );
    save();
  };

  return { apply };
};
