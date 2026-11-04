export const MONTHS = Object.freeze([
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]);

const pad = (n) => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD in the device's local time zone. */
export const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** True for real calendar dates written as YYYY-MM-DD. */
export const isISODate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

/** "2024-03-05" → "5 de março". */
export const formatDayMonth = (iso) => {
  if (!isISODate(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${Number(d)} de ${MONTHS[Number(m) - 1]}`;
};

/** "03" → "março"; anything else → "sem mês". */
export const monthName = (mm) => MONTHS[Number(mm) - 1] ?? 'sem mês';
