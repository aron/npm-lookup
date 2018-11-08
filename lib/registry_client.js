const https = require('https');
const urlutils = require('url');
const NPM_REGISTRY_ROOT = 'https://registry.npmjs.org';

// Fetches the package data from the npm registry. This includes
// all version information.
async function fetchPackage(package) {
  return request(`/${encodeURIComponent(package)}`, 'GET')
}
exports.fetchPackageMetadata = fetchPackage;

/** Promise wrapper around http.request */
async function request(path, method, data) {
  method = method.toUpperCase();
  const parsed = urlutils.parse(NPM_REGISTRY_ROOT);
  const options = {
    ...parsed,
    path: path,
    method: method,
    headers: {
      // Asks the server to provide a reduced set of data for smaller payload using
      // a custom resource type.
      // See: https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md#package-metadata
      // TODO: Pass this in as an argument as this is not appropriate for a generic header.
      'Accept': 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
    },
  };

  return new Promise(function (resolve, reject) {
    const req = https.request(options, function (res) {
      let body = '';
      res.on('data', chunk => body += chunk.toString('utf-8'));
      res.on('end', function () {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Request for ${path} was unsuccessful: ${body}`));
        } else {
          resolve(JSON.parse(body));
        }
      });
    });

    if (method !== 'GET' && data) {
      req.write(JSON.stringify(data));
    }

    req.on('error', reject);
    req.end();
  });
}