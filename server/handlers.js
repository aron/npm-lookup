import { parse } from "url";
import { renderIndex } from "./renderers.js";
import { fetchPackageDependencies } from "../lib/list_dependencies.js";

// Renders the index page of the HTML app. Looks up and returns an npm package
// provided via the `pkg` query string param. An optional version can also
// be included using the syntax `<package>@<version>`.
export async function handleIndex(req, res) {
  let { pkg: query } = parse(req.url, true).query;
  let version = "latest";

  const isXHR = !!req.headers["xmlhttprequest"];

  let pkg = null;
  let isPkgNotFound = false;

  if (query) {
    try {
      const versionIndex = query.lastIndexOf("@");
      if (versionIndex > 0) {
        version = query.slice(versionIndex + 1);
        query = query.slice(0, versionIndex);
      }

      pkg = await fetchPackageDependencies(query, version, {
        cache: req.packageCache,
      });
    } catch (err) {
      // Our query failed so we can show a user facing message, otherwise we'll re-throw.
      // TODO: Use a custom Error subclass in the client.
      if (err.message.includes("Not found")) {
        isPkgNotFound = true;
      } else {
        throw err;
      }
    }
  }

  // Render main page, but only include contents for XHR requests
  const html = await renderIndex(
    {
      query: version === "latest" ? query : `${query}@${version}`,
      package: pkg,
      isPkgNotFound,
    },
    { contentOnly: isXHR }
  );

  res.setHeader("Content-Type", "text/html");
  res.write(html);
  res.end();
}
