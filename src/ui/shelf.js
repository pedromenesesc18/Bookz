import { fallbackSpineColor, shelfOrder, spineSize } from '../domain/spine.js';
import { NO_DATE } from '../domain/library.js';
import { escapeHtml } from '../lib/text.js';

const PROGRESS_MAX = 100;

/**
 * One book spine. Covers from hosts that allow it get their real color later
 * (see spine-colors.js); until then the title-based color is used.
 */
export const spineHtml = (book, { arrive = false, out = false } = {}) => {
  const { height, width } = spineSize(book.pages);
  const classes = ['spine', arrive && 'arrive', out && 'out'].filter(Boolean).join(' ');
  const coverAttr = book.cover ? ` data-spine-cover="${escapeHtml(book.cover)}"` : '';
  return `<button type="button" class="${classes}" data-action="edit" data-id="${escapeHtml(book.id)}"${coverAttr}
    aria-label="${escapeHtml(book.title)}" style="--h:${height}px;--w:${width}px;--spine:${fallbackSpineColor(book.title)}">
    <span class="spine-title">${escapeHtml(book.title)}</span></button>`;
};

const plural = (n) => (n === 1 ? '1 lido' : `${n} lidos`);

/** The year's trophy shelf on the Lidos tab. */
export const yearShelfHtml = (books, year, arrivedId) => {
  if (!books.length) return '';
  const label = escapeHtml(year === NO_DATE ? 'Prateleira sem data' : `Prateleira de ${year}`);
  const spines = shelfOrder(books)
    .map((b) => spineHtml(b, { arrive: b.id === arrivedId }))
    .join('');
  return `<section class="shelf" aria-label="${label}">
    <p class="shelf-label">${label} · ${plural(books.length)}</p>
    <div class="shelf-row">${spines}</div></section>`;
};

/** Wall of shelves on the Estante tab; books being read stick out a little. */
export const shelfWallHtml = (books, arrivedId) =>
  `<div class="shelf-wall" role="list">${books
    .map(
      (b) =>
        `<div class="shelf-slot" role="listitem">${spineHtml(b, { arrive: b.id === arrivedId, out: b.status === 'lendo' })}</div>`,
    )
    .join('')}</div>`;

const progressOf = (book) =>
  book.pages && book.currentPage
    ? Math.min(PROGRESS_MAX, Math.round((book.currentPage / book.pages) * PROGRESS_MAX))
    : 0;

/** A book pulled out of the shelf, tilted, with a bookmark ribbon at the reading depth. */
export const deskBookHtml = (book) => {
  // The titled front stays underneath, so a cover that fails to load leaves it visible.
  const front = `<span class="desk-front" style="--spine:${fallbackSpineColor(book.title)}">${escapeHtml(book.title)}</span>`;
  const img = book.cover
    ? `<img src="${escapeHtml(book.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-cover>`
    : '';
  return `<span class="desk-book" aria-hidden="true">${front}${img}<span class="ribbon" style="--progress:${progressOf(book)}%"></span></span>`;
};
