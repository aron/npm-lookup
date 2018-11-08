import https from "https";
import urlutils from "url";

const NPM_REGISTRY_ROOT = "https://registry.npmjs.org";

// NOTE: We export an object here so the function can be stubbed under test.
export default {
  // Fetches the "install" version of the package data from the npm registry.
  // This includes all version information.
  async fetchPackageMetadata(pkg) {
    return request(`/${encodeURIComponent(pkg)}`, "GET");
  },
};

/** Promise wrapper around http.request that resolves on a 2xx response. */
export async function request(path, method, data) {
  method = method.toUpperCase();
  const parsed = urlutils.parse(NPM_REGISTRY_ROOT);
  const options = {
    ...parsed,
    path: path,
    method: method,
    timeout: 300,
    headers: {
      // Asks the server to provide a reduced set of data for smaller payload using
      // a custom resource type.
      // See: https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md#package-metadata
      // TODO: Pass this in as an argument as this is not appropriate for a generic header.
      Accept:
        "application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*",
    },
  };

  return new Promise(function (resolve, reject) {
    const req = https.request(options, function (res) {
      let chunks = [];
      res.setEncoding("utf8");
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", function () {
        const body = chunks.join("");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Request for ${path} was unsuccessful: ${body}`));
        } else {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        }
      });
      res.on("error", reject);
    });

    if (method !== "GET" && data) {
      req.write(JSON.stringify(data));
    }

    req.on("error", reject);
    req.end();
  });
}
