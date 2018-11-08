import http from "http";
import pathutils from "path";
import urlutils from "url";
import { handleIndex } from "./handlers.js";
import { serveFile } from "./serve_file.js";
import { createCache } from "../lib/cache.js";

// In-memory cache to hold package metadata to speed up look-ups.
// NOTE: This could be replaced by something like Redis in future to
// share the cache across processes.
const packageCache = createCache();

// Renders a 500 Internal Error page.
function errorHandler(req, res) {
  serveFile("../templates/500.html", 500, {}, req, res);
}

// Renders a 404 Not Found page.
function notFoundHandler(req, res) {
  serveFile("../templates/404.html", 404, {}, req, res);
}

function maybePurgeCache() {
  // Clean up expired cache entries once in every 100 or so requests.
  // TODO: This would be better handled as a scheduled job.
  const randomValue = Math.floor(Math.random() * Math.floor(100));
  if (randomValue === 0) {
    packageCache.purgeExpiredEntries();
  }
}

// Crude HTTP server with path based routing for dynamic handlers and will
// fallback to trying to serve assets from the /static directory. Will 404 if
// path does not match handlers.
export function createServer() {
  return http.createServer(async (req, res) => {
    // Make the in memory cache available to handlers.
    req.packageCache = packageCache;

    try {
      const path = urlutils.parse(req.url).pathname;
      switch (path) {
        case "/":
          // Primary entry point
          return await handleIndex(req, res);
        default:
          // Static handler...
          return await serveFile(
            pathutils.join("../static", pathutils.basename(req.url)),
            200,
            {},
            req,
            res
          );
      }
    } catch (err) {
      if (err && err.code === "ENOENT") {
        return notFoundHandler(req, res);
      }

      console.error(err);
      errorHandler(req, res);
    } finally {
      maybePurgeCache();
    }
  });
}
