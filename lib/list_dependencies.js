import semver from "semver";
import client from "./registry_client.js";
import { createCache } from "./cache.js";

// Fetches the dependency tree for the package provided, an optional
// version can be specified if needed. The results are in the form:
//   type Package = {
//     name: string;
//     version: string;
//     dependencies: Package[] | null;
//     stack: string[];
//   } | {
//     name: string;
//     error: string;
//   }
// When an error occurs processing a package it will have an `error` property
// and no version or dependencies.
//
// An optional cache object can be provided, the function will query this
// before making a network request for the latest data and insert response
// data when retrieved.
export async function fetchPackageDependencies(
  initialPkgName,
  initialRange,
  { cache = createCache(), maxDepth = 5, timeout = 30 * 1000 } = {}
) {
  const root = {
    name: initialPkgName,
    range: cleanVersion(initialRange),
    dependencies: null,
    stack: [],
    error: null,
  };

  const queue = [root];
  const timelimit = Date.now() + timeout;

  // Load each package and it's dependencies breadth first so as to ensure
  // we prioritize fetching the immediate dependencies.
  while (queue.length > 0) {
    const node = queue.shift();

    if (timelimit <= Date.now()) {
      node.error = "Time Limit Exceeded";
      continue;
    }

    let metadata = cache?.get(node.name);
    if (!metadata) {
      try {
        metadata = await client.fetchPackageMetadata(node.name);
        cache?.set(node.name, metadata);
      } catch (err) {
        node.error = "Unable to fetch package information";
        continue;
      }
    }

    const pkg = getLatestForRange(metadata, node.range);
    if (!pkg) {
      node.error = "Package Not Found";
      continue;
    }

    node.name = pkg.name;
    node.version = pkg.version;

    if (pkg && pkg.dependencies && Object.keys(pkg.dependencies).length) {
      node.dependencies = [];

      Object.entries(pkg.dependencies).forEach(([name, range]) => {
        const child = {
          name,
          range,
          dependencies: null,
          stack: [...node.stack, node.name],
        };
        node.dependencies.push(child);

        // TODO: Reference existing nodes
        if (child.stack.includes(name)) {
          child.error = "Recursion";
          return;
        }

        // TODO: Make this time based
        if (child.stack.length >= maxDepth) {
          child.error = "Max Depth Exceeded";
          return;
        }

        queue.push(child);
      });
    }
  }
  return root;
}

// Return a valid, cleaned up semver string.
function cleanVersion(version) {
  if (!version) {
    version = "latest";
  }

  if (version !== "latest" && !semver.validRange(version)) {
    version = semver.clean(version);
    // TODO: This should throw if an invalid version is provided.
    version = semver.valid(version) || "latest";
  }

  return version;
}

// Return the most recent valid package release for the range provided.
function getLatestForRange(metadata, range) {
  if (!metadata.versions) {
    return null;
  }

  const versions = Object.keys(metadata.versions).sort(semver.compare);
  let version;

  if (range === "latest") {
    if (metadata["dist-tags"] && metadata["dist-tags"].latest) {
      // Tagged version.
      version = metadata["dist-tags"].latest;
    } else {
      // Newest version within versions including alphas etc.
      version = versions[versions.length - 1];
    }
  } else {
    // Newest version within semver range
    version = semver.maxSatisfying(versions, range);
  }

  return metadata.versions[version];
}
