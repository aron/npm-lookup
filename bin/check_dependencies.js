#!/usr/bin/env node
// Usage:
//   $ ./check_dependencies.js <name>
import { fetchPackageDependencies } from "../lib/list_dependencies.js";
import assert from "assert";

let pkg = process.argv[2];
let version = "latest";
assert.ok(pkg, "Package name is required eg. react");

const versionIndex = pkg.lastIndexOf("@");
if (versionIndex > 0) {
  version = pkg.slice(versionIndex + 1);
  pkg = pkg.slice(0, versionIndex);
}

// Walks a package tree and calls the function for each package.
function walk(pkg, fn) {
  function _walk(pkg, fn, depth) {
    fn(pkg, depth);
    if (Array.isArray(pkg.dependencies)) {
      Object.values(pkg.dependencies).forEach((pkg) =>
        _walk(pkg, fn, depth + 1)
      );
    }
  }
  _walk(pkg, fn, 0);
}

(async () => {
  const root = await fetchPackageDependencies(pkg, version);
  walk(root, (pkg, depth) => {
    const pad = new Array(depth + 1).join("    ");
    if (pkg.error) {
      console.log(`${pad}${pkg.name} ERROR: ${pkg.error}`);
    } else {
      console.log(`${pad}${pkg.name}@${pkg.version}`);
    }
  });
})();
