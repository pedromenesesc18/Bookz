// Service worker: app shell offline, network-first so updates arrive quickly.
const CACHE = 'bookz-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './src/main.js',
  './src/ui/app.js',
  './src/ui/icons.js',
  './src/ui/sheet.js',
  './src/ui/toast.js',
  './src/ui/templates.js',
  './src/ui/views/index.js',
  './src/ui/views/read-view.js',
  './src/ui/views/tab-views.js',
  './src/ui/sheets/add-sheet.js',
  './src/ui/sheets/edit-sheet.js',
  './src/ui/sheets/menu-sheet.js',
  './src/state/store.js',
  './src/state/actions.js',
  './src/domain/book.js',
  './src/domain/draft.js',
  './src/domain/library.js',
  './src/data/storage.js',
  './src/data/backup.js',
  './src/data/search.js',
  './src/lib/dates.js',
  './src/lib/files.js',
  './src/lib/id.js',
  './src/lib/text.js',
  './src/styles/tokens.css',
  './src/styles/base.css',
  './src/styles/layout.css',
  './src/styles/components.css',
  './src/styles/sheet.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request, { ignoreSearch: true })
          .then(
            (hit) =>
              hit ||
              (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()),
          ),
      ),
  );
});
