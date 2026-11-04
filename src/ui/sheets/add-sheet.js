import { escapeHtml } from '../../lib/text.js';
import { coverHtml } from '../templates.js';

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

const ADD_HTML = `
<h2>Adicionar livro</h2>
<form class="search-form" role="search" id="add-search">
  <label class="sr-only" for="add-q">Buscar livro</label>
  <input class="field" id="add-q" type="search" placeholder="Título, autor ou ISBN" enterkeyhint="search" autocomplete="off">
</form>
<div id="add-results" aria-live="polite"></div>
<button type="button" class="ghost" data-action="manual">Adicionar manualmente</button>`;

/**
 * Search-as-you-type sheet. Only the latest query's answer is shown,
 * so slow responses can't overwrite newer results.
 */
export const openAddSheet = ({
  sheet,
  search,
  onPick,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) => {
  const root = sheet.open(ADD_HTML, { label: 'Adicionar livro' });
  const input = root.querySelector('#add-q');
  const out = root.querySelector('#add-results');
  let items = [];
  let latest = 0;
  let timer = null;

  const run = async (query) => {
    const ticket = ++latest;
    if (query.trim().length < 2) {
      out.innerHTML = '';
      return;
    }
    out.innerHTML = '<p class="hint">Buscando…</p>';
    const result = await search(query);
    if (ticket !== latest) return;
    items = result.items;
    out.innerHTML = resultsHtml(result);
  };

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
  root.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-result]');
    if (pick) onPick({ ...items[Number(pick.dataset.result)] });
    else if (e.target.closest('[data-action="manual"]')) onPick({ title: input.value.trim() });
  });

  setTimer(() => input.focus(), 250);
  return { run };
};
