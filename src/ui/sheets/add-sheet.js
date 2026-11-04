import { escapeHtml } from '../../lib/text.js';
import { coverHtml } from '../templates.js';
import { createScanPanel, scanButtonHtml } from './scan-panel.js';

export const SEARCH_DEBOUNCE_MS = 450;

const resultItem = (book, index) =>
  `<li><button type="button" class="book" data-result="${index}">${coverHtml(book)}
    <span class="book-info"><span class="book-title">${escapeHtml(book.title)}</span>
    <span class="book-author">${escapeHtml(book.author)}</span>
    ${book.pages ? `<span class="meta">${book.pages} páginas</span>` : ''}</span></button></li>`;

export const resultsHtml = ({ items, failed }) => {
  if (failed)
    return '<p class="hint">Sem conexão com a busca agora. Você pode adicionar manualmente.</p>';
  if (!items.length) return '<p class="hint">Nada encontrado. Tente adicionar manualmente.</p>';
  return `<ul class="list results">${items.map(resultItem).join('')}</ul>`;
};

const addHtml = (canScan) => `
<h2>Adicionar livro</h2>
${canScan ? scanButtonHtml : ''}
<form class="search-form" role="search" id="add-search">
  <label class="sr-only" for="add-q">Buscar livro</label>
  <input class="field" id="add-q" type="search" placeholder="Título, autor ou ISBN" enterkeyhint="search" autocomplete="off">
</form>
<div id="scan-panel" class="scan-panel" hidden></div>
<div id="add-results" aria-live="polite"></div>
<button type="button" class="ghost" data-action="manual">Adicionar manualmente</button>`;

/** Runs searches into `out`; only the latest query's answer is shown. */
const createSearchRunner = (out, search, isClosed) => {
  let items = [];
  let latest = 0;
  const run = async (query) => {
    const ticket = ++latest;
    if (query.trim().length < 2) {
      out.innerHTML = '';
      return null;
    }
    out.innerHTML = '<p class="hint">Buscando…</p>';
    const result = await search(query);
    // Ignore stale answers, and answers that arrive after the sheet closed.
    if (ticket !== latest || isClosed()) return null;
    items = result.items;
    out.innerHTML = resultsHtml(result);
    return result;
  };
  return { run, item: (index) => ({ ...items[index] }) };
};

/** Debounced search while typing; Enter searches at once. */
const bindSearchInput = ({ root, input, run, setTimer, clearTimer }) => {
  let timer = null;
  input.addEventListener('input', () => {
    clearTimer(timer);
    timer = setTimer(() => run(input.value), SEARCH_DEBOUNCE_MS);
  });
  root.querySelector('#add-search').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimer(timer);
    input.blur();
    run(input.value);
  });
};

/**
 * Search-as-you-type sheet. Only the latest query's answer is shown,
 * so slow responses can't overwrite newer results.
 */
export const openAddSheet = ({
  sheet,
  search,
  onPick,
  startScan,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) => {
  let panel = null;
  let closed = false;
  const root = sheet.open(addHtml(Boolean(startScan)), {
    label: 'Adicionar livro',
    onClose: () => {
      closed = true;
      panel?.stop();
    },
  });
  const input = root.querySelector('#add-q');
  const { run, item } = createSearchRunner(
    root.querySelector('#add-results'),
    search,
    () => closed,
  );

  /** A scanned ISBN is searched; a single match opens the book right away. */
  const onIsbn = async (isbn) => {
    input.value = isbn;
    const result = await run(isbn);
    if (result?.items.length === 1) onPick({ ...result.items[0] });
  };

  if (startScan) {
    panel = createScanPanel({ container: root.querySelector('#scan-panel'), startScan, onIsbn });
  }

  bindSearchInput({ root, input, run, setTimer, clearTimer });
  root.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-result]');
    if (e.target.closest('[data-action="scan"]')) panel.open();
    else if (e.target.closest('[data-action="scan-cancel"]')) panel.stop();
    else if (pick) onPick(item(Number(pick.dataset.result)));
    else if (e.target.closest('[data-action="manual"]')) onPick({ title: input.value.trim() });
  });

  setTimer(() => input.focus(), 250);
  return { run };
};
