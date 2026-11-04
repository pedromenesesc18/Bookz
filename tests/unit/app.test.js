import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mountApp } from '../../src/ui/app.js';
import { createStorage, BOOKS_KEY } from '../../src/data/storage.js';
import { APP_HTML, memoryBackend } from './fixtures.js';

const $ = (s) => document.querySelector(s);
let backend;

const mount = (books = []) => {
  backend.setItem(BOOKS_KEY, JSON.stringify(books));
  return mountApp({
    storage: createStorage(backend),
    search: vi.fn(async () => ({ items: [], failed: false })),
    today: () => '2024-06-01',
    now: () => new Date(2024, 5, 1),
  });
};

beforeEach(() => {
  window.scrollTo = vi.fn();
  document.body.innerHTML = APP_HTML;
  backend = memoryBackend();
});

describe('mountApp', () => {
  test('renders legacy data on the Lidos tab', () => {
    mount([
      { id: 'a1', title: 'Dom Casmurro', status: 'lido', finishedAt: '2024-03-05', pages: '256' },
    ]);
    expect($('#view').textContent).toContain('Dom Casmurro');
    expect($('#nav [aria-current="page"]').dataset.tab).toBe('lidos');
  });

  test('restores the saved tab, ignoring invalid values', () => {
    backend.setItem('bookz.tab', 'quero');
    mount();
    expect($('#view').dataset.tab).toBe('quero');
    document.body.innerHTML = APP_HTML;
    backend.setItem('bookz.tab', '<bad>');
    mount();
    expect($('#view').dataset.tab).toBe('lidos');
  });

  test('switches tabs and years via clicks', () => {
    mount([
      { id: 'a', title: 'A', status: 'lido', finishedAt: '2024-01-01' },
      { id: 'b', title: 'B', status: 'lido', finishedAt: '2023-01-01' },
    ]);
    $('[data-year="2023"]').click();
    expect($('#view').textContent).toContain('B');
    expect($('#view').textContent).not.toContain('A');
    $('#nav [data-tab="estante"]').click();
    expect($('#view').dataset.tab).toBe('estante');
    expect(backend.getItem('bookz.tab')).toBe('estante');
  });

  test('full flow: add manually, edit, delete', () => {
    mount();
    $('[data-action="add"]').click();
    $('#add-q').value = 'Meu Livro';
    $('[data-action="manual"]').click();
    $('#book-form').requestSubmit();
    expect(JSON.parse(backend.getItem(BOOKS_KEY))[0].title).toBe('Meu Livro');

    $('.book[data-id]').click();
    expect($('#sheet-body').textContent).toContain('Editar livro');
    $('[data-action="delete"]').click();
    expect(JSON.parse(backend.getItem(BOOKS_KEY))).toEqual([]);
    expect($('#toast').textContent).toContain('Desfazer');
  });

  test('search bar filters the list', () => {
    mount([
      { id: 'a', title: 'Alfa', status: 'quero' },
      { id: 'b', title: 'Beta', status: 'quero' },
    ]);
    $('#nav [data-tab="quero"]').click();
    $('[data-action="search"]').click();
    expect($('#search-bar').hidden).toBe(false);
    $('#q').value = 'bet';
    $('#q').dispatchEvent(new Event('input'));
    expect($('#view').textContent).toContain('Beta');
    expect($('#view').textContent).not.toContain('Alfa');
  });

  test('menu opens and import adds books from a file', async () => {
    const app = mount();
    $('[data-action="menu"]').click();
    expect($('#sheet-body').textContent).toContain('Seus dados');
    const click = vi.spyOn($('#import-file'), 'click').mockImplementation(() => {});
    $('[data-action="import"]').click();
    expect(click).toHaveBeenCalled();

    await app.importBackup(
      new File([JSON.stringify({ books: [{ title: 'Importado' }] })], 'b.json'),
    );
    expect($('#toast').textContent).toContain('1 livro importado');
    await app.importBackup(new File(['lixo'], 'b.json'));
    expect($('#toast').textContent).toContain('Arquivo de backup inválido');
  });

  test('import via file input change event', async () => {
    mount();
    const input = $('#import-file');
    const file = new File([JSON.stringify([{ title: 'A' }, { title: 'B' }])], 'b.json');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect($('#toast').textContent).toContain('2 livros importados'));
  });

  test('export builds a dated JSON file', async () => {
    const app = mount([{ id: 'a', title: 'A' }]);
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await app.exportBackup()).toBe('downloaded');
  });

  test('removes broken cover images', () => {
    mount([
      { id: 'a', title: 'A', status: 'lido', finishedAt: '2024-01-01', cover: 'https://x/c.jpg' },
    ]);
    const img = $('img[data-cover]');
    img.dispatchEvent(new Event('error'));
    expect($('img[data-cover]')).toBeNull();
  });
});
