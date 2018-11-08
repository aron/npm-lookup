import { createCache } from "../cache.js";
import sinon from "sinon";
import assert from "assert";

describe("createCache", () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  function createTestCache() {
    return createCache({ expiry: 100 });
  }

  it("returns the entry if found", () => {
    const cache = createTestCache();
    cache.set("a", "a");
    assert.equal(cache.get("a"), "a");
  });

  it("returns null if the entry has expired", () => {
    const cache = createTestCache();
    cache.set("a", "a");
    clock.tick(101);
    assert.equal(cache.get("a"), null);
  });

  it("returns null if no entry is found", () => {
    const cache = createTestCache();
    assert.equal(cache.get("missing"), null);
  });

  it("returns null if the key is deleted", () => {
    const cache = createTestCache();
    cache.set("a", "a");
    cache.delete("a");
    assert.equal(cache.get("a"), null);
  });

  it("supports purging of expired keys", () => {
    const cache = createTestCache();

    cache.set("a", "a");
    clock.tick(50);

    cache.set("b", "b");
    clock.tick(50);

    cache.purgeExpiredEntries();

    assert.equal(cache.get("a"), null);
    assert.equal(cache.get("b"), "b");
  });
});
