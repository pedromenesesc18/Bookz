import { describe, expect, test, vi } from 'vitest';
import {
  searchBooks,
  mapGoogleVolume,
  mapOpenLibraryDoc,
  buildGoogleQuery,
  MIN_QUERY_LENGTH,
} from '../../src/data/search.js';

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const googleBody = {
  items: [
    {
      volumeInfo: {
        title: 'O Hobbit',
        subtitle: 'Lá e de volta outra vez',
        authors: ['J.R.R. Tolkien', 'J. R. R. Tolkien'],
        pageCount: 336,
        imageLinks: { thumbnail: 'http://books.google.com/c?id=1&edge=curl' },
      },
    },
  ],
};

describe('buildGoogleQuery', () => {
  test('uses the isbn: prefix for ISBN-10/13 queries', () => {
    expect(buildGoogleQuery('978-85-359-0277-1')).toBe('isbn:9788535902771');
    expect(buildGoogleQuery('0-306-40615-2')).toBe('isbn:0306406152');
  });
  test('keeps free text untouched', () => {
    expect(buildGoogleQuery('o hobbit')).toBe('o hobbit');
  });
});

describe('mapGoogleVolume', () => {
  test('maps title, deduped authors, pages and a clean https cover', () => {
    expect(mapGoogleVolume(googleBody.items[0])).toEqual({
      title: 'O Hobbit: Lá e de volta outra vez',
      author: 'J.R.R. Tolkien, J. R. R. Tolkien',
      pages: 336,
      cover: 'https://books.google.com/c?id=1',
    });
  });
  test('tolerates missing fields', () => {
    expect(mapGoogleVolume({})).toEqual({ title: '', author: '', pages: 0, cover: '' });
  });
});

describe('mapOpenLibraryDoc', () => {
  test('maps cover id to the covers CDN', () => {
    expect(
      mapOpenLibraryDoc({ title: 'X', author_name: ['Y'], cover_i: 9, number_of_pages_median: 10 }),
    ).toEqual({
      title: 'X',
      author: 'Y',
      pages: 10,
      cover: 'https://covers.openlibrary.org/b/id/9-M.jpg',
    });
  });
  test('tolerates missing fields', () => {
    expect(mapOpenLibraryDoc({})).toEqual({ title: '', author: '', pages: 0, cover: '' });
  });
});

describe('searchBooks', () => {
  test('ignores too-short queries without fetching', async () => {
    const fetchFn = vi.fn();
    expect(await searchBooks('a'.repeat(MIN_QUERY_LENGTH - 1), { fetchFn })).toEqual({
      items: [],
      failed: false,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test('returns Google results when available', async () => {
    const fetchFn = vi.fn(() => ok(googleBody));
    const { items, failed } = await searchBooks('hobbit', { fetchFn });
    expect(failed).toBe(false);
    expect(items[0].title).toMatch('O Hobbit');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toContain('googleapis.com');
  });

  test('falls back to Open Library when Google is empty', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => ok({}))
      .mockImplementationOnce(() => ok({ docs: [{ title: 'OL' }, { title: '' }] }));
    const { items } = await searchBooks('raro', { fetchFn });
    expect(items.map((x) => x.title)).toEqual(['OL']);
    expect(fetchFn.mock.calls[1][0]).toContain('openlibrary.org');
  });

  test('falls back to Open Library when Google errors', async () => {
    const fetchFn = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve({ ok: false, status: 429 }))
      .mockImplementationOnce(() => ok({ docs: [{ title: 'OL' }] }));
    const { items, failed } = await searchBooks('raro', { fetchFn });
    expect(items).toHaveLength(1);
    expect(failed).toBe(false);
  });

  test('reports failure when both sources fail', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new TypeError('offline')));
    expect(await searchBooks('qualquer', { fetchFn })).toEqual({ items: [], failed: true });
  });

  test('reports no failure when sources answer with nothing', async () => {
    const fetchFn = vi.fn(() => ok({}));
    expect(await searchBooks('qualquer', { fetchFn })).toEqual({ items: [], failed: false });
  });

  test('aborts slow requests after the timeout', async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const pending = searchBooks('lento', { fetchFn, timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(250);
    expect(await pending).toEqual({ items: [], failed: true });
    vi.useRealTimers();
  });
});
