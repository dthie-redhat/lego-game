const COLOURS = ["orange", "red", "blue", "green", "yellow", "black", "white"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const DISMISSED_WINNER_KEY = "pickABrickDismissedWinner.postgres.v1";
const adjectives = ["swift", "blue", "red", "bright", "smart", "rapid", "pixel", "nova", "cloud", "solar", "brisk", "neon"];
const nouns = ["spark", "beam", "brick", "stack", "pilot", "signal", "vector", "orbit", "pixel", "summit", "marker", "relay"];

const BRICK_ASSETS = {
  "--brick-grey-wide": "./assets/brick-grey.png",
  "--brick-grey-tall": "./assets/brick-grey-vertical.png",
  "--brick-grey-square": "./assets/brick-grey-square.png",
  "--brick-orange-wide": "./assets/brick-orange.png",
  "--brick-orange-tall": "./assets/brick-orange-vertical.png",
  "--brick-orange-square": "./assets/brick-orange-square.png",
  "--brick-red-wide": "./assets/brick-red.png",
  "--brick-red-tall": "./assets/brick-red-vertical.png",
  "--brick-red-square": "./assets/brick-red-square.png",
  "--brick-blue-wide": "./assets/brick-blue.png",
  "--brick-blue-tall": "./assets/brick-blue-vertical.png",
  "--brick-blue-square": "./assets/brick-blue-square.png",
  "--brick-green-wide": "./assets/brick-green.png",
  "--brick-green-tall": "./assets/brick-green-vertical.png",
  "--brick-green-square": "./assets/brick-green-square.png",
  "--brick-yellow-wide": "./assets/brick-yellow.png",
  "--brick-yellow-tall": "./assets/brick-yellow-vertical.png",
  "--brick-yellow-square": "./assets/brick-yellow-square.png",
  "--brick-black-wide": "./assets/brick-black.png",
  "--brick-black-tall": "./assets/brick-black-vertical.png",
  "--brick-black-square": "./assets/brick-black-square.png",
  "--brick-white-wide": "./assets/brick-white.png",
  "--brick-white-tall": "./assets/brick-white-vertical.png",
  "--brick-white-square": "./assets/brick-white-square.png"
};

function assetUrl(path) {
  return `${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(window.APP_VERSION || "dev")}`;
}

function applyAssets() {
  Object.entries(BRICK_ASSETS).forEach(([name, path]) => {
    document.documentElement.style.setProperty(name, `url("${assetUrl(path)}")`);
  });
  document.querySelectorAll("[data-cache-src]").forEach(el => {
    el.setAttribute("src", assetUrl(el.getAttribute("data-cache-src")));
  });
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const type = res.headers.get("content-type") || "";
  const body = type.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body.error || "Request failed.");
  return body;
}

async function getState() {
  return api("/api/state", { method: "GET", headers: {} });
}

async function claimBrick(number, email) {
  return api("/api/claim", { method: "POST", body: JSON.stringify({ number, email }) });
}

async function drawWinner() {
  return api("/api/admin/draw", { method: "POST", body: "{}" });
}

async function resetGame(totalBricks) {
  return api("/api/admin/reset", { method: "POST", body: JSON.stringify({ totalBricks }) });
}

async function setTestMode(enabled) {
  return api("/api/admin/test-mode", { method: "POST", body: JSON.stringify({ enabled }) });
}

function subscribeState(callback) {
  const source = new EventSource("/api/events");
  source.addEventListener("state", ev => callback(JSON.parse(ev.data)));
  source.addEventListener("open", () => callback(null, null, "Live"));
  source.addEventListener("error", () => callback(null, new Error("Live connection lost. Reconnecting..."), "Reconnecting"));
  return () => source.close();
}

function randomTestEmail() {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const x = Math.floor(1000 + Math.random() * 9000);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${a}-${n}-${x}-${suffix}@test.local`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}

function brickShapeFor(number) {
  const pattern = [
    "wide", "wide", "tall", "square", "wide", "tall", "square", "wide",
    "square", "tall", "wide", "wide", "tall", "square", "wide", "square"
  ];
  return pattern[(number - 1) % pattern.length];
}

applyAssets();
