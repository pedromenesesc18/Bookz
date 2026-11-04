import { describe, expect, test } from 'vitest';
import { escapeHtml, foldText, uniqueAuthors, clampText } from '../../src/lib/text.js';

describe('escapeHtml', () => {
  test('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
  test('turns null and undefined into empty string', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
  test('stringifies numbers', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('foldText', () => {
  test('lowercases and strips accents', () => {
    expect(foldText('Machado de ASSIS — Memórias Póstumas')).toBe(
      'machado de assis — memorias postumas',
    );
  });
  test('handles empty values', () => {
    expect(foldText(undefined)).toBe('');
  });
});

describe('uniqueAuthors', () => {
  test('joins authors removing accent/case duplicates', () => {
    expect(uniqueAuthors(['José Saramago', 'Jose Saramago', 'Outro'])).toBe('José Saramago, Outro');
  });
  test('ignores blanks and non-arrays', () => {
    expect(uniqueAuthors(['', '  ', 'A'])).toBe('A');
    expect(uniqueAuthors(undefined)).toBe('');
    expect(uniqueAuthors('A')).toBe('');
  });
});

describe('clampText', () => {
  test('trims and limits length', () => {
    expect(clampText('  abcdef ', 3)).toBe('abc');
  });
  test('returns empty string for non-strings', () => {
    expect(clampText(12, 10)).toBe('');
  });
});

describe('readFileText', async () => {
  const { readFileText } = await import('../../src/lib/files.js');
  test('uses FileReader when File.text is unavailable', async () => {
    const file = new Blob(['olá']);
    file.text = undefined;
    expect(await readFileText(file)).toBe('olá');
  });
  test('uses File.text when available', async () => {
    expect(await readFileText({ text: async () => 'x' })).toBe('x');
  });
});
