import { describe, expect, test } from 'vitest';
import {
  serializeBackup,
  parseBackup,
  backupFileName,
  MAX_BACKUP_BYTES,
} from '../../src/data/backup.js';

const books = [{ id: 'a1', title: 'A', status: 'lido' }];

describe('serializeBackup', () => {
  test('wraps books with app metadata', () => {
    const json = JSON.parse(serializeBackup(books, new Date('2024-03-05T10:00:00Z')));
    expect(json).toEqual({
      app: 'bookz',
      version: 2,
      exportedAt: '2024-03-05T10:00:00.000Z',
      books,
    });
  });
});

describe('backupFileName', () => {
  test('includes the local date', () => {
    expect(backupFileName(new Date(2024, 2, 5))).toBe('bookz-backup-2024-03-05.json');
  });
});

describe('parseBackup', () => {
  test('reads current and v1 envelopes', () => {
    const v1 = JSON.stringify({
      app: 'bookz',
      version: 1,
      books: [{ id: 'a1', title: 'A', pages: '5' }],
    });
    expect(parseBackup(v1)).toEqual([expect.objectContaining({ id: 'a1', pages: 5 })]);
  });

  test('reads a bare array of books', () => {
    expect(parseBackup(JSON.stringify([{ title: 'Solto' }]))).toHaveLength(1);
  });

  test('skips invalid entries but keeps the valid ones', () => {
    const text = JSON.stringify({ books: [{ title: 'Ok' }, { title: '' }, 3, null] });
    expect(parseBackup(text).map((x) => x.title)).toEqual(['Ok']);
  });

  test.each([
    ['not json', '{nope'],
    ['no books array', '{"app":"bookz"}'],
    ['number', '42'],
  ])('throws a friendly error for %s', (_label, text) => {
    expect(() => parseBackup(text)).toThrow('Arquivo de backup inválido');
  });

  test('rejects files that are too large', () => {
    expect(() => parseBackup('x'.repeat(MAX_BACKUP_BYTES + 1))).toThrow('muito grande');
  });
});
