import { createServer } from "../server/index.js";
import http from "http";
import assert from "assert";
import cheerio from "cheerio";

// TODO: Use fixtures to mock out the registry.npmjs.org API,
// TODO: Use a more robust HTTP request & assertion library.
describe("/", function () {
  this.timeout(30000);

  const server = createServer();

  before((done) => {
    server.listen({ host: "localhost", port: 0 }, function () {
      done();
    });
  });

  after(() => {
    server.close();
  });

  async function request(path, options) {
    const { host, port } = server.address();
    options = { ...options, path, host, port };

    return new Promise(function (resolve, reject) {
      const req = http.request(options, function (res) {
        let chunks = [];
        res.setEncoding("utf8");
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", function () {
          res.body = chunks.join("");
          resolve(res);
        });
        res.on("error", reject);
      });
      req.on("error", reject);
      req.end();
    });
  }

  it("serves a form", async () => {
    const res = await request("/");
    assert.equal(res.statusCode, 200);

    const dom = cheerio.load(res.body);
    assert.equal(dom("h1").text(), "Dependency Lookup");
    assert.equal(dom("input[type=text]").length, 1);
    assert.equal(dom("button[type=submit]").text(), "Search");
  });

  it("loads results", async () => {
    const res = await request("/?pkg=react");
    assert.equal(res.statusCode, 200);

    const dom = cheerio.load(res.body);
    assert.equal(dom("header h1").text(), "Dependency Lookup");
    assert.equal(dom("input[type=text]").text(), "");
    assert.equal(dom("button[type=submit]").text(), "Search");

    assert.equal(dom("[role=main] h1").text(), "Showing results for “react”");
    assert.ok(dom("[role=main] .package").length);
  });

  it("loads results for a specific version", async () => {
    const res = await request("/?pkg=express@1.0.0");
    assert.equal(res.statusCode, 200);

    const dom = cheerio.load(res.body);
    assert.equal(dom("header h1").text(), "Dependency Lookup");
    assert.equal(dom("input[type=text]").text(), "");
    assert.equal(dom("button[type=submit]").text(), "Search");

    assert.equal(
      dom("[role=main] h1").text(),
      "Showing results for “express@1.0.0”"
    );
    assert.ok(dom("[role=main] .package").length);
  });

  it("shows a 404 error if the package is not found", async () => {
    const res = await request("/?pkg=1234abcd");
    assert.equal(res.statusCode, 200);

    const dom = cheerio.load(res.body);
    assert.equal(dom("header h1").text(), "Dependency Lookup");
    assert.equal(dom("input[type=text]").text(), "");
    assert.equal(dom("button[type=submit]").text(), "Search");

    assert.equal(dom("[role=main] h1").text(), "No results for “1234abcd”");
    assert.equal(dom("[role=main] .package").length, 0);
  });

  it(
    "serves only the results snippet when the XMLHTTPRequest header is provided"
  );
});
