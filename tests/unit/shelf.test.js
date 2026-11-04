import { describe, expect, test } from 'vitest';
import { spineHtml, yearShelfHtml, shelfWallHtml, deskBookHtml } from '../../src/ui/shelf.js';
import { makeBook } from './fixtures.js';

const el = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
};

describe('spineHtml', () => {
  test('is a button that opens the book, sized by pages, with escaped title', () => {
    const book = makeBook({ id: 's1', title: '<b>Duna</b>', pages: 600 });
    const spine = el(spineHtml(book)).querySelector('.spine');
    expect(spine.dataset.action).toBe('edit');
    expect(spine.dataset.id).toBe('s1');
    expect(spine.getAttribute('aria-label')).toBe('<b>Duna</b>');
    expect(spine.innerHTML).toContain('&lt;b&gt;Duna');
    expect(spine.getAttribute('style')).toMatch(/--h:\d+px;--w:\d+px;--spine:#[0-9a-f]{6}/);
  });

  test('marks covers for color extraction and supports extra states', () => {
    const book = makeBook({ title: 'X', cover: 'https://covers.openlibrary.org/b/id/1-M.jpg' });
    const spine = el(spineHtml(book, { arrive: true, out: true })).querySelector('.spine');
    expect(spine.dataset.spineCover).toBe('https://covers.openlibrary.org/b/id/1-M.jpg');
    expect(spine.classList.contains('arrive')).toBe(true);
    expect(spine.classList.contains('out')).toBe(true);
  });
});

describe('yearShelfHtml', () => {
  const books = [
    makeBook({ id: 'a', title: 'A', finishedAt: '2024-01-01' }),
    makeBook({ id: 'b', title: 'B', finishedAt: '2024-03-01' }),
  ];

  test('shows the year label, count and spines in reading order', () => {
    const shelf = el(yearShelfHtml(books, '2024', null));
    expect(shelf.querySelector('.shelf-label').textContent).toBe('Prateleira de 2024 · 2 lidos');
    expect([...shelf.querySelectorAll('.spine')].map((s) => s.dataset.id)).toEqual(['a', 'b']);
  });

  test('animates the book that just arrived', () => {
    const shelf = el(yearShelfHtml(books, '2024', 'b'));
    expect(shelf.querySelector('.arrive').dataset.id).toBe('b');
  });

  test('handles singular and undated shelves; empty renders nothing', () => {
    expect(el(yearShelfHtml(books.slice(0, 1), '????', null)).textContent).toContain(
      'Prateleira sem data · 1 lido',
    );
    expect(yearShelfHtml([], '2024', null)).toBe('');
  });
});

describe('shelfWallHtml', () => {
  test('pulls out books being read', () => {
    const wall = el(
      shelfWallHtml(
        [makeBook({ id: 'r', title: 'R', status: 'lendo' }), makeBook({ id: 'q', title: 'Q' })],
        null,
      ),
    );
    expect(wall.querySelector('.spine.out').dataset.id).toBe('r');
    expect(wall.querySelectorAll('.spine')).toHaveLength(2);
  });
});

describe('deskBookHtml', () => {
  test('shows a tilted book with a bookmark ribbon at the progress depth', () => {
    const book = makeBook({ title: 'Torto Arado', pages: 200, currentPage: 50 });
    const desk = el(deskBookHtml(book));
    expect(desk.querySelector('.desk-book')).not.toBeNull();
    expect(desk.querySelector('.ribbon').getAttribute('style')).toBe('--progress:25%');
  });

  test('ribbon peeks out at the top when progress is unknown', () => {
    const desk = el(deskBookHtml(makeBook({ title: 'X' })));
    expect(desk.querySelector('.ribbon').getAttribute('style')).toBe('--progress:0%');
  });

  test('keeps the titled front under the cover, so a broken image never leaves a blank box', () => {
    const desk = el(deskBookHtml(makeBook({ title: 'Com Capa', cover: 'https://x/c.jpg' })));
    expect(desk.querySelector('.desk-front').textContent).toContain('Com Capa');
    expect(desk.querySelector('.desk-front + img')).not.toBeNull();
  });

  test('uses the cover when available, else a colored front with the title', () => {
    expect(
      el(deskBookHtml(makeBook({ title: 'Y', cover: 'https://x/c.jpg' }))).querySelector('img'),
    ).not.toBeNull();
    const plain = el(deskBookHtml(makeBook({ title: 'Sem Capa' })));
    expect(plain.querySelector('.desk-front').textContent).toContain('Sem Capa');
  });
});

describe('escaping', () => {
  test('the shelf label is escaped even for odd years from imported backups', () => {
    const book = makeBook({ title: 'A' });
    expect(yearShelfHtml([book], '<i>', null)).not.toContain('<i>');
  });
});
