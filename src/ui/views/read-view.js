import { NO_DATE, readByMonth, readYears, yearStats } from '../../domain/library.js';
import { monthName } from '../../lib/dates.js';
import { escapeHtml } from '../../lib/text.js';
import { bookList, countBooks, emptyState, noResults, statTiles } from '../templates.js';

const yearLabel = (y) => (y === NO_DATE ? 'Sem data' : y);

const yearChips = (years, current) =>
  `<div class="chips" role="tablist" aria-label="Ano">${years
    .map(
      (y) =>
        `<button type="button" role="tab" class="chip" aria-selected="${y === current}" data-action="year" data-year="${escapeHtml(y)}">${yearLabel(y)}</button>`,
    )
    .join('')}</div>`;

const statsFor = (books) => {
  const { count, pages, avgRating } = yearStats(books);
  return statTiles([
    { value: count, label: count === 1 ? 'livro' : 'livros' },
    { value: pages ? pages.toLocaleString('pt-BR') : '–', label: 'páginas' },
    {
      value: avgRating === null ? '–' : avgRating.toLocaleString('pt-BR'),
      label: 'nota média',
      accent: avgRating === null ? '' : '<span class="star-accent"> ★</span>',
    },
  ]);
};

const monthSection = ({ month, books }) =>
  `<section class="month"><h2>${monthName(month)}<small>${countBooks(books.length)}</small></h2>${bookList(books)}</section>`;

/** The year actually shown: the selected one if it still exists, else the newest. */
export const resolveYear = (books, year) => {
  const years = readYears(books);
  return years.includes(year) ? year : (years[0] ?? null);
};

export const renderReadView = ({ books, year, query }) => {
  const years = readYears(books);
  if (!years.length)
    return emptyState('✨', 'Nenhum livro lido ainda.<br>Toque no + pra adicionar o primeiro.');
  const current = resolveYear(books, year);
  const groups = readByMonth(books, current, query);
  const all = groups.flatMap((g) => g.books);
  const body = all.length ? groups.map(monthSection).join('') : noResults(query);
  return yearChips(years, current) + statsFor(all) + body;
};
