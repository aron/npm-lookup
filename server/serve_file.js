import fs from "fs";
import mime from "mime";
import pathutils from "path";
import urlutils from "url";

const __filename = urlutils.fileURLToPath(import.meta.url);
const __dirname = pathutils.dirname(__filename);

// Very basic static file server that will serve the file provided from disk.
// TODO: Replace with a proper vetted file server.
export async function serveFile(path, status, headers, _req, res) {
  return new Promise((resolve, reject) => {
    const filePath = pathutils.join(__dirname, path);
    try {
      const stat = fs.statSync(filePath);
      res.writeHead(status, {
        ...headers,
        "Content-Type": mime.getType(pathutils.extname(filePath)),
        "Content-Length": stat.size,
      });

      fs.createReadStream(filePath)
        .pipe(res)
        .on("end", resolve)
        .on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}
