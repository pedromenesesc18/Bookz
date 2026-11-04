import { describe, expect, test } from 'vitest';
import { STATUS, normalizeBook, LIMITS } from '../../src/domain/book.js';

const legacy = {
  id: 'lx1abc',
  title: 'Dom Casmurro',
  author: 'Machado de Assis',
  status: 'lido',
  fisico: true,
  rating: 5,
  finishedAt: '2024-03-05',
  startedAt: '',
  pages: '256',
  notes: 'Capitu!',
  addedAt: '2024-03-01',
  cover: 'https://books.google.com/x.jpg',
};

describe('normalizeBook', () => {
  test('accepts books saved by the previous version', () => {
    const book = normalizeBook(legacy);
    expect(book).toMatchObject({
      id: 'lx1abc',
      title: 'Dom Casmurro',
      status: STATUS.READ,
      fisico: true,
      rating: 5,
      pages: 256,
      currentPage: 0,
      finishedAt: '2024-03-05',
    });
  });

  test('returns null when there is no usable title', () => {
    expect(normalizeBook({ title: '   ' })).toBeNull();
    expect(normalizeBook(null)).toBeNull();
    expect(normalizeBook('x')).toBeNull();
  });

  test('does not mutate its input', () => {
    const input = { ...legacy };
    normalizeBook(input);
    expect(input).toEqual(legacy);
  });

  test('generates an id when missing or invalid', () => {
    expect(normalizeBook({ title: 'A' }).id).toMatch(/^[a-z0-9]+$/);
    expect(normalizeBook({ title: 'A', id: '<script>' }).id).not.toBe('<script>');
  });

  test('defaults unknown status to "quero"', () => {
    expect(normalizeBook({ title: 'A', status: 'x' }).status).toBe(STATUS.WANT);
  });

  test('clamps rating to an integer between 0 and 5', () => {
    expect(normalizeBook({ title: 'A', rating: 9 }).rating).toBe(5);
    expect(normalizeBook({ title: 'A', rating: -2 }).rating).toBe(0);
    expect(normalizeBook({ title: 'A', rating: '3.7' }).rating).toBe(4);
    expect(normalizeBook({ title: 'A', rating: 'abc' }).rating).toBe(0);
  });

  test('parses pages and keeps currentPage within bounds', () => {
    const book = normalizeBook({ title: 'A', pages: '1.200 págs', currentPage: 5000 });
    expect(book.pages).toBe(1200);
    expect(book.currentPage).toBe(1200);
    expect(normalizeBook({ title: 'A', pages: 'n/a', currentPage: -3 }).currentPage).toBe(0);
  });

  test('drops invalid dates', () => {
    const book = normalizeBook({ title: 'A', finishedAt: '31/12/2024', startedAt: '2024-02-31' });
    expect(book.finishedAt).toBe('');
    expect(book.startedAt).toBe('');
  });

  test('only keeps http(s) covers and upgrades http to https', () => {
    expect(normalizeBook({ title: 'A', cover: 'javascript:alert(1)' }).cover).toBe('');
    expect(normalizeBook({ title: 'A', cover: 'http://x.com/a.jpg' }).cover).toBe(
      'https://x.com/a.jpg',
    );
    expect(normalizeBook({ title: 'A', cover: 'not a url' }).cover).toBe('');
  });

  test('keeps long notes and titles written by v1 (no data loss)', () => {
    const notes = 'frase favorita. '.repeat(500); // ~8000 chars
    const title = 'T'.repeat(800);
    expect(normalizeBook({ title, notes })).toMatchObject({ title, notes: notes.trim() });
  });

  test('limits absurd text length', () => {
    const book = normalizeBook({ title: 'x'.repeat(5000), notes: 'n'.repeat(300000) });
    expect(book.title).toHaveLength(LIMITS.title);
    expect(book.notes).toHaveLength(LIMITS.notes);
  });

  test('coerces fisico to boolean', () => {
    expect(normalizeBook({ title: 'A', fisico: 'yes' }).fisico).toBe(true);
    expect(normalizeBook({ title: 'A' }).fisico).toBe(false);
  });
});
