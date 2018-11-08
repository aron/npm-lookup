const semver = require('semver');
const {fetchPackageMetadata} = require('./registry_client');
const {walk} = require('./utils');

// Fetches the dependency tree for the package provided, an optional
// version can be specified if needed. The results are in the form:
//   {"name": string, "version": string, dependencies: Package[]}
// An optional cache object can be provided that should contain the
// package metadata keyed by name, the function will query this
// before making a network request for the latest data.
async function fetchPackageDependencies(package, version, cache) {
  cache = cache || {};
  version = cleanVersion(version);

  async function traverseTree(package, range) {
    let metadata;
    if (cache && cache[package]) {
      metadata = cache[package];
    } else {
      // TODO: Handle failed requests, retry etc.
      metadata = await fetchPackageMetadata(package);
      // TODO: Expire cache entries.
      cache[package] = metadata;
    }

    const pkg = getLatestForRange(metadata, range);
    if (!pkg.dependencies || !Object.keys(pkg.dependencies).length) {
      return {name: pkg.name, version: pkg.version, dependencies: null};
    }

    // TODO: Batch requests into controlled chunks
    const dependencies = Object.entries(pkg.dependencies).map(([name, range]) => traverseTree(name, range));

    const resolved = await Promise.all(dependencies);

    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: resolved.sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  return traverseTree(package, version);
}
exports.fetchPackageDependencies = fetchPackageDependencies;

// Return a valid, cleaned up semver string.
function cleanVersion(version) {
  if (!version) {
    version = 'latest';
  }
  if (version !== 'latest') {
    version = semver.clean(version);
    version = semver.isValid(version) || 'latest';
  }
  return version;
}

// Return the most recent valid package release for the range provided.
// TODO: Check to see if I can just pass "*" wildcard.
function getLatestForRange(metadata, range) {
  const versions = Object.keys(metadata.versions).sort(semver.compare);
  let version;

  if (range === 'latest') {
    if (metadata['dist-tags'] && metadata['dist-tags'].latest) {
      // Tagged version.
      version = metadata['dist-tags'].latest;
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

// For testing...
if (require.main.filename === __filename) {
  fetchPackageDependencies('express').then(pkg => {
    walk(pkg, (pkg, depth) => {
      const pad = new Array(depth + 1).join('    ');
      console.log(`${pad}${pkg.name}@${pkg.version}`)
    });
  })
} 