import { describe, expect, test, vi } from 'vitest';
import { findCovers, findCover, isSameBook, MAX_COVER_CHOICES } from '../../src/data/covers.js';

const json = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const route = (handlers) =>
  vi.fn((url) => {
    const key = Object.keys(handlers).find((k) => url.includes(k));
    return key ? handlers[key]() : Promise.reject(new Error('unexpected ' + url));
  });

const OL = {
  docs: [
    { title: 'Dom Casmurro', author_name: ['Machado de Assis'], cover_i: 1 },
    { title: 'Dom Casmurro (edição comentada)', cover_i: 2 },
    { title: 'Outro Livro', cover_i: 3 },
    { title: 'Dom Casmurro', cover_i: 1 },
    { title: 'Dom Casmurro' },
  ],
};
const GOOGLE = {
  items: [
    {
      volumeInfo: {
        title: 'Dom Casmurro',
        imageLinks: { thumbnail: 'http://books.google.com/c?id=g1' },
      },
    },
    { volumeInfo: { title: 'Dom Casmurro' } },
  ],
};

describe('isSameBook', () => {
  test('matches ignoring accents, case and subtitles', () => {
    expect(
      isSameBook('Memórias Póstumas de Brás Cubas', 'memorias postumas de bras cubas: edição'),
    ).toBe(true);
    expect(isSameBook('O Hobbit: Lá e de volta', 'O Hobbit')).toBe(true);
    expect(isSameBook('Dom Casmurro', 'Outro Livro')).toBe(false);
    expect(isSameBook('', 'x')).toBe(false);
    expect(isSameBook('O Hobbit', 'The Hobbit')).toBe(true);
    expect(isSameBook('A Revolução dos Bichos', 'Revolução dos Bichos')).toBe(true);
    expect(isSameBook('O Pequeno Príncipe', 'Le Petit Prince')).toBe(false);
    expect(isSameBook('O', 'Outro Livro')).toBe(false);
    expect(isSameBook('Duna', 'Filhos de Duna')).toBe(false);
    expect(isSameBook('Ana', 'Banana')).toBe(false);
    expect(isSameBook('Duna', 'Duna Messias')).toBe(true);
  });
});

describe('findCovers', () => {
  test('collects unique https covers of matching titles from both sources, Open Library first', async () => {
    const fetchFn = route({ 'openlibrary.org': () => json(OL), googleapis: () => json(GOOGLE) });
    const { covers, failed } = await findCovers(
      { title: 'Dom Casmurro', author: 'Machado de Assis' },
      { fetchFn },
    );
    expect(failed).toBe(false);
    expect(covers).toEqual([
      'https://covers.openlibrary.org/b/id/1-M.jpg',
      'https://covers.openlibrary.org/b/id/2-M.jpg',
      'https://books.google.com/c?id=g1',
    ]);
    expect(fetchFn.mock.calls[0][0]).toContain(encodeURIComponent('Dom Casmurro Machado de Assis'));
  });

  test('still returns covers when one source fails', async () => {
    const fetchFn = route({
      'openlibrary.org': () => Promise.reject(new TypeError('offline')),
      googleapis: () => json(GOOGLE),
    });
    expect((await findCovers({ title: 'Dom Casmurro' }, { fetchFn })).covers).toHaveLength(1);
  });

  test('reports failure only when every source fails', async () => {
    const fetchFn = vi.fn(() => Promise.resolve({ ok: false, status: 429 }));
    expect(await findCovers({ title: 'Dom Casmurro' }, { fetchFn })).toEqual({
      covers: [],
      failed: true,
      partial: true,
    });
  });

  test('caps the number of choices', async () => {
    const docs = Array.from({ length: 20 }, (_, i) => ({ title: 'Duna', cover_i: i + 1 }));
    const fetchFn = route({ 'openlibrary.org': () => json({ docs }), googleapis: () => json({}) });
    expect((await findCovers({ title: 'Duna' }, { fetchFn })).covers).toHaveLength(
      MAX_COVER_CHOICES,
    );
  });

  test('skips the network for books without a title', async () => {
    const fetchFn = vi.fn();
    expect(await findCovers({ title: ' ' }, { fetchFn })).toEqual({
      covers: [],
      failed: false,
      partial: false,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('findCover', () => {
  test('returns the best cover or empty string', async () => {
    const fetchFn = route({ 'openlibrary.org': () => json(OL), googleapis: () => json({}) });
    expect(await findCover({ title: 'Dom Casmurro' }, { fetchFn })).toEqual({
      cover: 'https://covers.openlibrary.org/b/id/1-M.jpg',
      failed: false,
      partial: false,
    });
    expect(await findCover({ title: 'Nada Disso' }, { fetchFn })).toEqual({
      cover: '',
      failed: false,
      partial: false,
    });
  });
});

describe('partial failures', () => {
  test('reports partial when only one source failed', async () => {
    const fetchFn = route({
      'openlibrary.org': () => Promise.reject(new TypeError('timeout')),
      googleapis: () => json({}),
    });
    expect(await findCovers({ title: 'Dom Casmurro' }, { fetchFn })).toEqual({
      covers: [],
      failed: false,
      partial: true,
    });
  });
});

describe('findCovers in loose mode (manual picker)', () => {
  test('also offers covers of other editions/translations, matching titles first', async () => {
    const fetchFn = route({
      'openlibrary.org': () =>
        json({ docs: [{ title: 'Cien años de soledad', cover_i: 7 }, { title: 'Cem anos de solidão', cover_i: 8 }] }),
      googleapis: () => json({}),
    });
    const book = { title: 'Cem Anos de Solidão', author: 'Gabriel García Márquez' };
    expect((await findCovers(book, { fetchFn })).covers).toEqual([
      'https://covers.openlibrary.org/b/id/8-M.jpg',
    ]);
    expect((await findCovers(book, { fetchFn, strict: false })).covers).toEqual([
      'https://covers.openlibrary.org/b/id/8-M.jpg',
      'https://covers.openlibrary.org/b/id/7-M.jpg',
    ]);
  });
});
