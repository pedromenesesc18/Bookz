import { normalizeBook } from '../../src/domain/book.js';

export const makeBook = (over = {}) => normalizeBook({ title: 'Livro', ...over });

export const memoryBackend = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
};

export const APP_HTML = `
  <div id="search-bar" hidden><input id="q"></div>
  <main id="view"></main>
  <button data-action="add">+</button>
  <button data-action="search">s</button>
  <button data-action="menu">m</button>
  <nav id="nav"></nav>
  <div id="backdrop"></div>
  <div id="sheet" aria-hidden="true"><div id="sheet-body"></div></div>
  <div id="toast"></div>
  <input type="file" id="import-file" hidden>`;
