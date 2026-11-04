/** Bottom sheet dialog: one at a time, closes on backdrop tap or Escape, restores focus. */
export const createSheet = ({ sheet, body, backdrop, doc = document }) => {
  let returnFocus = null;
  let onClose = null;

  /** Lets the open sheet clean up (e.g. turn the camera off) before it goes away. */
  const cleanup = () => {
    const fn = onClose;
    onClose = null;
    fn?.();
  };

  const isOpen = () => sheet.classList.contains('open');

  const close = () => {
    if (!isOpen()) return;
    cleanup();
    sheet.classList.remove('open');
    backdrop.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    doc.body.classList.remove('locked');
    returnFocus?.focus?.();
  };

  const open = (html, { label = '', onClose: nextOnClose = null } = {}) => {
    if (!isOpen()) returnFocus = doc.activeElement;
    cleanup();
    onClose = nextOnClose;
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
