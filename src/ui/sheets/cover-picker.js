import { escapeHtml } from '../../lib/text.js';

export const pickCoverButton =
  '<button type="button" class="link-btn" data-action="pick-cover">Escolher capa</button>';

const choicesHtml = ({ covers, failed }) => {
  if (failed) return '<p class="hint">Sem conexão com a busca de capas agora.</p>';
  if (!covers.length) return '<p class="hint">Nenhuma capa encontrada para este título.</p>';
  const options = covers
    .map(
      (url, i) =>
        `<button type="button" class="cover-choice" data-cover-choice="${i}" aria-label="Capa ${i + 1}"><img src="${escapeHtml(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-cover></button>`,
    )
    .join('');
  return `<div class="cover-grid">${options}<button type="button" class="cover-choice cover-none" data-cover-choice="none">Sem capa</button></div>`;
};

/**
 * Lets the user choose among cover candidates for the title/author typed in the form.
 * `onChoose(url)` receives '' for "Sem capa".
 */
export const createCoverPicker = ({ container, findCovers, getQuery, onChoose }) => {
  let covers = [];
  let ticket = 0;

  const open = async () => {
    const mine = ++ticket;
    container.innerHTML = '<p class="hint">Buscando capas…</p>';
    const result = await findCovers(getQuery());
    if (mine !== ticket) return;
    covers = result.covers;
    container.innerHTML = choicesHtml(result);
  };

  const choose = (choice) => {
    container.innerHTML = '';
    onChoose(choice === 'none' ? '' : (covers[Number(choice)] ?? ''));
  };

  return { open, choose };
};
