import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createSheet } from '../../src/ui/sheet.js';
import { createToast } from '../../src/ui/toast.js';
import { openEditSheet, readForm } from '../../src/ui/sheets/edit-sheet.js';
import { openAddSheet, resultsHtml } from '../../src/ui/sheets/add-sheet.js';
import { openMenuSheet, shareOrDownload } from '../../src/ui/sheets/menu-sheet.js';
import { APP_HTML } from './fixtures.js';

const $ = (s) => document.querySelector(s);
const all = (s) => [...document.querySelectorAll(s)];
let sheet;

beforeEach(() => {
  document.body.innerHTML = APP_HTML;
  sheet = createSheet({ sheet: $('#sheet'), body: $('#sheet-body'), backdrop: $('#backdrop') });
});

describe('sheet', () => {
  test('opens, closes on backdrop and Escape, restores focus', () => {
    const opener = $('[data-action="add"]');
    opener.focus();
    sheet.open('<p>oi</p>', { label: 'Teste' });
    expect(sheet.isOpen()).toBe(true);
    expect($('#sheet').getAttribute('aria-label')).toBe('Teste');
    expect(document.body.classList.contains('locked')).toBe(true);
    $('#backdrop').click();
    expect(sheet.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);

    sheet.open('<p>de novo</p>');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(sheet.isOpen()).toBe(false);
    sheet.close();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
  });
});

describe('toast', () => {
  test('shows escaped text and hides after the timeout', () => {
    vi.useFakeTimers();
    const toast = createToast($('#toast'));
    toast.show('<b>oi</b>');
    expect($('#toast').classList.contains('show')).toBe(true);
    expect($('#toast').innerHTML).toContain('&lt;b&gt;');
    vi.advanceTimersByTime(3000);
    expect($('#toast').classList.contains('show')).toBe(false);
    vi.useRealTimers();
  });

  test('runs the action and hides', () => {
    const onAction = vi.fn();
    const toast = createToast($('#toast'));
    toast.show('Removido', { actionLabel: 'Desfazer', onAction });
    $('.toast-action').click();
    expect(onAction).toHaveBeenCalledOnce();
    expect($('#toast').classList.contains('show')).toBe(false);
  });
});

describe('edit sheet', () => {
  const draft = {
    id: 'b1',
    title: 'Livro',
    author: 'A',
    status: 'quero',
    fisico: false,
    rating: 0,
    pages: 0,
    currentPage: 0,
    finishedAt: '',
    startedAt: '',
    notes: '',
    cover: '',
  };
  const open = (over = {}, isNew = false) => {
    const onSave = vi.fn();
    const onDelete = vi.fn();
    openEditSheet({
      sheet,
      draft: { ...draft, ...over },
      isNew,
      today: '2024-06-01',
      onSave,
      onDelete,
    });
    return { onSave, onDelete, form: $('#book-form') };
  };

  test('switching status shows matching fields and fills today', () => {
    const { form } = open();
    expect(form.querySelector('.when-lido').hidden).toBe(true);
    form.querySelector('[data-status="lido"]').click();
    expect(form.querySelector('.when-lido').hidden).toBe(false);
    expect(form.elements.finishedAt.value).toBe('2024-06-01');
    form.querySelector('[data-status="lendo"]').click();
    expect(form.querySelector('.when-lendo').hidden).toBe(false);
    expect(form.elements.startedAt.value).toBe('2024-06-01');
  });

  test('rating toggles and saves the read form', () => {
    const { form, onSave } = open({ status: 'lido' });
    form.querySelector('[data-rating="4"]').click();
    expect(form.querySelectorAll('.starpick .on')).toHaveLength(4);
    form.querySelector('[data-rating="4"]').click();
    expect(form.querySelectorAll('.starpick .on')).toHaveLength(0);
    form.querySelector('[data-rating="5"]').click();
    form.elements.fisico.checked = true;
    form.requestSubmit();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, status: 'lido', fisico: true }),
      { coverChosen: false, coverCleared: false },
    );
  });

  test('blocks saving without a title', () => {
    const { form, onSave } = open({ title: '' }, true);
    form.requestSubmit();
    expect(onSave).not.toHaveBeenCalled();
    expect(form.elements.title.getAttribute('aria-invalid')).toBe('true');
    expect(form.querySelector('[data-action="delete"]')).toBeNull();
  });

  test('delete button reports the id', () => {
    const { form, onDelete } = open();
    form.querySelector('[data-action="delete"]').click();
    expect(onDelete).toHaveBeenCalledWith('b1');
  });

  test('readForm keeps fields that are not in the form', () => {
    const { form } = open({ cover: 'https://x/c.jpg' });
    expect(readForm(form, { cover: 'https://x/c.jpg' }, { status: 'quero', rating: 0 }).cover).toBe(
      'https://x/c.jpg',
    );
  });
});

