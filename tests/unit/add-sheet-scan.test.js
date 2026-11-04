import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createSheet } from '../../src/ui/sheet.js';
import { openAddSheet } from '../../src/ui/sheets/add-sheet.js';
import { APP_HTML } from './fixtures.js';

const $ = (s) => document.querySelector(s);
const all = (s) => [...document.querySelectorAll(s)];
let sheet;

beforeEach(() => {
  document.body.innerHTML = APP_HTML;
  sheet = createSheet({ sheet: $('#sheet'), body: $('#sheet-body'), backdrop: $('#backdrop') });
});

describe('sheet onClose', () => {
  test('runs when the sheet closes or another sheet replaces it', () => {
    const first = vi.fn();
    const second = vi.fn();
    sheet.open('<p>1</p>', { onClose: first });
    sheet.open('<p>2</p>', { onClose: second });
    expect(first).toHaveBeenCalledOnce();
    sheet.close();
    expect(second).toHaveBeenCalledOnce();
    sheet.close();
    expect(second).toHaveBeenCalledOnce();
  });
});

describe('barcode scanning in the add sheet', () => {
  const book = { title: 'O Hobbit', author: 'Tolkien', pages: 336, cover: '' };
  const openWithScan = (searchResult) => {
    let handlers;
    const controller = { start: vi.fn(async () => {}), stop: vi.fn() };
    const startScan = vi.fn((opts) => {
      handlers = opts;
      return controller;
    });
    const search = vi.fn(async () => searchResult);
    const onPick = vi.fn();
    openAddSheet({ sheet, search, onPick, startScan });
    return { startScan, controller, search, onPick, emit: () => handlers };
  };

  test('hides the scan button when scanning is unavailable', () => {
    openAddSheet({ sheet, search: vi.fn(), onPick: vi.fn() });
    expect($('[data-action="scan"]')).toBeNull();
  });

  test('a single match opens the book right away', async () => {
    const { startScan, controller, search, onPick, emit } = openWithScan({
      items: [book],
      failed: false,
    });
    $('[data-action="scan"]').click();
    expect($('#scan-panel').hidden).toBe(false);
    expect(startScan).toHaveBeenCalledWith(
      expect.objectContaining({ video: $('#scan-panel video') }),
    );
    expect(controller.start).toHaveBeenCalled();
    await emit().onIsbn('9780261102217');
    expect(search).toHaveBeenCalledWith('9780261102217');
    expect($('#add-q').value).toBe('9780261102217');
    expect($('#scan-panel').hidden).toBe(true);
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ title: 'O Hobbit' }));
  });

  test('several matches are listed to choose from', async () => {
    const { onPick, emit } = openWithScan({
      items: [book, { ...book, title: 'Outro' }],
      failed: false,
    });
    $('[data-action="scan"]').click();
    await emit().onIsbn('9780261102217');
    expect(onPick).not.toHaveBeenCalled();
    expect(all('[data-result]')).toHaveLength(2);
  });

  test('no match explains and offers manual entry', async () => {
    const { emit } = openWithScan({ items: [], failed: false });
    $('[data-action="scan"]').click();
    await emit().onIsbn('9780261102217');
    expect($('#add-results').textContent).toContain('Nada encontrado');
  });

  test('camera errors are shown and cancel stops the camera', () => {
    const { controller, emit } = openWithScan({ items: [], failed: false });
    $('[data-action="scan"]').click();
    emit().onError('permission');
    expect($('#scan-panel').textContent).toMatch(/permissão/i);
    $('[data-action="scan-cancel"]').click();
    expect(controller.stop).toHaveBeenCalled();
    expect($('#scan-panel').hidden).toBe(true);
  });

  test('closing the sheet turns the camera off', () => {
    const { controller } = openWithScan({ items: [], failed: false });
    $('[data-action="scan"]').click();
    sheet.close();
    expect(controller.stop).toHaveBeenCalled();
  });
});

describe('scan races', () => {
  test('closing the sheet while the ISBN search runs does not open the book', async () => {
    let finish;
    const search = vi.fn(() => new Promise((r) => (finish = r)));
    let handlers;
    const startScan = (opts) => {
      handlers = opts;
      return { start: vi.fn(), stop: vi.fn() };
    };
    const onPick = vi.fn();
    openAddSheet({ sheet, search, onPick, startScan });
    $('[data-action="scan"]').click();
    const pending = handlers.onIsbn('9780261102217');
    sheet.close();
    sheet.open('<p id="other">menu</p>');
    finish({ items: [{ title: 'X', author: '', pages: 0, cover: '' }], failed: false });
    await pending;
    expect(onPick).not.toHaveBeenCalled();
    expect($('#other')).not.toBeNull();
  });

  test('errors from a cancelled scan never show on the new one', () => {
    const calls = [];
    const startScan = (opts) => {
      calls.push(opts);
      return { start: vi.fn(), stop: vi.fn() };
    };
    openAddSheet({ sheet, search: vi.fn(), onPick: vi.fn(), startScan });
    $('[data-action="scan"]').click();
    $('[data-action="scan-cancel"]').click();
    $('[data-action="scan"]').click();
    calls[0].onError('failed');
    expect($('.scan-hint').classList.contains('scan-error')).toBe(false);
    calls[1].onError('permission');
    expect($('.scan-hint').classList.contains('scan-error')).toBe(true);
  });
});
