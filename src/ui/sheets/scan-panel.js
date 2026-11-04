import { cameraErrorMessage } from '../scanner.js';

export const scanButtonHtml = `<button type="button" class="scan-btn" data-action="scan">
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/></svg>
  Ler código de barras</button>`;

const PANEL_HTML = `
<div class="scan-view">
  <video class="scan-video" muted autoplay playsinline aria-label="Imagem da câmera"></video>
  <div class="scan-frame" aria-hidden="true"><span class="scan-laser"></span></div>
</div>
<p class="hint scan-hint">Aponte para o código de barras atrás do livro</p>
<button type="button" class="ghost" data-action="scan-cancel">Cancelar</button>`;

/** Camera panel inside the add sheet. `startScan` returns { start, stop }. */
export const createScanPanel = ({ container, startScan, onIsbn }) => {
  let controller = null;

  const stop = () => {
    controller?.stop();
    controller = null;
    container.hidden = true;
    container.innerHTML = '';
  };

  const showError = (kind) => {
    const hint = container.querySelector('.scan-hint');
    if (!hint) return;
    hint.textContent = cameraErrorMessage(kind);
    hint.classList.add('scan-error');
  };

  const open = () => {
    stop();
    container.innerHTML = PANEL_HTML;
    container.hidden = false;
    const mine = startScan({
      video: container.querySelector('video'),
      onIsbn: (isbn) => {
        stop();
        return onIsbn(isbn);
      },
      // Errors from an earlier (cancelled) scan must not show on this one.
      onError: (kind) => controller === mine && showError(kind),
    });
    controller = mine;
    mine.start();
  };

  return { open, stop };
};
