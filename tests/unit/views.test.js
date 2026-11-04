import { describe, expect, test } from 'vitest';
import { renderTab, isTab } from '../../src/ui/views/index.js';
import { resolveYear } from '../../src/ui/views/read-view.js';
import { coverHtml, starsHtml, progressHtml, bookCard } from '../../src/ui/templates.js';
import { makeBook } from './fixtures.js';

const state = (books, over = {}) => ({ books, tab: 'lidos', year: null, query: '', ...over });

const html = (s) => {
  const el = document.createElement('div');
  el.innerHTML = renderTab(s);
  return el;
};

describe('templates', () => {
  test('escape user content in cards', () => {
    const card = bookCard(makeBook({ title: '<img src=x onerror=alert(1)>' }));
    expect(card).not.toContain('<img src=x');
    expect(card).toContain('&lt;img');
  });

  test('cover shows the initial and the image when available', () => {
    expect(coverHtml(makeBook({ title: 'abc' }))).toContain('>A<');
    expect(coverHtml(makeBook({ cover: 'https://x.com/c.jpg' }))).toContain(
      'src="https://x.com/c.jpg"',
    );
  });

  test('stars render nothing for unrated books', () => {
    expect(starsHtml(0)).toBe('');
    expect(starsHtml(3)).toContain('3 de 5 estrelas');
  });

  test('progress needs pages and current page', () => {
    expect(progressHtml(makeBook({ pages: 200 }))).toBe('');
    expect(progressHtml(makeBook({ pages: 200, currentPage: 50 }))).toContain('25%');
  });
});

describe('read view (Lidos)', () => {
  const books = [
    makeBook({ title: 'A', status: 'lido', finishedAt: '2024-03-01', rating: 4, pages: 100 }),
    makeBook({ title: 'B', status: 'lido', finishedAt: '2023-03-01' }),
  ];

  test('shows empty state without read books', () => {
    expect(html(state([])).textContent).toContain('Nenhum livro lido ainda');
  });

  test('defaults to the newest year with stats and month groups', () => {
    const el = html(state(books));
    expect(el.querySelector('[aria-selected="true"]').textContent).toBe('2024');
    expect(el.querySelector('.month h2').textContent).toContain('março');
    expect(el.querySelector('.stats').textContent).toContain('100');
    expect(el.querySelectorAll('.book')).toHaveLength(1);
  });

  test('shows the selected year and "Sem data" label', () => {
    const undated = [...books, makeBook({ title: 'C', status: 'lido' })];
    const el = html(state(undated, { year: '????' }));
    expect(el.querySelector('[aria-selected="true"]').textContent).toBe('Sem data');
    expect(el.textContent).toContain('sem mês');
  });

  test('shows a no-results message when the query filters everything', () => {
    expect(html(state(books, { query: 'zzz' })).textContent).toContain(
      'Nada encontrado para “zzz”',
    );
  });

  test('resolveYear falls back to newest year', () => {
    expect(resolveYear(books, '1999')).toBe('2024');
    expect(resolveYear([], '1999')).toBeNull();
  });
});

describe('other tabs', () => {
  const books = [
    makeBook({ title: 'Lendo', status: 'lendo', pages: 100, currentPage: 10 }),
    makeBook({ title: 'Lendo2', status: 'lendo', startedAt: '2024-02-03' }),
    makeBook({ title: 'Quero', status: 'quero', fisico: true }),
    makeBook({ title: 'Lido', status: 'lido', fisico: true }),
  ];

  test('Lendo shows progress or start date', () => {
    const text = html(state(books, { tab: 'lendo' })).textContent;
    expect(text).toContain('10%');
    expect(text).toContain('desde 3 de fevereiro');
  });

  test('Quero ler counts the list and tags physical copies', () => {
    const text = html(state(books, { tab: 'quero' })).textContent;
    expect(text).toContain('1 livro na lista');
    expect(text).toContain('tenho físico');
  });

  test('Estante shows summary and reading tag', () => {
    const shelf = [...books, makeBook({ title: 'Físico lendo', status: 'lendo', fisico: true })];
    const el = html(state(shelf, { tab: 'estante' }));
    expect(el.querySelector('.stats').textContent).toBe('pra ler2já lidos1na estante3');
    expect(el.textContent).toContain('lendo agora');
  });

  test('empty states', () => {
    expect(html(state([], { tab: 'lendo' })).textContent).toContain('Nenhum livro em andamento');
    expect(html(state([], { tab: 'quero' })).textContent).toContain('lista de desejos');
    expect(html(state([], { tab: 'estante' })).textContent).toContain('Nenhum livro físico');
    const allRead = [makeBook({ title: 'X', status: 'lido', fisico: true })];
    expect(html(state(allRead, { tab: 'estante' })).textContent).toContain('já leu todos');
    expect(html(state(books, { tab: 'lendo', query: 'zzz' })).textContent).toContain(
      'Nada encontrado',
    );
  });

  test('isTab validates ids and unknown tabs fall back to Lidos', () => {
    expect(isTab('estante')).toBe(true);
    expect(isTab('x')).toBe(false);
    expect(html(state([], { tab: 'x' })).textContent).toContain('Nenhum livro lido');
  });
});
