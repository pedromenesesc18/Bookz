import { describe, expect, test } from 'vitest';
import {
  upsertBook,
  removeBook,
  restoreBook,
  mergeBooks,
  matchesQuery,
  readingBooks,
  wantBooks,
  shelfBooks,
  shelfSummary,
  readYears,
  readByMonth,
  yearStats,
  NO_DATE,
} from '../../src/domain/library.js';

const b = (over) => ({
  id: over.id ?? over.title,
  title: 'T',
  author: '',
  status: 'quero',
  fisico: false,
  rating: 0,
  pages: 0,
  currentPage: 0,
  finishedAt: '',
  startedAt: '',
  notes: '',
  cover: '',
  addedAt: '',
  ...over,
});

describe('upsertBook', () => {
  test('appends new books without mutating the list', () => {
    const list = Object.freeze([b({ title: 'A' })]);
    const next = upsertBook(list, b({ title: 'B' }));
    expect(next.map((x) => x.id)).toEqual(['A', 'B']);
    expect(list).toHaveLength(1);
  });
  test('replaces an existing book in place', () => {
    const list = [b({ title: 'A' }), b({ title: 'B' })];
    const next = upsertBook(list, b({ id: 'A', title: 'A2' }));
    expect(next.map((x) => x.title)).toEqual(['A2', 'B']);
    expect(list[0].title).toBe('A');
  });
});

describe('removeBook / restoreBook', () => {
  test('removes and can restore at the same position', () => {
    const list = [b({ title: 'A' }), b({ title: 'B' }), b({ title: 'C' })];
    const { list: after, removed, index } = removeBook(list, 'B');
    expect(after.map((x) => x.id)).toEqual(['A', 'C']);
    expect(removed.id).toBe('B');
    expect(restoreBook(after, removed, index).map((x) => x.id)).toEqual(['A', 'B', 'C']);
  });
  test('is a no-op for unknown ids', () => {
    const list = [b({ title: 'A' })];
    expect(removeBook(list, 'zzz')).toEqual({ list, removed: null, index: -1 });
  });
  test('restore does not duplicate an existing id', () => {
    const list = [b({ title: 'A' })];
    expect(restoreBook(list, b({ title: 'A' }), 0)).toBe(list);
  });
});

describe('mergeBooks', () => {
  test('adds only books with unseen ids and reports the count', () => {
    const list = [b({ title: 'A' })];
    const { list: next, added } = mergeBooks(list, [b({ title: 'A' }), b({ title: 'B' })]);
    expect(added).toBe(1);
    expect(next.map((x) => x.id)).toEqual(['A', 'B']);
  });
  test('ignores duplicates inside the incoming list', () => {
    const { added } = mergeBooks([], [b({ title: 'X' }), b({ title: 'X' })]);
    expect(added).toBe(1);
  });
});

describe('matchesQuery', () => {
  const book = b({ title: 'Memórias Póstumas', author: 'Machado de Assis' });
  test('matches title or author ignoring accents and case', () => {
    expect(matchesQuery(book, 'memorias')).toBe(true);
    expect(matchesQuery(book, 'ASSIS')).toBe(true);
    expect(matchesQuery(book, 'tolkien')).toBe(false);
  });
  test('empty query matches everything', () => {
    expect(matchesQuery(book, '  ')).toBe(true);
  });
});

describe('tab selectors', () => {
  const list = [
    b({ title: 'Zeta', status: 'quero' }),
    b({ title: 'Alfa', status: 'quero', fisico: true }),
    b({ title: 'Beta', status: 'quero' }),
    b({ title: 'Lendo1', status: 'lendo', fisico: true }),
    b({ title: 'Lido1', status: 'lido', fisico: true }),
  ];

  test('readingBooks returns only "lendo"', () => {
    expect(readingBooks(list, '').map((x) => x.title)).toEqual(['Lendo1']);
  });

  test('wantBooks puts physical copies first, then alphabetical', () => {
    expect(wantBooks(list, '').map((x) => x.title)).toEqual(['Alfa', 'Beta', 'Zeta']);
  });

  test('shelfBooks lists unread physical books', () => {
    expect(shelfBooks(list, '').map((x) => x.title)).toEqual(['Alfa', 'Lendo1']);
  });

  test('shelfSummary counts unread, read and total physical books', () => {
    expect(shelfSummary(list)).toEqual({ unread: 2, read: 1, total: 3 });
  });

  test('selectors apply the search query', () => {
    expect(wantBooks(list, 'zet').map((x) => x.title)).toEqual(['Zeta']);
  });
});

describe('read books by year', () => {
  const list = [
    b({ title: 'A', status: 'lido', finishedAt: '2023-05-02', rating: 4, pages: 100 }),
    b({ title: 'B', status: 'lido', finishedAt: '2024-01-10', rating: 5, pages: 300 }),
    b({ title: 'C', status: 'lido', finishedAt: '2024-01-20', rating: 0, pages: 0 }),
    b({ title: 'D', status: 'lido', finishedAt: '2024-07-01', rating: 3, pages: 200 }),
    b({ title: 'E', status: 'lido', finishedAt: '' }),
    b({ title: 'F', status: 'lendo', finishedAt: '2025-01-01' }),
  ];

  test('readYears is newest first with undated books last', () => {
    expect(readYears(list)).toEqual(['2024', '2023', NO_DATE]);
  });

  test('readByMonth groups newest month first, newest book first', () => {
    const groups = readByMonth(list, '2024', '');
    expect(groups.map((g) => g.month)).toEqual(['07', '01']);
    expect(groups[1].books.map((x) => x.title)).toEqual(['C', 'B']);
  });

  test('readByMonth handles undated books', () => {
    const groups = readByMonth(list, NO_DATE, '');
    expect(groups).toEqual([{ month: '??', books: [expect.objectContaining({ title: 'E' })] }]);
  });

  test('yearStats sums pages and averages only rated books', () => {
    const books = readByMonth(list, '2024', '').flatMap((g) => g.books);
    expect(yearStats(books)).toEqual({ count: 3, pages: 500, avgRating: 4 });
  });

  test('yearStats returns null average when nothing is rated', () => {
    expect(yearStats([b({ title: 'x' })])).toEqual({ count: 1, pages: 0, avgRating: null });
  });
});
