import { escapeHtml } from '../lib/text.js';

const DEFAULT_MS = 2400;
const WITH_ACTION_MS = 5000;

/** Small notification; optionally with one action button (e.g. "Desfazer"). */
export const createToast = (el, { setTimer = setTimeout, clearTimer = clearTimeout } = {}) => {
  let timer = null;

  const hide = () => el.classList.remove('show');

  const show = (message, { actionLabel, onAction } = {}) => {
    clearTimer(timer);
    el.innerHTML = `<span>${escapeHtml(message)}</span>${
      actionLabel
        ? `<button type="button" class="toast-action">${escapeHtml(actionLabel)}</button>`
        : ''
    }`;
    const button = el.querySelector('.toast-action');
    if (button) {
      button.addEventListener(
        'click',
        () => {
          hide();
          onAction?.();
        },
        { once: true },
      );
    }
    el.classList.add('show');
    timer = setTimer(hide, actionLabel ? WITH_ACTION_MS : DEFAULT_MS);
  };

  return { show, hide };
};
