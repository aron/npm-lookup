#!/usr/bin/env node
// Usage:
//   $ NODE_ENV=<production|debug> PORT=<port> ./start_server.js

import { createServer } from "../server/index.js";

const server = createServer();
const host = process.env.NODE_ENV === "production" ? undefined : "localhost";
server.listen({ host, port: process.env.PORT || 8000 }, function () {
  const { port, address } = server.address();
  console.log(
    `server listening on http://${address}:${port} press Ctrl-C to exit`
  );
});
