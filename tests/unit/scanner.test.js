import { describe, expect, test, vi } from 'vitest';
import { createScanner, cameraErrorMessage } from '../../src/ui/scanner.js';

const fakeStream = () => {
  const track = { stop: vi.fn() };
  return { track, stream: { getTracks: () => [track] } };
};

const setup = (frames, over = {}) => {
  const { track, stream } = fakeStream();
  const video = { play: vi.fn(async () => {}), srcObject: null, setAttribute: vi.fn() };
  const mediaDevices = { getUserMedia: vi.fn(async () => stream) };
  const queue = [...frames];
  const decodeFrame = vi.fn(async () => (queue.length ? queue.shift() : null));
  const onIsbn = vi.fn();
  const onError = vi.fn();
  const scanner = createScanner({
    video,
    mediaDevices,
    decodeFrame,
    onIsbn,
    onError,
    intervalMs: 1,
    ...over,
  });
  return { scanner, video, mediaDevices, decodeFrame, onIsbn, onError, track };
};

describe('createScanner', () => {
  test('opens the back camera, ignores non-book codes and stops on the first ISBN', async () => {
    const { scanner, video, mediaDevices, onIsbn, track } = setup([
      null,
      '7891000315507', // a non-book product
      '9788535902778',
    ]);
    await scanner.start();
    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    expect(video.setAttribute).toHaveBeenCalledWith('playsinline', '');
    await vi.waitFor(() => expect(onIsbn).toHaveBeenCalledWith('9788535902778'));
    expect(onIsbn).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
  });

  test('stop() turns the camera off and stops reading', async () => {
    const { scanner, decodeFrame, track } = setup([]);
    await scanner.start();
    scanner.stop();
    const calls = decodeFrame.mock.calls.length;
    await new Promise((r) => setTimeout(r, 20));
    expect(decodeFrame.mock.calls.length).toBeLessThanOrEqual(calls + 1);
    expect(track.stop).toHaveBeenCalled();
  });

  test('stopping while the camera is still opening releases it', async () => {
    const { scanner, track } = setup([]);
    const starting = scanner.start();
    scanner.stop();
    await starting;
    expect(track.stop).toHaveBeenCalled();
  });

  test.each([
    ['NotAllowedError', 'permission'],
    ['SecurityError', 'permission'],
    ['NotFoundError', 'no-camera'],
    ['OverconstrainedError', 'no-camera'],
    ['NotReadableError', 'failed'],
  ])('reports %s as %s', async (name, kind) => {
    const err = Object.assign(new Error('x'), { name });
    const { scanner, onError } = setup([], {
      mediaDevices: { getUserMedia: vi.fn(async () => Promise.reject(err)) },
    });
    await scanner.start();
    expect(onError).toHaveBeenCalledWith(kind);
  });

  test('reports unsupported browsers', async () => {
    const { scanner, onError } = setup([], { mediaDevices: undefined });
    await scanner.start();
    expect(onError).toHaveBeenCalledWith('unsupported');
  });

  test('a scanner stopped while the camera is opening reports nothing', async () => {
    let reject;
    const { scanner, onError } = setup([], {
      mediaDevices: { getUserMedia: vi.fn(() => new Promise((_, r) => (reject = r))) },
    });
    const starting = scanner.start();
    scanner.stop();
    reject(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    await starting;
    expect(onError).not.toHaveBeenCalled();
  });

  test('reports a decoder that cannot load', async () => {
    const { scanner, onError } = setup([], {
      decodeFrame: vi.fn(async () => {
        throw new Error('script failed');
      }),
    });
    await scanner.start();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith('decoder'));
  });
});

describe('cameraErrorMessage', () => {
  test('explains each problem in Portuguese', () => {
    expect(cameraErrorMessage('permission')).toMatch(/permiss/i);
    expect(cameraErrorMessage('no-camera')).toMatch(/câmera/);
    expect(cameraErrorMessage('unsupported')).toMatch(/navegador/);
    expect(cameraErrorMessage('failed')).toMatch(/câmera/);
    expect(cameraErrorMessage('decoder')).toMatch(/leitor/);
  });
});

describe('createFrameReader', async () => {
  const { createFrameReader } = await import('../../src/ui/scanner.js');
  test('native decoders read the video element directly', async () => {
    const decoder = {
      kind: 'native',
      decode: vi.fn(async (src) => (src === 'video' ? '1' : null)),
    };
    const read = createFrameReader(Promise.resolve(decoder));
    expect(await read('video')).toBe('1');
  });
  test('waits for the video to have a frame', async () => {
    const decoder = { kind: 'zxing', decode: vi.fn() };
    const read = createFrameReader(Promise.resolve(decoder));
    expect(await read({ videoWidth: 0, videoHeight: 0 })).toBeNull();
    expect(decoder.decode).not.toHaveBeenCalled();
  });
});
