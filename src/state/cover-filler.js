export const TRIED_PREF = 'coverTried';
const DEFAULT_GAP_MS = 1200;

const loadTried = (storage) => {
  try {
    const list = JSON.parse(storage.loadPref(TRIED_PREF, '[]'));
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
};

/** Wraps an async job so runs never overlap; a call during a run triggers one more run after it. */
const serial = (job) => {
  let running = null;
  let again = false;
  const run = () => {
    if (running) {
      again = true;
      return running;
    }
    running = job().finally(() => {
      running = null;
      if (again) {
        again = false;
        run();
      }
    });
    return running;
  };
  return run;
};

/**
 * Finds covers for books that have none, one request at a time, in the background.
 * Each book is looked up once; network failures are retried on a later run.
 */
export const createCoverFiller = ({
  store,
  storage,
  findCover,
  setCover,
  gapMs = DEFAULT_GAP_MS,
  isOnline = () => globalThis.navigator?.onLine !== false,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) => {
  const tried = loadTried(storage);

  /** Saves only ids of books that still exist, so the list never grows forever. */
  const markTried = (id) => {
    tried.add(id);
    const existing = new Set(store.getState().books.map((b) => b.id));
    const kept = [...tried].filter((t) => t === id || existing.has(t));
    storage.savePref(TRIED_PREF, JSON.stringify(kept));
  };

  const pending = () => store.getState().books.filter((b) => !b.cover && !tried.has(b.id));

  const work = async () => {
    for (let next = pending()[0]; next && isOnline(); next = pending()[0]) {
      const { cover, failed, partial } = await findCover(next);
      // Network trouble: stop and retry on a later run (a cover found still counts).
      if (failed || (partial && !cover)) return;
      // The user may have chosen "Sem capa" while we were waiting.
      if (tried.has(next.id)) continue;
      markTried(next.id);
      const current = store.getState().books.find((b) => b.id === next.id);
      if (cover && current && !current.cover) setCover(next.id, cover);
      await wait(gapMs);
    }
  };

  const run = serial(work);

  const start = () => {
    store.subscribe((state, prev) => state.books !== prev.books && pending().length && run());
    globalThis.addEventListener?.('online', run);
    return run();
  };

  return { run, start, markTried };
};
