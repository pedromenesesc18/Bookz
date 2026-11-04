import { test, expect } from '@playwright/test';

const LEGACY = [
  {
    id: 'a1',
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    status: 'lido',
    fisico: true,
    rating: 5,
    finishedAt: '2024-03-05',
    pages: '256',
    notes: '',
    addedAt: '2024-03-01',
  },
  {
    id: 'a2',
    title: 'Torto Arado',
    author: 'Itamar Vieira Junior',
    status: 'lendo',
    startedAt: '2024-05-01',
    pages: '264',
  },
];

const seed = (page, books) =>
  page.addInitScript((data) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('bookz.v1', JSON.stringify(data));
      sessionStorage.setItem('seeded', '1');
    }
  }, books);

const mockSearch = (page, items) =>
  page.route('https://www.googleapis.com/**', (route) =>
    route.fulfill({ json: { items: items.map((volumeInfo) => ({ volumeInfo })) } }),
  );

test.beforeEach(async ({ page }) => {
  // Fonts and covers are not needed for behaviour tests.
  await page.route('https://fonts.googleapis.com/**', (r) =>
    r.fulfill({ body: '', contentType: 'text/css' }),
  );
  page.on('pageerror', (err) => {
    throw err;
  });
});

test('shows data saved by the previous version', async ({ page }) => {
  await seed(page, LEGACY);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bookz' })).toBeVisible();
  await expect(page.getByText('Dom Casmurro')).toBeVisible();
  await expect(page.getByRole('tab', { name: '2024' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Lendo' }).click();
  await expect(page.getByText('Torto Arado')).toBeVisible();
});

test('add a book from search, rate it and find it in Lidos', async ({ page }) => {
  await mockSearch(page, [{ title: 'O Hobbit', authors: ['J.R.R. Tolkien'], pageCount: 336 }]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar livro' }).click();
  await page.getByPlaceholder('Título, autor ou ISBN').fill('hobbit');
  await page.getByRole('button', { name: /O Hobbit/ }).click();

  await expect(page.getByLabel('Título')).toHaveValue('O Hobbit');
  await page.getByRole('radio', { name: '4 estrelas' }).click();
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('Livro adicionado');
  await expect(page.getByRole('main')).toContainText('O Hobbit');
  await expect(page.getByLabel('4 de 5 estrelas')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('main')).toContainText('O Hobbit');
});

test('search failure lets the user add manually', async ({ page }) => {
  await page.route('https://www.googleapis.com/**', (r) => r.abort());
  await page.route('https://openlibrary.org/**', (r) => r.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar livro' }).click();
  await page.getByPlaceholder('Título, autor ou ISBN').fill('Livro raro');
  await expect(page.getByText('Sem conexão com a busca')).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar manualmente' }).click();
  await page.getByRole('radio', { name: 'Quero ler' }).click();
  await page.getByLabel('Tenho o livro físico').check();
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click();

  await expect(page.getByRole('main')).toContainText('Livro raro');
  await expect(page.getByText('tenho físico')).toBeVisible();
  await page.getByRole('button', { name: 'Estante' }).click();
  await expect(page.getByRole('main')).toContainText('Livro raro');
});

test('track reading progress, then finish the book', async ({ page }) => {
  await seed(page, LEGACY);
  await page.goto('/');
  await page.getByRole('button', { name: 'Lendo' }).click();
  await page.getByRole('button', { name: /Torto Arado/ }).click();
  await page.getByLabel('Estou na página').fill('132');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('pág. 132 de 264 · 50%')).toBeVisible();

  await page.getByRole('button', { name: /Torto Arado/ }).click();
  await page.getByRole('radio', { name: 'Lido' }).click();
  await page.getByLabel('Terminei em').fill('2024-06-10');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await page.getByRole('button', { name: 'Lidos' }).click();
  await expect(page.getByRole('main')).toContainText('junho');
  await expect(page.getByRole('main')).toContainText('Torto Arado');
});

test('delete with undo', async ({ page }) => {
  await seed(page, LEGACY);
  await page.goto('/');
  await page.getByRole('button', { name: /Dom Casmurro/ }).click();
  await page.getByRole('button', { name: 'Remover livro' }).click();
  await expect(page.getByRole('main')).not.toContainText('Dom Casmurro');
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('main')).toContainText('Dom Casmurro');
});

test('filter my books with the search bar', async ({ page }) => {
  await seed(page, [
    ...LEGACY,
    {
      id: 'a3',
      title: 'Memórias Póstumas',
      author: 'Machado de Assis',
      status: 'lido',
      finishedAt: '2024-01-02',
    },
  ]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Buscar nos meus livros' }).click();
  await page.getByRole('searchbox', { name: 'Buscar nos seus livros' }).fill('memorias');
  await expect(page.getByRole('main')).toContainText('Memórias Póstumas');
  await expect(page.getByRole('main')).not.toContainText('Dom Casmurro');
});

test('backup export and import round-trip', async ({ page }) => {
  await seed(page, LEGACY);
  await page.goto('/');
  await page.evaluate(() => {
    delete navigator.canShare;
    Object.defineProperty(navigator, 'canShare', { value: undefined });
  });
  await page.getByRole('button', { name: 'Backup e dados' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^bookz-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const extra = JSON.stringify({
    app: 'bookz',
    version: 1,
    books: [{ id: 'n1', title: 'Novo Importado', status: 'quero' }],
  });
  await page
    .locator('#import-file')
    .setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(extra) });
  await expect(page.getByRole('status')).toContainText('1 livro importado');
  await page.getByRole('button', { name: 'Quero ler' }).click();
  await expect(page.getByRole('main')).toContainText('Novo Importado');
});

test('escapes HTML in titles (no XSS)', async ({ page }) => {
  await seed(page, [{ id: 'x1', title: '<img src=x onerror="window.pwned=1">', status: 'quero' }]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Quero ler' }).click();
  await expect(page.getByRole('main')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.pwned)).toBeUndefined();
});

test('no horizontal overflow at small widths', async ({ page }) => {
  await seed(page, LEGACY);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
