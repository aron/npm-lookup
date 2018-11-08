const http = require('http');
const fs = require('fs');
const path = require('path');
const {handleIndex} = require('./handlers');
const urlutil = require('url');
const static = require('node-static');

// In-memory cache to hold package metadata to speed up look-ups.
// NOTE: This will just grow over time, it needs to either purge
// old queries periodically or use something like a ring buffer.
const packageCache = {};

var fileServer = new static.Server(path.join(__dirname, '../static'));

// Renders a 500 Internal Error page.
function errorHandler(req, res) {
   fileServer.serveFile('../templates/500.html', 500, {}, req, res);
}

// Renders a 404 Not Found page.
function notFoundHandler(req, res) {
   fileServer.serveFile('../templates/404.html', 404, {}, req, res);
}

// Crude HTTP server with path based routing for dynamic handlers and will
// fallback to trying to serve assets from the /static directory. Will 404 if
// path does not match handlers.
function createServer() {
  return http.createServer(async (req, res) => {
    // Make the in memory cache available to handlers.
    req.packageCache = packageCache;

    try {
      const path = urlutil.parse(req.url).pathname;
      switch (path) {
      case '/':
        await handleIndex(req, res);
        break;
      default:
        // Static handler...
        req.addListener('end', function () {
          fileServer.serve(req, res, function (err) {
            if (err && (err.status === 404)) {
              notFoundHandler(req, res);
            }
          });
        }).resume();
      }
    } catch (err) {
      console.error(err);
      errorHandler(req, res);
    }
  });
}

exports.createServer = createServer;

// If this file is the main entrypoint start the server.
if (__filename === require.main.filename) {
  const server = createServer();
  const host = process.env.NODE_ENV === 'production' ? undefined : 'localhost';
  server.listen({host, port: process.env.PORT || 8000}, function () {
    const {port, address} = server.address();
    console.log(`server listening on http://${address}:${port}`);
  });
}