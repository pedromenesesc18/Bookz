import { createStore } from '../state/store.js';
import { createActions } from '../state/actions.js';
import { newDraft } from '../domain/draft.js';
import { backupFileName, serializeBackup } from '../data/backup.js';
import { todayISO } from '../lib/dates.js';
import { escapeHtml } from '../lib/text.js';
import { readFileText } from '../lib/files.js';
import { ICONS } from './icons.js';
import { createSheet } from './sheet.js';
import { createToast } from './toast.js';
import { TABS, DEFAULT_TAB, isTab, renderTab } from './views/index.js';
import { resolveYear } from './views/read-view.js';
import { openAddSheet } from './sheets/add-sheet.js';
import { openEditSheet } from './sheets/edit-sheet.js';
import { openMenuSheet, shareOrDownload } from './sheets/menu-sheet.js';

const navHtml = (tab) =>
  TABS.map(
    (t) =>
      `<button type="button" data-tab="${t.id}" ${t.id === tab ? 'aria-current="page"' : ''}>${ICONS[t.id]}<span>${escapeHtml(t.label)}</span></button>`,
  ).join('');

const queryDom = (doc) => ({
  view: doc.getElementById('view'),
  nav: doc.getElementById('nav'),
  searchBar: doc.getElementById('search-bar'),
  searchInput: doc.getElementById('q'),
  importFile: doc.getElementById('import-file'),
});

const initialState = (storage) => {
  const savedTab = storage.loadPref('tab', DEFAULT_TAB);
  return {
    books: storage.loadBooks(),
    tab: isTab(savedTab) ? savedTab : DEFAULT_TAB,
    year: null,
    query: '',
    searchOpen: false,
  };
};

const createRenderer =
  (dom, doc) =>
  (state, prev = {}) => {
    dom.view.innerHTML = renderTab({ ...state, year: resolveYear(state.books, state.year) });
    dom.view.dataset.tab = state.tab;
    dom.nav.innerHTML = navHtml(state.tab);
    dom.searchBar.hidden = !state.searchOpen;
    if (state.searchOpen && !prev.searchOpen) {
      dom.searchInput.value = '';
      dom.searchInput.focus();
    }
    if (prev.tab && state.tab !== prev.tab) doc.defaultView?.scrollTo?.(0, 0);
  };

/** Sheet flows: add (search) → edit form, backup menu. */
const createFlows = ({ ctx, search, today, now }) => {
  const { store, actions, sheet, toast, dom, doc } = ctx;

  const openEdit = (draft, isNew) =>
    openEditSheet({
      sheet,
      draft,
      isNew,
      today: today(),
      onSave: (d) => actions.saveBook(d) && sheet.close(),
      onDelete: (id) => {
        sheet.close();
        actions.deleteBook(id);
      },
    });

  const exportBackup = () => {
    const data = serializeBackup(store.getState().books, now());
    const file = new File([data], backupFileName(now()), { type: 'application/json' });
    return shareOrDownload(file, { doc });
  };

  const importBackup = async (file) => {
    try {
      const added = actions.importBackup(await readFileText(file));
      sheet.close();
      toast.show(added === 1 ? '1 livro importado' : `${added} livros importados`);
    } catch (err) {
      toast.show(err?.message || 'Arquivo inválido');
    }
  };

  return {
    openEdit,
    exportBackup,
    importBackup,
    openAdd: () =>
      openAddSheet({
        sheet,
        search,
        onPick: (seed) => openEdit(newDraft(store.getState().tab, today(), seed), true),
      }),
    openMenu: () =>
      openMenuSheet({
        sheet,
        count: store.getState().books.length,
        onExport: exportBackup,
        onImport: () => dom.importFile.click(),
      }),
  };
};

const bindEvents = ({ store, actions, dom, doc }, flows) => {
  const handlers = {
    add: flows.openAdd,
    search: actions.toggleSearch,
    menu: flows.openMenu,
    year: (el) => actions.setYear(el.dataset.year),
    edit: (el) => {
      const book = store.getState().books.find((b) => b.id === el.dataset.id);
      if (book) flows.openEdit(book, false);
    },
  };

  doc.addEventListener('click', (e) => {
    const tab = e.target.closest('#nav [data-tab]')?.dataset.tab;
    if (tab) return actions.setTab(tab);
    const el = e.target.closest('[data-action]');
    // Sheets handle their own actions.
    if (el && !el.closest('#sheet')) handlers[el.dataset.action]?.(el);
  });
  dom.searchInput.addEventListener('input', () => actions.setQuery(dom.searchInput.value));
  dom.importFile.addEventListener('change', async () => {
    const [file] = dom.importFile.files;
    if (file) await flows.importBackup(file);
    dom.importFile.value = '';
  });
  // Broken cover images fall back to the initial letter underneath.
  doc.addEventListener(
    'error',
    (e) => e.target.matches?.('img[data-cover]') && e.target.remove(),
    true,
  );
};

/** Wires the store, actions and DOM together. Dependencies are injected for tests. */
export const mountApp = ({
  doc = document,
  storage,
  search,
  today = todayISO,
  now = () => new Date(),
}) => {
  const dom = queryDom(doc);
  const store = createStore(initialState(storage));
  const toast = createToast(doc.getElementById('toast'));
  const sheet = createSheet({
    sheet: doc.getElementById('sheet'),
    body: doc.getElementById('sheet-body'),
    backdrop: doc.getElementById('backdrop'),
    doc,
  });
  const actions = createActions({ store, storage, today, notify: toast.show });
  const ctx = { store, actions, sheet, toast, dom, doc };
  const flows = createFlows({ ctx, search, today, now });

  bindEvents(ctx, flows);
  const render = createRenderer(dom, doc);
  store.subscribe(render);
  render(store.getState());
  return { ...ctx, ...flows };
};
