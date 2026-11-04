import { uniqueAuthors } from '../lib/text.js';
import { normalizeBook } from '../domain/book.js';

export const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 12;
const DEFAULT_TIMEOUT_MS = 8000;

const GOOGLE_URL = 'https://www.googleapis.com/books/v1/volumes';
const OPEN_LIBRARY_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_FIELDS = 'title,author_name,cover_i,number_of_pages_median';

/** ISBN-10/13 queries get Google's isbn: operator for an exact match. */
export const buildGoogleQuery = (query) => {
  const compact = query.replace(/[\s-]/g, '');
  return /^(\d{9}[\dXx]|\d{13})$/.test(compact) ? `isbn:${compact}` : query;
};

export const mapGoogleVolume = (item) => {
  const v = item?.volumeInfo ?? {};
  const cover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? '';
  return {
    title: [v.title, v.subtitle].filter(Boolean).join(': '),
    author: uniqueAuthors(v.authors),
    pages: v.pageCount ?? 0,
    cover: cover.replace(/^http:/, 'https:').replace('&edge=curl', ''),
  };
};

export const mapOpenLibraryDoc = (doc) => ({
  title: doc?.title ?? '',
  author: uniqueAuthors(doc?.author_name),
  pages: doc?.number_of_pages_median ?? 0,
  cover: doc?.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
});

const fetchJson = async (url, fetchFn, timeoutMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

/** Search results are untrusted: keep only what normalizes into a valid book. */
const sanitize = (items) =>
  items
    .map(normalizeBook)
    .filter(Boolean)
    .map(({ title, author, pages, cover }) => ({ title, author, pages, cover }));

export const GOOGLE = {
  url: (q) =>
    `${GOOGLE_URL}?maxResults=${MAX_RESULTS}&printType=books&q=${encodeURIComponent(buildGoogleQuery(q))}`,
  pick: (json) => (Array.isArray(json?.items) ? json.items.map(mapGoogleVolume) : []),
};

export const OPEN_LIBRARY = {
  url: (q) =>
    `${OPEN_LIBRARY_URL}?limit=${MAX_RESULTS}&fields=${OPEN_LIBRARY_FIELDS}&q=${encodeURIComponent(q)}`,
  pick: (json) => (Array.isArray(json?.docs) ? json.docs.map(mapOpenLibraryDoc) : []),
};

const SOURCES = [GOOGLE, OPEN_LIBRARY];

/** Queries one source; throws on network/HTTP errors. Results are sanitized. */
export const querySource = async (
  source,
  query,
  { fetchFn = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) => sanitize(source.pick(await fetchJson(source.url(query), fetchFn, timeoutMs)));

/**
 * Searches Google Books, falling back to Open Library.
 * `failed` is true only when every source errored (offline, timeout…).
 */
export const searchBooks = async (
  rawQuery,
  { fetchFn = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) => {
  const query = String(rawQuery ?? '').trim();
  if (query.length < MIN_QUERY_LENGTH) return { items: [], failed: false };

  let errors = 0;
  for (const source of SOURCES) {
    try {
      const items = await querySource(source, query, { fetchFn, timeoutMs });
      if (items.length) return { items, failed: false };
    } catch {
      errors += 1;
    }
  }
  return { items: [], failed: errors === SOURCES.length };
};
