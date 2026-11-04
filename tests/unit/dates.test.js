import { describe, expect, test } from 'vitest';
import { MONTHS, todayISO, isISODate, formatDayMonth, monthName } from '../../src/lib/dates.js';

describe('todayISO', () => {
  test('uses the local calendar day, not UTC', () => {
    // 23:30 local time must still be the same day
    expect(todayISO(new Date(2024, 2, 5, 23, 30))).toBe('2024-03-05');
  });
  test('pads month and day', () => {
    expect(todayISO(new Date(2024, 0, 9))).toBe('2024-01-09');
  });
});

describe('isISODate', () => {
  test.each([
    ['2024-03-05', true],
    ['2024-02-30', false],
    ['2024-13-01', false],
    ['05/03/2024', false],
    ['', false],
    [null, false],
  ])('%s → %s', (value, expected) => {
    expect(isISODate(value)).toBe(expected);
  });
});

describe('formatDayMonth', () => {
  test('formats as "5 de março"', () => {
    expect(formatDayMonth('2024-03-05')).toBe('5 de março');
  });
  test('returns empty for invalid dates', () => {
    expect(formatDayMonth('nope')).toBe('');
  });
});

describe('monthName', () => {
  test('maps "01".."12" to Portuguese names', () => {
    expect(monthName('01')).toBe('janeiro');
    expect(monthName('12')).toBe('dezembro');
    expect(MONTHS).toHaveLength(12);
  });
  test('falls back for unknown months', () => {
    expect(monthName('??')).toBe('sem mês');
  });
});
