import { STATUS, MAX_RATING } from '../../domain/book.js';
import { withStatus } from '../../domain/draft.js';
import { escapeHtml } from '../../lib/text.js';
import { coverHtml } from '../templates.js';

const STATUS_OPTIONS = [
  [STATUS.READ, 'Lido'],
  [STATUS.READING, 'Lendo'],
  [STATUS.WANT, 'Quero ler'],
];

const field = (id, label, value, attrs = '') =>
  `<label class="field-label" for="${id}">${label}</label><input class="field" id="${id}" name="${id}" value="${escapeHtml(value)}" ${attrs}>`;

const statusControl = (status) =>
  `<div class="seg" role="radiogroup" aria-label="Status">${STATUS_OPTIONS.map(
    ([value, label]) =>
      `<button type="button" role="radio" aria-checked="${status === value}" data-status="${value}">${label}</button>`,
  ).join('')}</div>`;

const ratingControl = (rating) =>
  `<div class="starpick" role="radiogroup" aria-label="Nota">${Array.from(
    { length: MAX_RATING },
    (_, i) => i + 1,
  )
    .map(
      (n) =>
        `<button type="button" role="radio" aria-checked="${n === rating}" aria-label="${n} estrela${n > 1 ? 's' : ''}" data-rating="${n}" class="${n <= rating ? 'on' : ''}">★</button>`,
    )
    .join('')}</div>`;

export const editSheetHtml = (draft, isNew) => `
<form id="book-form" class="form" novalidate>
  <div class="preview">${coverHtml(draft, 'cover-lg')}<h2>${isNew ? 'Novo livro' : 'Editar livro'}</h2></div>
  ${field('title', 'Título', draft.title, 'required autocomplete="off"')}
  ${field('author', 'Autor(a)', draft.author, 'autocomplete="off"')}
  <span class="field-label">Status</span>${statusControl(draft.status)}
  <label class="toggle"><span>📚 Tenho o livro físico</span>
    <input type="checkbox" name="fisico" class="switch" ${draft.fisico ? 'checked' : ''}></label>
  <fieldset class="when when-lido" ${draft.status === STATUS.READ ? '' : 'hidden'}>
    <span class="field-label">Nota</span>${ratingControl(draft.rating)}
    ${field('finishedAt', 'Terminei em', draft.finishedAt, 'type="date"')}
  </fieldset>
  <fieldset class="when when-lendo" ${draft.status === STATUS.READING ? '' : 'hidden'}>
    <div class="row2">
      <div>${field('startedAt', 'Comecei em', draft.startedAt, 'type="date"')}</div>
      <div>${field('currentPage', 'Estou na página', draft.currentPage || '', 'inputmode="numeric"')}</div>
    </div>
  </fieldset>
  ${field('pages', 'Páginas', draft.pages || '', 'inputmode="numeric"')}
  <label class="field-label" for="notes">Anotações</label>
  <textarea class="field" id="notes" name="notes" rows="3" placeholder="O que achou? Frases favoritas…">${escapeHtml(draft.notes)}</textarea>
  <button type="submit" class="primary">${isNew ? 'Adicionar' : 'Salvar'}</button>
  ${isNew ? '' : '<button type="button" class="ghost danger" data-action="delete">Remover livro</button>'}
</form>`;

/** Reads the visible form fields back into a draft (status and rating live in `ui`). */
export const readForm = (form, base, ui) => {
  const value = (name) => form.elements.namedItem(name)?.value ?? '';
  return {
    ...base,
    title: value('title'),
    author: value('author'),
    fisico: form.elements.namedItem('fisico').checked,
    status: ui.status,
    rating: ui.rating,
    finishedAt: value('finishedAt'),
    startedAt: value('startedAt'),
    currentPage: value('currentPage'),
    pages: value('pages'),
    notes: value('notes'),
  };
};

const syncStatus = (form, status) => {
  form
    .querySelectorAll('[data-status]')
    .forEach((b) => b.setAttribute('aria-checked', String(b.dataset.status === status)));
  form.querySelector('.when-lido').hidden = status !== STATUS.READ;
  form.querySelector('.when-lendo').hidden = status !== STATUS.READING;
};

const syncRating = (form, rating) =>
  form.querySelectorAll('[data-rating]').forEach((b) => {
    const n = Number(b.dataset.rating);
    b.classList.toggle('on', n <= rating);
    b.setAttribute('aria-checked', String(n === rating));
  });

/** Opens the edit form. Calls onSave(draft) / onDelete(id). */
export const openEditSheet = ({ sheet, draft, isNew, today, onSave, onDelete }) => {
  const root = sheet.open(editSheetHtml(draft, isNew), {
    label: isNew ? 'Novo livro' : 'Editar livro',
  });
  const form = root.querySelector('#book-form');
  const ui = { status: draft.status, rating: draft.rating };

  form.addEventListener('click', (e) => {
    const status = e.target.closest('[data-status]')?.dataset.status;
    if (status) {
      ui.status = status;
      const filled = withStatus(readForm(form, draft, ui), status, today);
      form.elements.namedItem('finishedAt').value = filled.finishedAt;
      form.elements.namedItem('startedAt').value = filled.startedAt;
      syncStatus(form, status);
      return;
    }
    const rating = Number(e.target.closest('[data-rating]')?.dataset.rating);
    if (rating) {
      ui.rating = ui.rating === rating ? 0 : rating;
      syncRating(form, ui.rating);
      return;
    }
    if (e.target.closest('[data-action="delete"]')) onDelete(draft.id);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = form.elements.namedItem('title');
    if (!titleInput.value.trim()) {
      titleInput.setAttribute('aria-invalid', 'true');
      titleInput.focus();
      return;
    }
    onSave(readForm(form, draft, ui));
  });
};
