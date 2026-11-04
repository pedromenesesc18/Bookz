import { countBooks } from '../templates.js';

export const menuSheetHtml = (count) => `
<h2>Seus dados</h2>
<p class="lead">Os livros ficam salvos só neste aparelho. Faça um backup de vez em quando pra não perder nada.</p>
<button type="button" class="primary" data-action="export">Exportar backup</button>
<button type="button" class="ghost" data-action="import">Importar backup</button>
<p class="hint">${countBooks(count)} cadastrados</p>`;

export const openMenuSheet = ({ sheet, count, onExport, onImport }) => {
  const root = sheet.open(menuSheetHtml(count), { label: 'Seus dados' });
  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'export') onExport();
    if (action === 'import') onImport();
  });
};

/** Shares the file on phones (Files/AirDrop); falls back to a download link. */
export const shareOrDownload = async (file, { nav = navigator, doc = document } = {}) => {
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Backup Bookz' });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(doc.createElement('a'), { href: url, download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
};
