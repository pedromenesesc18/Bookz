const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes a value for safe interpolation into HTML text and attributes. */
export const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** Lowercase, accent-free version of a string, for comparisons and search. */
export const foldText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Joins author names, dropping blanks and accent/case-insensitive duplicates. */
export const uniqueAuthors = (names) => {
  if (!Array.isArray(names)) return '';
  const cleaned = names.map((name) => String(name ?? '').trim()).filter(Boolean);
  const unique = cleaned.filter(
    (name, index) => cleaned.findIndex((other) => foldText(other) === foldText(name)) === index,
  );
  return unique.join(', ');
};

/** Trims a string and cuts it to `max` characters; non-strings become ''. */
export const clampText = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';
