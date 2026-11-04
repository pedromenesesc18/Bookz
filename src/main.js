import { mountApp } from './ui/app.js';
import { createStorage } from './data/storage.js';
import { searchBooks } from './data/search.js';
import { findCover, findCovers } from './data/covers.js';
import { createSpineColorizer } from './ui/spine-colors.js';
import { pickDecoder } from './data/barcode.js';
import { createFrameReader, createScanner } from './ui/scanner.js';

const storage = createStorage();

/** Camera barcode reading; the decoder (and ZXing on iPhone) loads on the first frame. */
const scan = ({ video, onIsbn, onError }) =>
  createScanner({ video, decodeFrame: createFrameReader(() => pickDecoder()), onIsbn, onError });

mountApp({
  storage,
  colorizer: createSpineColorizer({ storage }),
  scan,
  search: (q) => searchBooks(q),
  covers: { findCover: (b) => findCover(b), findCovers: (b) => findCovers(b, { strict: false }) },
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker:', err));
}
