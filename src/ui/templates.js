import { escapeHtml } from '../lib/text.js';
import { MAX_RATING } from '../domain/book.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const countBooks = (n) => plural(n, 'livro', 'livros');

export const coverHtml = (book, size = '') => {
  const initial = escapeHtml((book.title || '?').trim().charAt(0).toUpperCase());
  const img = book.cover
    ? `<img src="${escapeHtml(book.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-cover>`
    : '';
  return `<div class="cover ${size}" aria-hidden="true"><span class="cover-initial">${initial}</span>${img}</div>`;
};

export const starsHtml = (rating) => {
  if (!rating) return '';
  const stars = Array.from({ length: MAX_RATING }, (_, i) =>
    i < rating ? '★' : '<span class="off">★</span>',
  ).join('');
  return `<span class="stars" aria-label="${rating} de ${MAX_RATING} estrelas">${stars}</span>`;
};

export const progressHtml = (book) => {
  if (!book.pages || !book.currentPage) return '';
  const pct = Math.round((book.currentPage / book.pages) * 100);
  return `<div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso">
    <span style="--pct:${pct}%"></span></div><span class="meta">pág. ${book.currentPage} de ${book.pages} · ${pct}%</span>`;
};

export const tagHtml = (text) => `<span class="tag">${escapeHtml(text)}</span>`;

export const bookCard = (book, extra = '', cover = coverHtml(book)) =>
  `<li><button class="book" type="button" data-action="edit" data-id="${escapeHtml(book.id)}">
    ${cover}
    <span class="book-info">
      <span class="book-title">${escapeHtml(book.title)}</span>
      <span class="book-author">${escapeHtml(book.author)}</span>
      ${starsHtml(book.rating)}${extra}
    </span>
  </button></li>`;

export const bookList = (books, extraFor = () => '', coverFor = coverHtml) =>
  `<ul class="list">${books.map((b) => bookCard(b, extraFor(b), coverFor(b))).join('')}</ul>`;

export const emptyState = (icon, message) =>
  `<div class="empty"><div class="empty-icon" aria-hidden="true">${icon}</div><p>${message}</p></div>`;

export const statTiles = (tiles) =>
  `<dl class="stats">${tiles
    .map(
      ({ value, label, accent = '' }) =>
        `<div class="stat"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}${accent}</dd></div>`,
    )
    .join('')}</dl>`;

export const noResults = (query) =>
  emptyState('🔎', `Nada encontrado para “${escapeHtml(query)}”.`);
