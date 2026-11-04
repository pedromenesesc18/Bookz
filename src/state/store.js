/**
 * Minimal immutable store: every update produces a new frozen state object
 * and notifies subscribers with (next, previous).
 */
export const createStore = (initial) => {
  let state = Object.freeze({ ...initial });
  const listeners = new Set();

  const update = (patch) => {
    const previous = state;
    const changes = typeof patch === 'function' ? patch(previous) : patch;
    state = Object.freeze({ ...previous, ...changes });
    listeners.forEach((fn) => fn(state, previous));
  };

  const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return { getState: () => state, update, subscribe };
};
