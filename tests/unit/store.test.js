import { describe, expect, test, vi } from 'vitest';
import { createStore } from '../../src/state/store.js';

describe('createStore', () => {
  test('exposes a frozen initial state', () => {
    const store = createStore({ n: 1 });
    expect(store.getState()).toEqual({ n: 1 });
    expect(Object.isFrozen(store.getState())).toBe(true);
  });

  test('update merges a patch into a new state object', () => {
    const store = createStore({ a: 1, b: 2 });
    const before = store.getState();
    store.update({ b: 3 });
    expect(store.getState()).toEqual({ a: 1, b: 3 });
    expect(before).toEqual({ a: 1, b: 2 });
  });

  test('update accepts a function of the previous state', () => {
    const store = createStore({ n: 1 });
    store.update((s) => ({ n: s.n + 1 }));
    expect(store.getState().n).toBe(2);
  });

  test('notifies subscribers with new and previous state; unsubscribe stops it', () => {
    const store = createStore({ n: 1 });
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.update({ n: 2 });
    expect(fn).toHaveBeenCalledWith({ n: 2 }, { n: 1 });
    off();
    store.update({ n: 3 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
