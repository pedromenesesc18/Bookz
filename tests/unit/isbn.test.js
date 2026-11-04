import { describe, expect, test } from 'vitest';
import { isbnFromBarcode } from '../../src/lib/isbn.js';

describe('isbnFromBarcode', () => {
  test.each([
    ['9788535902778', '9788535902778'],
    ['978-85-359-0277-8', '9788535902778'],
    [' 9780306406157 ', '9780306406157'],
    ['0306406152', '0306406152'],
    ['080442957X', '080442957X'],
    ['080442957x', '080442957X'],
  ])('accepts book code %s', (raw, expected) => {
    expect(isbnFromBarcode(raw)).toBe(expected);
  });

  test.each([
    ['9788535902771', 'bad EAN check digit'],
    ['7891000315507', 'EAN of a non-book product (not 978/979)'],
    ['0306406153', 'bad ISBN-10 check digit'],
    ['12345', 'too short'],
    ['', 'empty'],
    [null, 'null'],
  ])('rejects %s (%s)', (raw) => {
    expect(isbnFromBarcode(raw)).toBeNull();
  });
});
