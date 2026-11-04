import { describe, expect, test, vi } from 'vitest';
import {
  createNativeDecoder,
  createZxingDecoder,
  pickDecoder,
  loadScript,
} from '../../src/data/barcode.js';

const fakeZxing = (result) => {
  class NotFoundException extends Error {}
  return {
    NotFoundException,
    BarcodeFormat: { EAN_13: 7, EAN_8: 6, UPC_A: 14 },
    DecodeHintType: { POSSIBLE_FORMATS: 2, TRY_HARDER: 3 },
    HTMLCanvasElementLuminanceSource: class {
      constructor(canvas) {
        this.canvas = canvas;
      }
    },
    HybridBinarizer: class {
      constructor(source) {
        this.source = source;
      }
    },
    BinaryBitmap: class {
      constructor(binarizer) {
        this.binarizer = binarizer;
      }
    },
    MultiFormatReader: class {
      setHints(hints) {
        this.hints = hints;
      }
      decodeWithState() {
        if (result instanceof Error) throw result;
        if (!result) throw new NotFoundException();
        return { getText: () => result };
      }
    },
  };
};

describe('createZxingDecoder', () => {
  test('returns the decoded text', async () => {
    const decoder = createZxingDecoder(fakeZxing('9788535902771'));
    expect(await decoder.decode({})).toBe('9788535902771');
  });
  test('returns null when no barcode is in the frame', async () => {
    expect(await createZxingDecoder(fakeZxing(null)).decode({})).toBeNull();
  });
  test('treats other decoder errors as "nothing found" too', async () => {
    expect(await createZxingDecoder(fakeZxing(new Error('checksum'))).decode({})).toBeNull();
  });
});

describe('createNativeDecoder', () => {
  test('uses BarcodeDetector and returns the first code', async () => {
    const detect = vi.fn(async () => [{ rawValue: '9788535902771' }]);
    const Detector = vi.fn(() => ({ detect }));
    const decoder = createNativeDecoder(Detector);
    expect(await decoder.decode('frame')).toBe('9788535902771');
    expect(Detector).toHaveBeenCalledWith({ formats: ['ean_13', 'ean_8', 'upc_a'] });
  });
  test('returns null when nothing is detected or detection fails', async () => {
    expect(
      await createNativeDecoder(vi.fn(() => ({ detect: async () => [] }))).decode('f'),
    ).toBeNull();
    const failing = vi.fn(() => ({
      detect: async () => {
        throw new Error('x');
      },
    }));
    expect(await createNativeDecoder(failing).decode('f')).toBeNull();
  });
});

describe('pickDecoder', () => {
  test('prefers the native detector when it supports EAN-13', async () => {
    const BarcodeDetector = Object.assign(
      vi.fn(() => ({ detect: async () => [] })),
      {
        getSupportedFormats: async () => ['qr_code', 'ean_13'],
      },
    );
    const loadZxing = vi.fn();
    const decoder = await pickDecoder({ win: { BarcodeDetector }, loadZxing });
    expect(decoder.kind).toBe('native');
    expect(loadZxing).not.toHaveBeenCalled();
  });

  test('falls back to ZXing (iPhone) when there is no usable native detector', async () => {
    const loadZxing = vi.fn(async () => fakeZxing('1'));
    expect((await pickDecoder({ win: {}, loadZxing })).kind).toBe('zxing');
    const qrOnly = Object.assign(vi.fn(), { getSupportedFormats: async () => ['qr_code'] });
    expect((await pickDecoder({ win: { BarcodeDetector: qrOnly }, loadZxing })).kind).toBe('zxing');
  });
});

describe('loadScript', () => {
  test('adds the script once and resolves with the global', async () => {
    const promise = loadScript('vendor/x.js', 'XLib');
    const again = loadScript('vendor/x.js', 'XLib');
    const script = document.querySelector('script[src="vendor/x.js"]');
    window.XLib = { ok: true };
    script.dispatchEvent(new Event('load'));
    expect(await promise).toEqual({ ok: true });
    expect(await again).toEqual({ ok: true });
    expect(document.querySelectorAll('script[src="vendor/x.js"]')).toHaveLength(1);
  });

  test('rejects when the script fails, and can be retried', async () => {
    const promise = loadScript('vendor/y.js', 'YLib');
    document.querySelector('script[src="vendor/y.js"]').dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow('vendor/y.js');
    expect(document.querySelector('script[src="vendor/y.js"]')).toBeNull();
  });
});
