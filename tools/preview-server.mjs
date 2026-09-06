// Minimal static server for eyeballing the built _site locally.
// npm run preview  ->  http://localhost:8788
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xml": "application/xml",
  ".txt": "text/plain",
};

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path.join("_site", pathname);
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    } catch {
      file = path.join("_site", "404.html");
    }
    try {
      const body = fs.readFileSync(file);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
    }
  })
  .listen(8788, () => console.log("preview: http://localhost:8788"));
