import { mountApp } from './ui/app.js';
import { createStorage } from './data/storage.js';
import { searchBooks } from './data/search.js';

mountApp({ storage: createStorage(), search: (q) => searchBooks(q) });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker:', err));
}
