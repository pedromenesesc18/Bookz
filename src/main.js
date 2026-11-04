import { mountApp } from './ui/app.js';
import { createStorage } from './data/storage.js';
import { searchBooks } from './data/search.js';
import { findCover, findCovers } from './data/covers.js';

mountApp({
  storage: createStorage(),
  search: (q) => searchBooks(q),
  covers: { findCover: (b) => findCover(b), findCovers: (b) => findCovers(b, { strict: false }) },
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker:', err));
}
