import { finalizeDraft } from '../domain/draft.js';
import { mergeBooks, removeBook, restoreBook, upsertBook } from '../domain/library.js';
import { parseBackup } from '../data/backup.js';
import { STATUS, normalizeBook } from '../domain/book.js';
import { todayISO } from '../lib/dates.js';

const TAB_FOR_STATUS = Object.freeze({
  [STATUS.READ]: 'lidos',
  [STATUS.READING]: 'lendo',
  [STATUS.WANT]: 'quero',
});

/** Where to show a freshly added book: stay on Estante when it belongs there. */
const tabAfterAdd = (currentTab, book) =>
  currentTab === 'estante' && book.fisico && book.status !== STATUS.READ
    ? 'estante'
    : TAB_FOR_STATUS[book.status];

/** All state changes go through here; UI code only calls these. */
export const createActions = ({ store, storage, notify, today = todayISO }) => {
  const setBooks = (books, extra = {}) => {
    store.update({ books, ...extra });
    if (!storage.saveBooks(books)) notify('Não consegui salvar no aparelho 😕');
  };

  const setTab = (tab) => {
    store.update({ tab });
    storage.savePref('tab', tab);
  };

  const saveBook = (draft) => {
    const book = finalizeDraft(draft, today());
    if (!book) return null;
    const { books, tab } = store.getState();
    const isNew = !books.some((b) => b.id === book.id);
    const year =
      book.status === STATUS.READ && book.finishedAt
        ? book.finishedAt.slice(0, 4)
        : store.getState().year;
    setBooks(upsertBook(books, book), { year });
    if (isNew) setTab(tabAfterAdd(tab, book));
    notify(isNew ? 'Livro adicionado ✨' : 'Salvo');
    return book;
  };

  const deleteBook = (id) => {
    const { list, removed, index } = removeBook(store.getState().books, id);
    if (!removed) return;
    setBooks(list);
    notify(`“${removed.title}” removido`, {
      actionLabel: 'Desfazer',
      onAction: () => setBooks(restoreBook(store.getState().books, removed, index)),
    });
  };

  /** Background cover lookup: silent, only touches the cover field. */
  const setCover = (id, cover) => {
    const { books } = store.getState();
    const book = books.find((b) => b.id === id);
    if (!book) return;
    setBooks(upsertBook(books, normalizeBook({ ...book, cover })));
  };

  /** Throws BackupError for unreadable files. Returns how many books were added. */
  const importBackup = (text) => {
    const { list, added } = mergeBooks(store.getState().books, parseBackup(text));
    setBooks(list);
    return added;
  };

  return { saveBook, deleteBook, setCover, importBackup, ...createViewActions(store, setTab) };
};

/** Actions that only change what is on screen (nothing is saved except the tab). */
const createViewActions = (store, setTab) => ({
  setTab,
  setYear: (year) => store.update({ year }),
  setQuery: (query) => store.update({ query }),
  toggleSearch: () => store.update((s) => ({ searchOpen: !s.searchOpen, query: '' })),
});
