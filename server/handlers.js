const urlutils = require('url');
const {renderIndex} = require('./renderers');
const {fetchPackageDependencies} = require('../lib/list_dependencies');

exports.handleIndex = async function handleIndex(req, res) {
  const {pkg: query} = urlutils.parse(req.url, true).query;
  const isXHR = !!req.headers['xmlhttprequest'];

  let pkg = null;
  let isPkgNotFound = false;

  if (query) {
    try {
      pkg = await fetchPackageDependencies(query, 'latest', req.packageCache);
    } catch (err) {
      // Our query failed so we can show a user facing message, otherwise we'll re-throw.
      if (err.message.includes('Not found')) {
        isPkgNotFound = true;
      } else {
        throw err;
      }
    }
  }

  // Render main page, but only include contents for XHR requests
  return renderIndex({query, package: pkg, isPkgNotFound}, {contentOnly: isXHR}).then(writer(req, res));
};

// Helper to build an appropriate HTTP response, will return a function
// that will write the provided HTML document into the response.
function writer(req, res) {
  return function (html) {
    res.setHeader('Content-Type', 'text/html');
    res.write(html);
    res.end();
  };
}