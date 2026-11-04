/** Bottom sheet dialog: one at a time, closes on backdrop tap or Escape, restores focus. */
export const createSheet = ({ sheet, body, backdrop, doc = document }) => {
  let returnFocus = null;

  const isOpen = () => sheet.classList.contains('open');

  const close = () => {
    if (!isOpen()) return;
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    doc.body.classList.remove('locked');
    returnFocus?.focus?.();
  };

  const open = (html, { label = '' } = {}) => {
    if (!isOpen()) returnFocus = doc.activeElement;
    body.innerHTML = html;
    sheet.setAttribute('aria-label', label);
    sheet.removeAttribute('aria-hidden');
    sheet.classList.add('open');
    backdrop.classList.add('open');
    doc.body.classList.add('locked');
    sheet.scrollTop = 0;
    return body;
  };

  backdrop.addEventListener('click', close);
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return { open, close, isOpen };
};
