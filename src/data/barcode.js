export const ZXING_SRC = 'vendor/zxing/zxing.min.js';
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a'];

const scripts = new Map();

/** Loads a classic script once and resolves with the global it defines. */
export const loadScript = (src, globalName, doc = document) => {
  if (!scripts.has(src)) {
    const promise = new Promise((resolve, reject) => {
      const script = Object.assign(doc.createElement('script'), { src, async: true });
      script.addEventListener('load', () => resolve(globalThis[globalName]));
      script.addEventListener('error', () => {
        script.remove();
        scripts.delete(src);
        reject(new Error(`Não consegui carregar ${src}`));
      });
      doc.head.append(script);
    });
    scripts.set(src, promise);
  }
  return scripts.get(src);
};

/** Android/Chrome: the browser's own barcode detector. */
export const createNativeDecoder = (BarcodeDetector) => {
  const detector = new BarcodeDetector({ formats: NATIVE_FORMATS });
  return {
    kind: 'native',
    decode: async (source) => {
      try {
        const [first] = await detector.detect(source);
        return first?.rawValue ?? null;
      } catch {
        return null;
      }
    },
  };
};

/** iPhone (no BarcodeDetector in Safari): ZXing reading a canvas frame. */
export const createZxingDecoder = (ZXing) => {
  const reader = new ZXing.MultiFormatReader();
  const hints = new Map([
    [
      ZXing.DecodeHintType.POSSIBLE_FORMATS,
      [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A],
    ],
    [ZXing.DecodeHintType.TRY_HARDER, true],
  ]);
  reader.setHints(hints);
  return {
    kind: 'zxing',
    decode: async (canvas) => {
      try {
        const source = new ZXing.HTMLCanvasElementLuminanceSource(canvas);
        const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(source));
        return reader.decodeWithState(bitmap).getText();
      } catch {
        return null; // no barcode in this frame
      }
    },
  };
};

const supportsEan = async (BarcodeDetector) => {
  try {
    return (await BarcodeDetector.getSupportedFormats()).includes('ean_13');
  } catch {
    return false;
  }
};

/** Native detector when it reads EAN-13; otherwise ZXing, loaded on demand. */
export const pickDecoder = async ({
  win = globalThis,
  loadZxing = () => loadScript(ZXING_SRC, 'ZXing'),
} = {}) =>
  win.BarcodeDetector && (await supportsEan(win.BarcodeDetector))
    ? createNativeDecoder(win.BarcodeDetector)
    : createZxingDecoder(await loadZxing());
