/* ARstore server: static files + data persistence API.
   Data is saved to data.json on the server so it is not lost
   when the browser cache is cleared. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");
const UPLOADS = path.join(ROOT, "uploads");
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 25 * 1024 * 1024) { reject(new Error("payload too large")); req.destroy(); }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

http.createServer(async (req, res) => {
  const reqPath = (req.url || "/").split("?")[0];

  /* ---------------- API: persist app data ---------------- */
  if (reqPath === "/api/data") {
    if (req.method === "GET") {
      fs.readFile(DATA_FILE, (err, data) => {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(err ? "{}" : data);
      });
      return;
    }
    if (req.method === "POST") {
      try {
        const raw = await readBody(req);
        const obj = JSON.parse(raw || "{}");
        fs.writeFile(DATA_FILE, JSON.stringify(obj), (err) => {
          res.writeHead(err ? 500 : 200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: !err }));
        });
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      return;
    }
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "method not allowed" }));
    return;
  }

  /* ---------------- API: upload product image ----------------
     Saves the file under /uploads and returns a real hosted URL,
     so product photos are not stored as local base64. */
  if (reqPath === "/api/upload") {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "method not allowed" }));
      return;
    }
    try {
      const raw = await readBody(req);
      const obj = JSON.parse(raw || "{}");
      const m = /^data:image\/([a-z0-9+]+);base64,(.+)$/i.exec(obj.data || "");
      if (!m) throw new Error("invalid image data");
      const extMap = { jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", gif: "gif", svg: "svg" };
      const ext = extMap[m[1].toLowerCase()] || "jpg";
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > 8 * 1024 * 1024) throw new Error("image too large (max 8MB)");
      if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
      const name = "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8) + "." + ext;
      fs.writeFileSync(path.join(UPLOADS, name), buf);
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: true, url: "/uploads/" + name }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  /* ---------------- static files ---------------- */
  let p = decodeURIComponent(reqPath);
  if (p === "/") p = "/index.html";
  const file = path.resolve(ROOT, "." + p);
  const inside = file === ROOT || file.startsWith(ROOT + path.sep);
  if (!inside) { res.writeHead(403); res.end("Forbidden"); return; }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found: " + p);
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log("✦ ARstore running at http://localhost:" + PORT);
});
