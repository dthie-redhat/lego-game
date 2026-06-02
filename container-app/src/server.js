import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, waitForDatabase } from "./db.js";
import { migrate } from "./migrate.js";
import { claimBrick, drawWinner, entriesCsv, getState, resetGame, setTestMode } from "./state.js";

const PORT = Number(process.env.PORT || 8080);
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "public");
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, err) {
  const status = err.status || 500;
  sendJson(res, status, { error: err.status ? err.message : "Unexpected server error." });
  if (!err.status) console.error(err);
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 64 * 1024) throw Object.assign(new Error("Request body is too large."), { status: 413 });
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
}

function sendEvent(res, state) {
  res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
}

async function broadcastState() {
  const state = await getState();
  for (const res of clients) sendEvent(res, state);
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    await pool.query("SELECT 1");
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    return sendJson(res, 200, await getState());
  }

  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    });
    clients.add(res);
    sendEvent(res, await getState());
    const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25000);
    req.on("close", () => {
      clearInterval(heartbeat);
      clients.delete(res);
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/claim") {
    const body = await readBody(req);
    const state = await claimBrick(body.number, body.email);
    await broadcastState();
    return sendJson(res, 201, state);
  }

  if (req.method === "POST" && url.pathname === "/api/admin/draw") {
    const state = await drawWinner();
    await broadcastState();
    return sendJson(res, 200, state);
  }

  if (req.method === "POST" && url.pathname === "/api/admin/reset") {
    const body = await readBody(req);
    const state = await resetGame(body.totalBricks);
    await broadcastState();
    return sendJson(res, 200, state);
  }

  if (req.method === "POST" && url.pathname === "/api/admin/test-mode") {
    const body = await readBody(req);
    const state = await setTestMode(body.enabled);
    await broadcastState();
    return sendJson(res, 200, state);
  }

  if (req.method === "GET" && url.pathname === "/api/admin/export.csv") {
    const csv = await entriesCsv();
    res.writeHead(200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="pick-a-brick-entries-${new Date().toISOString().slice(0, 10)}.csv"`
    });
    return res.end(csv);
  }

  return sendJson(res, 404, { error: "API route not found." });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) return sendJson(res, 403, { error: "Forbidden." });

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": filePath.includes("/assets/") ? "public, max-age=86400" : "no-cache"
    });
    createReadStream(filePath).pipe(res);
  } catch {
    sendJson(res, 404, { error: "Not found." });
  }
}

async function requestHandler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (err) {
    return sendError(res, err);
  }
}

await waitForDatabase();
await migrate();

const { createServer } = await import("node:http");
const server = createServer(requestHandler);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Pick a Brick app listening on ${PORT}`);
});
