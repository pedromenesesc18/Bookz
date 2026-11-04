import { readingBooks, shelfBooks, shelfSummary, wantBooks } from '../../domain/library.js';
import { formatDayMonth } from '../../lib/dates.js';
import {
  bookList,
  countBooks,
  emptyState,
  noResults,
  progressHtml,
  statTiles,
  tagHtml,
} from '../templates.js';

const listOrEmpty = (books, query, empty, extraFor) => {
  if (books.length) return bookList(books, extraFor);
  return query.trim() ? noResults(query) : empty;
};

export const renderReadingView = ({ books, query }) =>
  listOrEmpty(
    readingBooks(books, query),
    query,
    emptyState('📖', 'Nenhum livro em andamento.<br>Toque no + pra começar um.'),
    (b) =>
      progressHtml(b) ||
      (b.startedAt ? `<span class="meta">desde ${formatDayMonth(b.startedAt)}</span>` : ''),
  );

export const renderWantView = ({ books, query }) => {
  const list = wantBooks(books, query);
  const header = list.length ? `<p class="lead">${countBooks(list.length)} na lista</p>` : '';
  return (
    header +
    listOrEmpty(list, query, emptyState('💭', 'Sua lista de desejos tá vazia.'), (b) =>
      b.fisico ? tagHtml('tenho físico') : '',
    )
  );
};

export const renderShelfView = ({ books, query }) => {
  const { unread, read, total } = shelfSummary(books);
  if (!total) {
    return emptyState(
      '📚',
      'Nenhum livro físico ainda.<br>Marque “tenho o livro físico” ao adicionar.',
    );
  }
  const stats = statTiles([
    { value: unread, label: 'pra ler' },
    { value: read, label: 'já lidos' },
    { value: total, label: 'na estante' },
  ]);
  const empty = emptyState('🎉', 'Você já leu todos os livros da estante!');
  return (
    stats +
    listOrEmpty(shelfBooks(books, query), query, empty, (b) =>
      b.status === 'lendo' ? tagHtml('lendo agora') : '',
    )
  );
};
