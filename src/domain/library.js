import { foldText } from '../lib/text.js';
import { STATUS } from './book.js';

/** Year bucket for read books without a finish date. */
export const NO_DATE = '????';
const NO_MONTH = '??';

const byTitle = (a, b) => a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });

/* ---------- immutable list operations ---------- */

export const upsertBook = (list, book) =>
  list.some((x) => x.id === book.id)
    ? list.map((x) => (x.id === book.id ? book : x))
    : [...list, book];

export const removeBook = (list, id) => {
  const index = list.findIndex((x) => x.id === id);
  if (index < 0) return { list, removed: null, index: -1 };
  return { list: list.filter((x) => x.id !== id), removed: list[index], index };
};

export const restoreBook = (list, book, index) => {
  if (list.some((x) => x.id === book.id)) return list;
  const at = Math.min(Math.max(index, 0), list.length);
  return [...list.slice(0, at), book, ...list.slice(at)];
};

/** Adds incoming books whose ids are not yet in the list. */
export const mergeBooks = (list, incoming) => {
  const seen = new Set(list.map((x) => x.id));
  const fresh = incoming.filter((book) => {
    if (seen.has(book.id)) return false;
    seen.add(book.id);
    return true;
  });
  return { list: [...list, ...fresh], added: fresh.length };
};

/* ---------- selectors ---------- */

export const matchesQuery = (book, query) => {
  const q = foldText(query).trim();
  return !q || foldText(`${book.title} ${book.author}`).includes(q);
};

const filterBy = (list, query, predicate) =>
  list.filter((book) => predicate(book) && matchesQuery(book, query));

export const readingBooks = (list, query) =>
  filterBy(list, query, (b) => b.status === STATUS.READING);

export const wantBooks = (list, query) =>
  filterBy(list, query, (b) => b.status === STATUS.WANT).sort(
    (a, b) => Number(b.fisico) - Number(a.fisico) || byTitle(a, b),
  );

const isUnreadPhysical = (b) => b.fisico && b.status !== STATUS.READ;

export const shelfBooks = (list, query) => filterBy(list, query, isUnreadPhysical).sort(byTitle);

export const shelfSummary = (list) => {
  const total = list.filter((b) => b.fisico).length;
  const unread = list.filter(isUnreadPhysical).length;
  return { unread, read: total - unread, total };
};

const yearOf = (book) => book.finishedAt.slice(0, 4) || NO_DATE;
const monthOf = (book) => book.finishedAt.slice(5, 7) || NO_MONTH;
const readOnly = (list) => list.filter((b) => b.status === STATUS.READ);

/** Years with read books, newest first; undated books go last. */
export const readYears = (list) => {
  const years = [...new Set(readOnly(list).map(yearOf))];
  const dated = years
    .filter((y) => y !== NO_DATE)
    .sort()
    .reverse();
  return years.includes(NO_DATE) ? [...dated, NO_DATE] : dated;
};

/** Read books of a year grouped by month, newest month and newest book first. */
export const readByMonth = (list, year, query) => {
  const books = filterBy(readOnly(list), query, (b) => yearOf(b) === year);
  const months = [...new Set(books.map(monthOf))].sort().reverse();
  return months.map((month) => ({
    month,
    books: books
      .filter((b) => monthOf(b) === month)
      .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)),
  }));
};

export const yearStats = (books) => {
  const rated = books.filter((b) => b.rating > 0);
  const avg = rated.length ? rated.reduce((sum, b) => sum + b.rating, 0) / rated.length : null;
  return {
    count: books.length,
    pages: books.reduce((sum, b) => sum + b.pages, 0),
    avgRating: avg === null ? null : Math.round(avg * 10) / 10,
  };
};
