const BOOK_PREFIXES = ['978', '979'];

const validEan13 = (digits) => {
  const sum = [...digits.slice(0, 12)].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits[12]);
};

const validIsbn10 = (code) => {
  const sum = [...code].reduce((acc, c, i) => acc + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
  return sum % 11 === 0;
};

/**
 * Turns a scanned/typed code into a valid ISBN, or null.
 * Only "Bookland" EAN-13 (978/979) or ISBN-10, with a correct check digit.
 */
export const isbnFromBarcode = (raw) => {
  const code = String(raw ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase();
  if (/^\d{13}$/.test(code)) {
    return BOOK_PREFIXES.includes(code.slice(0, 3)) && validEan13(code) ? code : null;
  }
  if (/^\d{9}[\dX]$/.test(code)) return validIsbn10(code) ? code : null;
  return null;
};
