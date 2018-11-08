import { fetchPackageDependencies } from "../list_dependencies.js";
import { createCache } from "../cache.js";
import client from "../registry_client.js";
import sinon from "sinon";
import assert from "assert";

describe("fetchPackageDependencies", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox
      .stub(client, "fetchPackageMetadata")
      .callsFake(async (pkg) => fixtures[pkg]);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("loads the tree of dependencies for a package", async () => {
    const result = await fetchPackageDependencies("a", "latest");
    assert.equal(result.name, "a");
    assert.equal(result.version, "1.0.0");
    assert.equal(result.dependencies.length, 2);

    assert.equal(result.dependencies[0].name, "a1");
    assert.equal(result.dependencies[0].version, "1.0.0");

    assert.equal(result.dependencies[1].name, "a2");
    assert.equal(result.dependencies[1].version, "1.0.0");
  });

  it("handles network errors from the registry api", async () => {
    client.fetchPackageMetadata.rejects(new Error("NetworkError"));

    const result = await fetchPackageDependencies("a", "latest");
    assert.equal(result.name, "a");
    assert.equal(result.version, null);
    assert.equal(result.dependencies, null);
    assert.equal(result.error, "Unable to fetch package information");
  });

  it("handles network errors from the registry api for child dependencies", async () => {
    client.fetchPackageMetadata.callsFake(async (pkg) => {
      if (pkg === "a1") {
        return Promise.reject("NetworkError");
      }
      return fixtures[pkg];
    });

    const result = await fetchPackageDependencies("a", "latest");
    assert.equal(result.name, "a");
    assert.equal(result.version, "1.0.0");
    assert.equal(result.dependencies.length, 2);

    assert.equal(result.dependencies[0].name, "a1");
    assert.equal(result.dependencies[0].version, null);
    assert.equal(
      result.dependencies[0].error,
      "Unable to fetch package information"
    );
  });

  it("caches lookups in a shared cache", async () => {
    const cache = createCache();
    await fetchPackageDependencies("a", "latest", { cache });
    await fetchPackageDependencies("a", "latest", { cache });
    await fetchPackageDependencies("a", "latest", { cache });

    sinon.assert.callCount(client.fetchPackageMetadata, 3);
  });

  it("normalizes the package version", async () => {
    const result = await fetchPackageDependencies("a", "1.0");
    assert.equal(result.name, "a");
    assert.equal(result.version, "1.0.0");
    assert.equal(result.dependencies.length, 2);
  });

  it("falls back to 'latest' when an invalid version is provided", async () => {
    const result = await fetchPackageDependencies("a", "invalid");
    assert.equal(result.name, "a");
    assert.equal(result.version, "1.0.0");
    assert.equal(result.dependencies.length, 2);
  });

  it("resolves the 'latest' version to the 'latest' tag when available", async () => {
    const result = await fetchPackageDependencies("latestTagged", "latest");
    assert.equal(result.name, "latestTagged");
    assert.equal(result.version, "2.0.0");
  });

  it("resolves the 'latest' version to the highest version when no latest tag exists", async () => {
    const result = await fetchPackageDependencies("latestVersions", "latest");
    assert.equal(result.name, "latestVersions");
    assert.equal(result.version, "3.0.0-alpha.1");
  });

  it("resolves a range version to the highest supported version", async () => {
    const result = await fetchPackageDependencies("latestVersions", "~1.0.0");
    assert.equal(result.name, "latestVersions");
    assert.equal(result.version, "1.0.1");
  });

  it("stops the lookup if it hits a cyclic dependency", async () => {
    const result = await fetchPackageDependencies("recursive");
    assert.equal(result.name, "recursive");
    assert.equal(result.version, "1.0.0");
    assert.equal(result.dependencies.length, 1);

    assert.equal(result.dependencies[0].name, "recursive1");
    assert.equal(result.dependencies[0].dependencies[0].name, "recursive");
    assert.equal(result.dependencies[0].dependencies[0].error, "Recursion");
  });

  it("stops making lookups once the maxDepth has been reached");
  it("stops the lookup after the provided timeout has expired");
});

const fixtures = {
  a: {
    versions: {
      "1.0.0": {
        name: "a",
        version: "1.0.0",
        dependencies: {
          a1: "1.0.0",
          a2: "1.0.0",
        },
      },
    },
  },
  a1: {
    versions: {
      "1.0.0": {
        name: "a1",
        version: "1.0.0",
        dependencies: {},
      },
    },
  },
  a2: {
    versions: {
      "1.0.0": {
        name: "a2",
        version: "1.0.0",
        dependencies: {},
      },
    },
  },
  recursive: {
    versions: {
      "1.0.0": {
        name: "recursive",
        version: "1.0.0",
        dependencies: {
          recursive1: "1.0.0",
        },
      },
    },
  },
  recursive1: {
    versions: {
      "1.0.0": {
        name: "recursive1",
        version: "1.0.0",
        dependencies: {
          recursive: "1.0.0",
        },
      },
    },
  },
  latestTagged: {
    "dist-tags": {
      latest: "2.0.0",
      next: "3.0.0-alpha.1",
    },
    versions: {
      "3.0.0-alpha.1": {
        name: "latestTagged",
        version: "3.0.0-alpha.1",
        dependencies: {},
      },
      "2.0.0": {
        name: "latestTagged",
        version: "2.0.0",
        dependencies: {},
      },
      "1.0.1": {
        name: "latestTagged",
        version: "1.0.1",
        dependencies: {},
      },
      "1.0.0": {
        name: "latestTagged",
        version: "1.0.0",
        dependencies: {},
      },
    },
  },
  latestVersions: {
    versions: {
      "3.0.0-alpha.1": {
        name: "latestVersions",
        version: "3.0.0-alpha.1",
        dependencies: {},
      },
      "2.0.0": {
        name: "latestVersions",
        version: "2.0.0",
        dependencies: {},
      },
      "1.0.1": {
        name: "latestVersions",
        version: "1.0.1",
        dependencies: {},
      },
      "1.0.0": {
        name: "latestVersions",
        version: "1.0.0",
        dependencies: {},
      },
    },
  },
};
