// Walks a package tree and calls the function for each package.
exports.walk = function walk(pkg, fn) {
  function _walk(pkg, fn, depth) {
    fn(pkg, depth);
    if (Array.isArray(pkg.dependencies)) {
      Object.values(pkg.dependencies).forEach(pkg => _walk(pkg, fn, depth + 1));
    }
  }
  _walk(pkg, fn, 0);
}
