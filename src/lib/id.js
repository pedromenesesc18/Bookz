/** Short, URL-safe, practically unique id (same shape as v1 ids). */
export const createId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const isValidId = (value) => typeof value === 'string' && /^[a-z0-9_-]{1,40}$/i.test(value);
