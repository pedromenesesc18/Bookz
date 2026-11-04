import { beforeEach, describe, expect, test } from 'vitest';
import { createStorage, BOOKS_KEY } from '../../src/data/storage.js';

const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
};

describe('createStorage', () => {
  let backend;
  beforeEach(() => {
    backend = memory();
  });

  test('uses the same key as the previous version', () => {
    expect(BOOKS_KEY).toBe('bookz.v1');
  });

  test('loads and normalizes legacy books, dropping invalid entries', () => {
    backend.setItem(BOOKS_KEY, JSON.stringify([{ id: 'a1', title: 'A', pages: '10' }, { x: 1 }]));
    const books = createStorage(backend).loadBooks();
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({ id: 'a1', pages: 10 });
  });

  test('persists repaired ids right away so re-imports still dedupe', () => {
    backend.setItem(
      BOOKS_KEY,
      JSON.stringify([
        { id: null, title: 'Sem id' },
        { id: 'ok1', title: 'Ok' },
      ]),
    );
    const books = createStorage(backend).loadBooks();
    expect(JSON.parse(backend.getItem(BOOKS_KEY)).map((b) => b.id)).toEqual(books.map((b) => b.id));
    expect(books[0].id).toMatch(/^[a-z0-9]+$/);
  });

  test('does not rewrite storage when nothing was repaired', () => {
    const raw = JSON.stringify([{ id: 'a1', title: 'A' }]);
    backend.setItem(BOOKS_KEY, raw);
    createStorage(backend).loadBooks();
    expect(backend.getItem(BOOKS_KEY)).toBe(raw);
  });

  test('returns an empty list for missing or corrupted data', () => {
    expect(createStorage(backend).loadBooks()).toEqual([]);
    backend.setItem(BOOKS_KEY, '{oops');
    expect(createStorage(backend).loadBooks()).toEqual([]);
    backend.setItem(BOOKS_KEY, '{"a":1}');
    expect(createStorage(backend).loadBooks()).toEqual([]);
  });

  test('saveBooks persists and reports success', () => {
    const storage = createStorage(backend);
    expect(storage.saveBooks([{ id: 'x', title: 'X' }])).toBe(true);
    expect(JSON.parse(backend.getItem(BOOKS_KEY))).toEqual([{ id: 'x', title: 'X' }]);
  });

  test('saveBooks reports failure when the backend throws (quota, private mode)', () => {
    const broken = {
      ...backend,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(createStorage(broken).saveBooks([])).toBe(false);
  });

  test('prefs round-trip and fall back when unavailable', () => {
    const storage = createStorage(backend);
    expect(storage.loadPref('tab', 'lidos')).toBe('lidos');
    storage.savePref('tab', 'quero');
    expect(storage.loadPref('tab', 'lidos')).toBe('quero');

    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const safe = createStorage(throwing);
    expect(safe.loadPref('tab', 'lidos')).toBe('lidos');
    expect(() => safe.savePref('tab', 'x')).not.toThrow();
    expect(safe.loadBooks()).toEqual([]);
  });

  test('works without any backend', () => {
    const storage = createStorage(null);
    expect(storage.loadBooks()).toEqual([]);
    expect(storage.saveBooks([])).toBe(false);
  });
});
