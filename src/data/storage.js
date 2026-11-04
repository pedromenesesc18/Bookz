import { normalizeBook } from '../domain/book.js';

/** Same key as v1 so existing libraries keep working after the update. */
export const BOOKS_KEY = 'bookz.v1';
const PREF_PREFIX = 'bookz.';

const safeGet = (backend, key) => {
  try {
    return backend?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

export const createStorage = (backend = globalThis.localStorage) => {
  const readRaw = () => {
    try {
      const parsed = JSON.parse(safeGet(backend, BOOKS_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  /** Books whose id had to be regenerated are saved at once, so the new id sticks. */
  const loadBooks = () => {
    const raw = readRaw();
    const books = raw.map(normalizeBook).filter(Boolean);
    const repaired = books.some((book) => !raw.some((item) => item?.id === book.id));
    if (repaired) saveBooks(books);
    return books;
  };

  /** Returns false when the device refuses to save (full storage, private mode). */
  const saveBooks = (books) => {
    try {
      backend.setItem(BOOKS_KEY, JSON.stringify(books));
      return true;
    } catch {
      return false;
    }
  };

  const loadPref = (name, fallback) => safeGet(backend, PREF_PREFIX + name) ?? fallback;

  const savePref = (name, value) => {
    try {
      backend?.setItem(PREF_PREFIX + name, value);
    } catch {
      /* preferences are a convenience; ignore storage errors */
    }
  };

  return { loadBooks, saveBooks, loadPref, savePref };
};
