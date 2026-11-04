import { isbnFromBarcode } from '../lib/isbn.js';

const DEFAULT_INTERVAL_MS = 180;
const CONSTRAINTS = { video: { facingMode: { ideal: 'environment' } }, audio: false };

const ERROR_KINDS = {
  NotAllowedError: 'permission',
  SecurityError: 'permission',
  NotFoundError: 'no-camera',
  OverconstrainedError: 'no-camera',
};

const MESSAGES = {
  permission:
    'Sem permissão para usar a câmera. Libere o acesso nos Ajustes do iPhone (Safari → Câmera).',
  'no-camera': 'Não encontrei uma câmera neste aparelho.',
  unsupported: 'Este navegador não permite usar a câmera aqui. Abra o Bookz no Safari.',
  failed: 'Não consegui usar a câmera agora. Tente de novo.',
  decoder:
    'Não consegui carregar o leitor de código de barras. Confira a internet e tente de novo.',
};

export const cameraErrorMessage = (kind) => MESSAGES[kind] ?? MESSAGES.failed;

const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop());

/**
 * Reads book barcodes from the back camera until a valid ISBN shows up.
 * `decodeFrame(video)` returns the raw code in the current frame, or null.
 */
export const createScanner = ({
  video,
  mediaDevices = globalThis.navigator?.mediaDevices,
  decodeFrame,
  onIsbn,
  onError,
  intervalMs = DEFAULT_INTERVAL_MS,
}) => {
  let stream = null;
  let stopped = false;
  let timer = null;

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    stopTracks(stream);
    stream = null;
    video.srcObject = null;
  };

  /** A scanner that was already stopped (cancelled) never reports errors. */
  const fail = (kind) => {
    if (stopped) return;
    stop();
    onError(kind);
  };

  const tick = async () => {
    if (stopped) return;
    const isbn = await decodeFrame(video).then(isbnFromBarcode, () => fail('decoder'));
    if (stopped) return;
    if (!isbn) {
      timer = setTimeout(tick, intervalMs);
      return;
    }
    stop();
    onIsbn(isbn);
  };

  const start = async () => {
    if (!mediaDevices?.getUserMedia) return onError('unsupported');
    try {
      const opened = await mediaDevices.getUserMedia(CONSTRAINTS);
      if (stopped) return stopTracks(opened);
      stream = opened;
      video.setAttribute('playsinline', ''); // iOS: don't go fullscreen
      video.srcObject = stream;
      await video.play();
      tick();
    } catch (err) {
      fail(ERROR_KINDS[err?.name] ?? 'failed');
    }
  };

  return { start, stop };
};

const MAX_FRAME_WIDTH = 720;

/**
 * Returns `(video) => raw code | null` for the chosen decoder.
 * ZXing reads a canvas copy of the frame (scaled down for speed).
 */
export const createFrameReader = (decoderSource, doc = globalThis.document) => {
  let canvas = null;
  let decoderPromise = null;
  return async (video) => {
    // A function is only called on the first frame (lazy library loading).
    decoderPromise ??= typeof decoderSource === 'function' ? decoderSource() : decoderSource;
    const decoder = await decoderPromise;
    if (decoder.kind === 'native') return decoder.decode(video);
    if (!video.videoWidth || !video.videoHeight) return null;
    const scale = Math.min(1, MAX_FRAME_WIDTH / video.videoWidth);
    canvas ??= doc.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext('2d', { willReadFrequently: true })
      .drawImage(video, 0, 0, canvas.width, canvas.height);
    return decoder.decode(canvas);
  };
};