describe('cover picker', () => {
  const base = {
    id: 'b1',
    title: 'Duna',
    author: 'Frank Herbert',
    status: 'quero',
    fisico: false,
    rating: 0,
    pages: 0,
    currentPage: 0,
    finishedAt: '',
    startedAt: '',
    notes: '',
    cover: '',
  };
  const open = (findCovers, over = {}) => {
    const onSave = vi.fn();
    openEditSheet({
      sheet,
      draft: { ...base, ...over },
      isNew: false,
      today: '2024-06-01',
      onSave,
      onDelete: vi.fn(),
      findCovers,
    });
    return { onSave, form: $('#book-form') };
  };

  test('searches with the current title/author and applies the chosen cover', async () => {
    const findCovers = vi.fn(async () => ({
      covers: ['https://c/1.jpg', 'https://c/2.jpg'],
      failed: false,
    }));
    const { form, onSave } = open(findCovers);
    form.elements.title.value = 'Duna Messias';
    $('[data-action="pick-cover"]').click();
    expect($('#cover-choices').textContent).toContain('Buscando capas');
    await vi.waitFor(() => expect(all('[data-cover-choice]')).toHaveLength(3));
    expect(findCovers).toHaveBeenCalledWith({ title: 'Duna Messias', author: 'Frank Herbert' });
    $('[data-cover-choice="1"]').click();
    expect($('.preview img').getAttribute('src')).toBe('https://c/2.jpg');
    expect($('#cover-choices').innerHTML).toBe('');
    form.requestSubmit();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ cover: 'https://c/2.jpg' }), {
      coverChosen: true,
      coverCleared: false,
    });
  });

  test('"Sem capa" removes the cover and is reported on save', async () => {
    const findCovers = vi.fn(async () => ({ covers: ['https://c/1.jpg'], failed: false }));
    const { form, onSave } = open(findCovers, { cover: 'https://old/c.jpg' });
    $('[data-action="pick-cover"]').click();
    await vi.waitFor(() => expect($('[data-cover-choice="none"]')).not.toBeNull());
    $('[data-cover-choice="none"]').click();
    expect($('.preview img')).toBeNull();
    form.requestSubmit();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ cover: '' }), {
      coverChosen: true,
      coverCleared: true,
    });
  });

  test('shows friendly messages for no results and failures', async () => {
    const findCovers = vi
      .fn()
      .mockResolvedValueOnce({ covers: [], failed: false })
      .mockResolvedValueOnce({ covers: [], failed: true });
    open(findCovers);
    $('[data-action="pick-cover"]').click();
    await vi.waitFor(() =>
      expect($('#cover-choices').textContent).toContain('Nenhuma capa encontrada'),
    );
    $('[data-action="pick-cover"]').click();
    await vi.waitFor(() => expect($('#cover-choices').textContent).toContain('Sem conexão'));
  });

  test('hides the button when cover search is unavailable', () => {
    open(undefined);
    expect($('[data-action="pick-cover"]')).toBeNull();
  });
});

describe('add sheet', () => {
  const flush = () => new Promise((r) => setTimeout(r, 0));

  test('resultsHtml messages', () => {
    expect(resultsHtml({ items: [], failed: true })).toContain('Sem conexão');
    expect(resultsHtml({ items: [], failed: false })).toContain('Nada encontrado');
    expect(
      resultsHtml({ items: [{ title: 'T', author: 'A', pages: 10, cover: '' }], failed: false }),
    ).toContain('10 páginas');
  });

  test('debounces typing and picks a result', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => ({
      items: [{ title: 'Hobbit', author: 'T', pages: 1, cover: '' }],
      failed: false,
    }));
    const onPick = vi.fn();
    openAddSheet({ sheet, search, onPick });
    const input = $('#add-q');
    input.value = 'hob';
    input.dispatchEvent(new Event('input'));
    input.value = 'hobbit';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(500);
    expect(search).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledWith('hobbit');
    $('[data-result="0"]').click();
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ title: 'Hobbit' }));
    vi.useRealTimers();
  });

  test('ignores stale responses and short queries; submit and manual work', async () => {
    let resolveFirst;
    const search = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockImplementation(async () => ({ items: [], failed: false }));
    const onPick = vi.fn();
    const { run } = openAddSheet({ sheet, search, onPick });
    const first = run('primeira');
    await run('segunda');
    resolveFirst({ items: [{ title: 'Velha', author: '', pages: 0, cover: '' }], failed: false });
    await first;
    expect($('#add-results').textContent).toContain('Nada encontrado');

    await run('a');
    expect($('#add-results').innerHTML).toBe('');

    $('#add-q').value = 'meu livro';
    $('#add-search').dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    $('[data-action="manual"]').click();
    expect(onPick).toHaveBeenCalledWith({ title: 'meu livro' });
  });
});

describe('menu sheet', () => {
  test('dispatches export and import', () => {
    const onExport = vi.fn();
    const onImport = vi.fn();
    openMenuSheet({ sheet, count: 3, onExport, onImport });
    expect($('#sheet-body').textContent).toContain('3 livros cadastrados');
    $('[data-action="export"]').click();
    $('[data-action="import"]').click();
    expect(onExport).toHaveBeenCalled();
    expect(onImport).toHaveBeenCalled();
  });

  test('shareOrDownload prefers the share sheet', async () => {
    const file = new File(['{}'], 'b.json');
    const share = vi.fn(async () => {});
    expect(await shareOrDownload(file, { nav: { canShare: () => true, share } })).toBe('shared');
    const cancel = vi.fn(async () => {
      throw new DOMException('x', 'AbortError');
    });
    expect(await shareOrDownload(file, { nav: { canShare: () => true, share: cancel } })).toBe(
      'cancelled',
    );
  });

  test('shareOrDownload falls back to a download link', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const failing = {
      canShare: () => true,
      share: async () => {
        throw new Error('nope');
      },
    };
    expect(await shareOrDownload(new File(['{}'], 'b.json'), { nav: failing })).toBe('downloaded');
    expect(await shareOrDownload(new File(['{}'], 'b.json'), { nav: {} })).toBe('downloaded');
    expect(click).toHaveBeenCalledTimes(2);
  });
});
