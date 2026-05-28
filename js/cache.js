const _store = new Map();

export const cache = {
  get(key) {
    return _store.has(key) ? _store.get(key) : null;
  },
  set(key, data) {
    _store.set(key, data);
  },
  invalidate(key) {
    _store.delete(key);
  },
  invalidateAll() {
    _store.clear();
  },
};
