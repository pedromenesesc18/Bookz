import { describe, expect, test } from 'vitest';
import { newDraft, withStatus, finalizeDraft } from '../../src/domain/draft.js';

const TODAY = '2024-06-01';

describe('newDraft', () => {
  test.each([
    ['lidos', 'lido', false],
    ['lendo', 'lendo', false],
    ['quero', 'quero', false],
    ['estante', 'quero', true],
  ])('tab %s starts as %s (físico: %s)', (tab, status, fisico) => {
    const d = newDraft(tab, TODAY, { title: 'X' });
    expect(d).toMatchObject({ title: 'X', status, fisico });
  });

  test('fills the date that matches the status', () => {
    expect(newDraft('lidos', TODAY).finishedAt).toBe(TODAY);
    expect(newDraft('lendo', TODAY).startedAt).toBe(TODAY);
  });
});

describe('withStatus', () => {
  test('never overwrites an existing date', () => {
    const d = withStatus({ finishedAt: '2020-01-01' }, 'lido', TODAY);
    expect(d.finishedAt).toBe('2020-01-01');
  });
});

describe('finalizeDraft', () => {
  test('clears finish date and keeps progress when not read', () => {
    const book = finalizeDraft(
      { title: 'A', status: 'lendo', finishedAt: '2024-01-01', currentPage: '30', pages: '100' },
      TODAY,
    );
    expect(book).toMatchObject({ finishedAt: '', currentPage: 30, addedAt: TODAY });
  });

  test('resets progress for read books and keeps addedAt', () => {
    const book = finalizeDraft(
      {
        title: 'A',
        status: 'lido',
        finishedAt: '2024-01-01',
        currentPage: 30,
        addedAt: '2023-01-01',
      },
      TODAY,
    );
    expect(book).toMatchObject({ finishedAt: '2024-01-01', currentPage: 0, addedAt: '2023-01-01' });
  });

  test('returns null without title', () => {
    expect(finalizeDraft({ title: ' ' }, TODAY)).toBeNull();
  });
});
