import client from "../registry_client.js";
import https from "https";
import sinon from "sinon";

describe("fetchPackageMetadata", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sandbox.stub(https, "request").returns({
      setEncoding: sinon.stub(),
      on: sinon.stub(),
      end: sinon.stub(),
    });
  });

  afterEach(() => sandbox.restore());

  it("makes a request to the npmjs registry for the package provided", () => {
    client.fetchPackageMetadata("express");
    sinon.assert.calledWith(
      https.request,
      sinon.match({
        path: "/express",
      }),
      sinon.match.func
    );
  });

  it("resolves the returned promise on a successful (2xx) response");
  it("rejects the returned promise on an unsuccessful (non 2xx) response");
  it("rejects the returned promise when unable to parse the body");
});
