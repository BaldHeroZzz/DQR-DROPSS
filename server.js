const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const DROP_TOKEN = process.env.DROP_TOKEN || "";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "drops.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

let drops = [];
try { drops = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { drops = []; }
const clients = new Set();

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(drops.slice(0, 1000), null, 2));
}
function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}
function broadcast(drop) {
  const payload = `data: ${JSON.stringify(drop)}\n\n`;
  for (const client of clients) client.write(payload);
}
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 32_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}
function normalizeDrop(input) {
  const allowed = ["ultimate", "legendary", "epic_t3"];
  const rarity = String(input.rarity || "").toLowerCase();
  if (!allowed.includes(rarity)) throw new Error("rarity must be ultimate, legendary, or epic_t3");
  const item = String(input.item || "").trim().slice(0, 100);
  const player = String(input.player || "Unknown player").trim().slice(0, 60);
  if (!item) throw new Error("item is required");
  return {
    id: crypto.randomUUID(),
    rarity,
    item,
    player,
    detail: String(input.detail || "").trim().slice(0, 160),
    createdAt: new Date().toISOString()
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/drops") {
    return send(res, 200, drops.slice(0, 200));
  }
  if (req.method === "GET" && url.pathname === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write("retry: 3000\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/drops") {
    if (!DROP_TOKEN) return send(res, 503, { error: "Server owner must configure DROP_TOKEN first." });
    if (!safeEqual(req.headers["x-drop-token"] || "", DROP_TOKEN)) {
      return send(res, 401, { error: "Invalid drop token." });
    }
    try {
      const body = await readBody(req);
      const drop = normalizeDrop(body);
      drops.unshift(drop);
      drops = drops.slice(0, 1000);
      save();
      broadcast(drop);
      return send(res, 201, { ok: true, drop });
    } catch (err) {
      return send(res, 400, { error: err.message || "Bad request" });
    }
  }

  let filePath = url.pathname === "/" ? path.join(PUBLIC_DIR, "index.html") :
    path.join(PUBLIC_DIR, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: "Forbidden" });
  fs.readFile(filePath, (err, content) => {
    if (err) return send(res, 404, { error: "Not found" });
    const ext = path.extname(filePath);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(content);
  });
});

server.listen(PORT, () => console.log(`Ultimate Drop Tracker running on port ${PORT}`));
