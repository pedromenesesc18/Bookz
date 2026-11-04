import { clampText } from '../lib/text.js';
import { isISODate } from '../lib/dates.js';
import { createId, isValidId } from '../lib/id.js';

export const STATUS = Object.freeze({ READ: 'lido', READING: 'lendo', WANT: 'quero' });
const STATUSES = Object.values(STATUS);

/**
 * Safety caps against absurd input only. They are far above anything v1 could
 * realistically have stored, so existing libraries are never truncated.
 */
export const LIMITS = Object.freeze({
  title: 2000,
  author: 2000,
  notes: 200000,
  url: 4000,
  pages: 99999,
});
export const MAX_RATING = 5;

const toInt = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const toRating = (value) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? clamp(n, 0, MAX_RATING) : 0;
};

/** Only http(s) URLs are allowed; http is upgraded so covers load on HTTPS pages. */
export const safeCoverUrl = (value) => {
  if (typeof value !== 'string' || value.length > LIMITS.url) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    url.protocol = 'https:';
    return url.href;
  } catch {
    return '';
  }
};

const dateOrEmpty = (value) => (isISODate(value) ? value : '');

/**
 * Turns any untrusted object (storage, backup, form) into a valid Book,
 * or null when it has no title. Never mutates the input.
 */
export const normalizeBook = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const title = clampText(raw.title, LIMITS.title);
  if (!title) return null;

  const pages = clamp(toInt(raw.pages), 0, LIMITS.pages);
  const currentPage = clamp(toInt(raw.currentPage), 0, pages || LIMITS.pages);

  return Object.freeze({
    id: isValidId(raw.id) ? raw.id : createId(),
    title,
    author: clampText(raw.author, LIMITS.author),
    status: STATUSES.includes(raw.status) ? raw.status : STATUS.WANT,
    fisico: Boolean(raw.fisico),
    rating: toRating(raw.rating),
    pages,
    currentPage,
    finishedAt: dateOrEmpty(raw.finishedAt),
    startedAt: dateOrEmpty(raw.startedAt),
    addedAt: dateOrEmpty(raw.addedAt),
    notes: clampText(raw.notes, LIMITS.notes),
    cover: safeCoverUrl(raw.cover),
  });
};
