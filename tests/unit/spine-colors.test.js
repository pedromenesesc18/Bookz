import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createSpineColorizer, COLOR_CACHE_PREF } from '../../src/ui/spine-colors.js';

const prefs = (initial = {}) => {
  const data = { ...initial };
  return { data, loadPref: (k, f) => data[k] ?? f, savePref: (k, v) => (data[k] = v) };
};

const URL_A = 'https://covers.openlibrary.org/b/id/1-M.jpg';
const URL_GOOGLE = 'https://books.google.com/books/content?id=x';

beforeEach(() => {
  document.body.innerHTML = `<div id="root">
    <button class="spine" data-spine-cover="${URL_A}"></button>
    <button class="spine" data-spine-cover="${URL_A}"></button>
    <button class="spine"></button></div>`;
});

describe('createSpineColorizer', () => {
  test('colors spines from their cover once and caches the result', async () => {
    const readPixels = vi.fn(async () => new Uint8ClampedArray([40, 60, 90, 255]));
    const storage = prefs();
    const colorizer = createSpineColorizer({ storage, readPixels });
    await colorizer.apply(document.getElementById('root'));
    const spines = document.querySelectorAll('[data-spine-cover]');
    spines.forEach((s) => expect(s.style.getPropertyValue('--spine')).toMatch(/^#[0-9a-f]{6}$/));
    expect(readPixels).toHaveBeenCalledOnce();
    expect(Object.keys(JSON.parse(storage.data[COLOR_CACHE_PREF]))).toEqual([URL_A]);
  });

  test('uses the saved cache without loading images', async () => {
    const readPixels = vi.fn();
    const storage = prefs({ [COLOR_CACHE_PREF]: JSON.stringify({ [URL_A]: '#112233' }) });
    await createSpineColorizer({ storage, readPixels }).apply(document.getElementById('root'));
    expect(readPixels).not.toHaveBeenCalled();
    expect(document.querySelector('[data-spine-cover]').style.getPropertyValue('--spine')).toBe(
      '#112233',
    );
  });

  test('keeps the fallback color when the image cannot be read', async () => {
    const readPixels = vi.fn(async () => {
      throw new Error('tainted canvas');
    });
    const storage = prefs({ [COLOR_CACHE_PREF]: '{bad json' });
    await createSpineColorizer({ storage, readPixels }).apply(document.getElementById('root'));
    expect(document.querySelector('[data-spine-cover]').style.getPropertyValue('--spine')).toBe('');
    expect(readPixels).toHaveBeenCalledOnce();
  });

  test('keeps the cloth color for gray covers', async () => {
    const readPixels = vi.fn(async () => new Uint8ClampedArray([120, 120, 120, 255]));
    await createSpineColorizer({ storage: prefs(), readPixels }).apply(
      document.getElementById('root'),
    );
    expect(document.querySelector('[data-spine-cover]').style.getPropertyValue('--spine')).toBe('');
  });

  test('ignores fully transparent images', async () => {
    const readPixels = vi.fn(async () => new Uint8ClampedArray([0, 0, 0, 0]));
    await createSpineColorizer({ storage: prefs(), readPixels }).apply(
      document.getElementById('root'),
    );
    expect(document.querySelector('[data-spine-cover]').style.getPropertyValue('--spine')).toBe('');
  });
});

describe('createSpineColorizer limits', () => {
  test('never downloads covers from hosts that block color reading', async () => {
    document.body.innerHTML = `<div id="root"><button data-spine-cover="${URL_GOOGLE}"></button></div>`;
    const readPixels = vi.fn();
    await createSpineColorizer({ storage: prefs(), readPixels }).apply(
      document.getElementById('root'),
    );
    expect(readPixels).not.toHaveBeenCalled();
  });

  test('writes the cache once per batch and reads at most 3 covers at a time', async () => {
    const urls = Array.from(
      { length: 6 },
      (_, i) => `https://covers.openlibrary.org/b/id/${i}-M.jpg`,
    );
    document.body.innerHTML = `<div id="root">${urls.map((u) => `<button data-spine-cover="${u}"></button>`).join('')}</div>`;
    let active = 0;
    let peak = 0;
    const readPixels = vi.fn(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return new Uint8ClampedArray([200, 40, 40, 255]);
    });
    const storage = prefs();
    const savePref = vi.spyOn(storage, 'savePref');
    await createSpineColorizer({ storage, readPixels }).apply(document.getElementById('root'));
    await new Promise((r) => setTimeout(r, 0));
    expect(peak).toBeLessThanOrEqual(3);
    expect(readPixels).toHaveBeenCalledTimes(6);
    expect(savePref.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
