import { STATUS, normalizeBook } from './book.js';

/** Initial values for a new book, depending on the tab the user is on. */
export const newDraft = (tab, today, seed = {}) => {
  const status = tab === 'lendo' ? STATUS.READING : tab === 'lidos' ? STATUS.READ : STATUS.WANT;
  return withStatus(
    { title: '', author: '', rating: 0, fisico: tab === 'estante', ...seed, status },
    status,
    today,
  );
};

/** Changing status fills the date that makes sense for it, never overwriting one. */
export const withStatus = (draft, status, today) => ({
  ...draft,
  status,
  finishedAt: status === STATUS.READ ? draft.finishedAt || today : draft.finishedAt,
  startedAt: status === STATUS.READING ? draft.startedAt || today : draft.startedAt,
});

/** Validates a draft into a Book; dates that don't apply to the status are cleared. */
export const finalizeDraft = (draft, today) => {
  const isRead = draft.status === STATUS.READ;
  return normalizeBook({
    ...draft,
    finishedAt: isRead ? draft.finishedAt : '',
    currentPage: isRead ? 0 : draft.currentPage,
    addedAt: draft.addedAt || today,
  });
};
