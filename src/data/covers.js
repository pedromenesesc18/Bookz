import { foldText } from '../lib/text.js';
import { GOOGLE, OPEN_LIBRARY, querySource } from './search.js';

export const MAX_COVER_CHOICES = 8;
// Open Library first: no daily quota and larger covers.
const COVER_SOURCES = [OPEN_LIBRARY, GOOGLE];

// Leading articles differ between editions/translations ("O Hobbit" × "The Hobbit").
const LEADING_ARTICLE = /^(o|a|os|as|um|uma|the|an|el|la|los|las|le|les|l')\s+/;
const MIN_TITLE_LENGTH = 3;

const mainTitle = (title) => {
  const main = foldText(title)
    .split(/[:(—–-]/)[0]
    .trim()
    .replace(LEADING_ARTICLE, '');
  return main.length >= MIN_TITLE_LENGTH ? main : '';
};

const startsWithWords = (long, short) => long === short || long.startsWith(`${short} `);

/**
 * True when two titles look like the same work: ignores accents, case, subtitles
 * and a leading article, and compares whole words from the start ("Duna" ≠ "Filhos de Duna").
 */
export const isSameBook = (a, b) => {
  const x = mainTitle(a);
  const y = mainTitle(b);
  return Boolean(x && y) && (startsWithWords(x, y) || startsWithWords(y, x));
};

/**
 * Looks up cover candidates for a book in every source.
 * `strict` (default) keeps only matching titles, for automatic use.
 * `failed`: every source errored (offline, quota…). `partial`: at least one did.
 */
export const findCovers = async (
  { title = '', author = '' },
  { strict = true, ...options } = {},
) => {
  if (!title.trim()) return { covers: [], failed: false, partial: false };
  const query = `${title} ${author}`.trim();
  const results = await Promise.allSettled(
    COVER_SOURCES.map((s) => querySource(s, query, options)),
  );
  const items = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((item) => item.cover);
  const matching = items.filter((item) => isSameBook(title, item.title));
  // Loose mode (the user picks by eye): other editions/translations come after matches.
  const ranked = strict ? matching : [...matching, ...items];
  return {
    covers: [...new Set(ranked.map((item) => item.cover))].slice(0, MAX_COVER_CHOICES),
    failed: results.every((r) => r.status === 'rejected'),
    partial: results.some((r) => r.status === 'rejected'),
  };
};

export const findCover = async (book, options) => {
  const { covers, failed, partial } = await findCovers(book, options);
  return { cover: covers[0] ?? '', failed, partial };
};
