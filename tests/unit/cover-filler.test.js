import { describe, expect, test, vi } from 'vitest';
import { createStore } from '../../src/state/store.js';
import { createCoverFiller, TRIED_PREF } from '../../src/state/cover-filler.js';
import { makeBook } from './fixtures.js';

const prefs = (initial = {}) => {
  const data = { ...initial };
  return {
    data,
    loadPref: (k, fallback) => data[k] ?? fallback,
    savePref: (k, v) => {
      data[k] = v;
    },
  };
};

const setup = ({ books, findCover, storage = prefs(), online = true }) => {
  const store = createStore({ books });
  const setCover = vi.fn((id, cover) =>
    store.update((s) => ({ books: s.books.map((b) => (b.id === id ? { ...b, cover } : b)) })),
  );
  const filler = createCoverFiller({
    store,
    storage,
    findCover,
    setCover,
    gapMs: 0,
    isOnline: () => online,
  });
  return { store, setCover, filler, storage };
};

describe('createCoverFiller', () => {
  test('fills missing covers one at a time and remembers tried books', async () => {
    const findCover = vi.fn(async (b) => ({
      cover: b.id === 'a' ? 'https://x/a.jpg' : '',
      failed: false,
    }));
    const { setCover, filler, storage } = setup({
      books: [
        makeBook({ id: 'a' }),
        makeBook({ id: 'b' }),
        makeBook({ id: 'c', cover: 'https://x/c.jpg' }),
      ],
      findCover,
    });
    await filler.run();
    expect(findCover).toHaveBeenCalledTimes(2);
    expect(setCover).toHaveBeenCalledOnce();
    expect(setCover).toHaveBeenCalledWith('a', 'https://x/a.jpg');
    expect(JSON.parse(storage.data[TRIED_PREF])).toEqual(['a', 'b']);
  });

  test('does not retry books already tried', async () => {
    const findCover = vi.fn(async () => ({ cover: '', failed: false }));
    const { filler } = setup({
      books: [makeBook({ id: 'a' })],
      findCover,
      storage: prefs({ [TRIED_PREF]: '["a"]' }),
    });
    await filler.run();
    expect(findCover).not.toHaveBeenCalled();
  });

  test('network failures are retried later (not marked as tried)', async () => {
    const findCover = vi.fn(async () => ({ cover: '', failed: true }));
    const { filler, storage } = setup({ books: [makeBook({ id: 'a' })], findCover });
    await filler.run();
    expect(storage.data[TRIED_PREF]).toBeUndefined();
  });

  test('stops after the first network failure in a run', async () => {
    const findCover = vi.fn(async () => ({ cover: '', failed: true }));
    const { filler } = setup({ books: [makeBook({ id: 'a' }), makeBook({ id: 'b' })], findCover });
    await filler.run();
    expect(findCover).toHaveBeenCalledOnce();
  });

  test('does nothing offline', async () => {
    const findCover = vi.fn();
    const { filler } = setup({ books: [makeBook({ id: 'a' })], findCover, online: false });
    await filler.run();
    expect(findCover).not.toHaveBeenCalled();
  });

  test('start() picks up books added later, without overlapping runs', async () => {
    const findCover = vi.fn(async () => ({ cover: 'https://x/n.jpg', failed: false }));
    const { store, setCover, filler } = setup({ books: [], findCover });
    filler.start();
    store.update({ books: [makeBook({ id: 'n' })] });
    await vi.waitFor(() => expect(setCover).toHaveBeenCalledWith('n', 'https://x/n.jpg'));
    expect(findCover).toHaveBeenCalledOnce();
  });

  test('markTried keeps a removed cover from coming back', async () => {
    const findCover = vi.fn();
    const { filler } = setup({ books: [makeBook({ id: 'a' })], findCover });
    filler.markTried('a');
    await filler.run();
    expect(findCover).not.toHaveBeenCalled();
  });

  test('ignores a corrupted tried list', async () => {
    const findCover = vi.fn(async () => ({ cover: '', failed: false }));
    const { filler } = setup({
      books: [makeBook({ id: 'a' })],
      findCover,
      storage: prefs({ [TRIED_PREF]: '{oops' }),
    });
    await filler.run();
    expect(findCover).toHaveBeenCalledOnce();
  });
});

describe('createCoverFiller edge cases', () => {
  test('a book marked by hand during the lookup is not filled', async () => {
    let release;
    const findCover = vi.fn(
      () =>
        new Promise(
          (resolve) => (release = () => resolve({ cover: 'https://x/a.jpg', failed: false })),
        ),
    );
    const { filler, setCover } = setup({ books: [makeBook({ id: 'a' })], findCover });
    const running = filler.run();
    await vi.waitFor(() => expect(findCover).toHaveBeenCalled());
    filler.markTried('a');
    release();
    await running;
    expect(setCover).not.toHaveBeenCalled();
  });

  test('a partial failure without a cover is retried later', async () => {
    const findCover = vi.fn(async () => ({ cover: '', failed: false, partial: true }));
    const { filler, storage } = setup({ books: [makeBook({ id: 'a' })], findCover });
    await filler.run();
    expect(storage.data[TRIED_PREF]).toBeUndefined();
    expect(findCover).toHaveBeenCalledOnce();
  });

  test('a partial failure that still found a cover counts', async () => {
    const findCover = vi.fn(async () => ({
      cover: 'https://x/a.jpg',
      failed: false,
      partial: true,
    }));
    const { filler, setCover } = setup({ books: [makeBook({ id: 'a' })], findCover });
    await filler.run();
    expect(setCover).toHaveBeenCalledWith('a', 'https://x/a.jpg');
  });

  test('forgets ids of books that no longer exist', async () => {
    const findCover = vi.fn(async () => ({ cover: '', failed: false }));
    const { filler, storage } = setup({
      books: [makeBook({ id: 'a' })],
      findCover,
      storage: prefs({ [TRIED_PREF]: '["gone1","gone2"]' }),
    });
    await filler.run();
    expect(JSON.parse(storage.data[TRIED_PREF])).toEqual(['a']);
  });
});
