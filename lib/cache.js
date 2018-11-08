// Creates a simple in-memory key/value store which will expire the items
// (and return nothing) after the `expiry` value has elapsed. Defaults
// to 12 hours. Expired entries can be removed by calling
// `purgeExpiredEntries()`.
// TODO: This could be replaced by a shared Redis instance or similar.
export function createCache({ expiry = 12 * 60 * 60 * 1000 } = {}) {
  const cache = new Map();

  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) {
        return null;
      }
      if (entry.expires <= Date.now()) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value) {
      cache.set(key, { expires: Date.now() + expiry, value: value });
    },
    delete(key) {
      cache.delete(key);
    },
    purgeExpiredEntries() {
      cache.forEach((entry, key) => {
        if (entry.expires <= Date.now()) {
          cache.delete(key);
        }
      });
    },
  };
}
