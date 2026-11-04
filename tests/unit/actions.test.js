import { describe, expect, test, vi } from 'vitest';
import { createStore } from '../../src/state/store.js';
import { createActions } from '../../src/state/actions.js';
import { makeBook } from './fixtures.js';

const setup = (books = [], tab = 'lidos', saveOk = true) => {
  const store = createStore({ books, tab, year: null, query: '', searchOpen: false });
  const storage = { saveBooks: vi.fn(() => saveOk), savePref: vi.fn() };
  const notify = vi.fn();
  const actions = createActions({ store, storage, notify, today: () => '2024-06-01' });
  return { store, storage, notify, actions };
};

describe('saveBook', () => {
  test('adds a new book, persists it and switches to its tab', () => {
    const { store, storage, notify, actions } = setup();
    actions.saveBook({ title: 'Novo', status: 'lendo' });
    expect(store.getState().books).toHaveLength(1);
    expect(store.getState().tab).toBe('lendo');
    expect(storage.saveBooks).toHaveBeenCalled();
    expect(storage.savePref).toHaveBeenCalledWith('tab', 'lendo');
    expect(notify).toHaveBeenCalledWith('Livro adicionado ✨');
  });

  test('stays on Estante when the new book is an unread physical copy', () => {
    const { store, actions } = setup([], 'estante');
    actions.saveBook({ title: 'Físico', status: 'quero', fisico: true });
    expect(store.getState().tab).toBe('estante');
  });

  test('selects the finish year for read books', () => {
    const { store, actions } = setup();
    actions.saveBook({ title: 'Lido', status: 'lido', finishedAt: '2019-02-02' });
    expect(store.getState().year).toBe('2019');
  });

  test('updates an existing book without changing tab', () => {
    const book = makeBook({ id: 'b1', title: 'Velho', status: 'quero' });
    const { store, notify, actions } = setup([book], 'quero');
    actions.saveBook({ ...book, title: 'Novo título', status: 'lendo' });
    expect(store.getState().books[0].title).toBe('Novo título');
    expect(store.getState().tab).toBe('quero');
    expect(notify).toHaveBeenCalledWith('Salvo');
  });

  test('ignores drafts without title', () => {
    const { store, actions } = setup();
    expect(actions.saveBook({ title: '' })).toBeNull();
    expect(store.getState().books).toEqual([]);
  });

  test('warns when the device cannot save', () => {
    const { notify, actions } = setup([], 'lidos', false);
    actions.saveBook({ title: 'X' });
    expect(notify).toHaveBeenCalledWith('Não consegui salvar no aparelho 😕');
  });
});

describe('deleteBook', () => {
  test('removes the book and offers undo that restores it', () => {
    const books = [makeBook({ id: 'a' }), makeBook({ id: 'b', title: 'Bê' })];
    const { store, notify, actions } = setup(books);
    actions.deleteBook('b');
    expect(store.getState().books.map((x) => x.id)).toEqual(['a']);
    const [message, options] = notify.mock.calls[0];
    expect(message).toBe('“Bê” removido');
    options.onAction();
    expect(store.getState().books.map((x) => x.id)).toEqual(['a', 'b']);
  });

  test('does nothing for unknown ids', () => {
    const { notify, actions } = setup();
    actions.deleteBook('nope');
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('importBackup', () => {
  test('merges new books and returns the count', () => {
    const { store, actions } = setup([makeBook({ id: 'a' })]);
    const added = actions.importBackup(
      JSON.stringify([
        { id: 'a', title: 'A' },
        { id: 'z', title: 'Z' },
      ]),
    );
    expect(added).toBe(1);
    expect(store.getState().books).toHaveLength(2);
  });

  test('throws for invalid files', () => {
    const { actions } = setup();
    expect(() => actions.importBackup('nope')).toThrow();
  });
});

describe('view state', () => {
  test('setYear, setQuery and toggleSearch update state', () => {
    const { store, actions } = setup();
    actions.setYear('2020');
    actions.setQuery('abc');
    expect(store.getState()).toMatchObject({ year: '2020', query: 'abc' });
    actions.toggleSearch();
    expect(store.getState()).toMatchObject({ searchOpen: true, query: '' });
  });
});

describe('setCover', () => {
  test('updates only the cover, validates the URL and persists', () => {
    const book = makeBook({ id: 'c1', title: 'Capa' });
    const { store, storage, notify, actions } = setup([book]);
    actions.setCover('c1', 'http://covers.example/x.jpg');
    expect(store.getState().books[0]).toMatchObject({
      title: 'Capa',
      cover: 'https://covers.example/x.jpg',
    });
    expect(storage.saveBooks).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    actions.setCover('c1', 'javascript:alert(1)');
    expect(store.getState().books[0].cover).toBe('');
  });

  test('ignores unknown books', () => {
    const { storage, actions } = setup([]);
    actions.setCover('nope', 'https://x/y.jpg');
    expect(storage.saveBooks).not.toHaveBeenCalled();
  });
});

describe('lastShelved (arrival animation)', () => {
  test('is set for new books and for books just finished, cleared otherwise', () => {
    const old = makeBook({ id: 'o1', title: 'Velho', status: 'lendo' });
    const { store, actions } = setup([old]);
    const added = actions.saveBook({ title: 'Novo', status: 'quero' });
    expect(store.getState().lastShelved).toBe(added.id);
    actions.saveBook({ ...old, notes: 'nota' });
    expect(store.getState().lastShelved).toBeNull();
    actions.saveBook({ ...old, status: 'lido', finishedAt: '2024-01-01' });
    expect(store.getState().lastShelved).toBe('o1');
  });
});
