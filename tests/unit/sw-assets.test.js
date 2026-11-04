import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

describe('service worker precache', () => {
  test('lists every file under src/ so the app works offline', () => {
    const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
    const missing = walk(join(ROOT, 'src'))
      .map((f) => `./${relative(ROOT, f)}`)
      .filter((f) => !sw.includes(`'${f}'`));
    expect(missing).toEqual([]);
  });
});

test('precaches the barcode reader so scanning works offline on iPhone', () => {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  expect(sw).toContain("'./vendor/zxing/zxing.min.js'");
});
