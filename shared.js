const STORAGE_KEY = "pickABrickState.v3";
const MODE_KEY = "pickABrickMode.v3";
const COLOURS = ["orange", "red", "blue", "green", "yellow", "black", "white"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const DEFAULT_TOTAL = 100;
const adjectives = ["swift", "blue", "red", "bright", "smart", "rapid", "pixel", "nova", "cloud", "solar", "brisk", "neon"];
const nouns = ["fox", "bear", "otter", "hawk", "eagle", "tiger", "wolf", "lynx", "falcon", "raven", "badger", "panda"];

function defaultState(total = DEFAULT_TOTAL) {
  return {
    totalBricks: Number(total) || DEFAULT_TOTAL,
    selections: {},
    winnerHistory: [],
    lastWinner: null,
    testMode: false,
    usedEmails: {},
    updatedAt: new Date().toISOString()
  };
}
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function normaliseState(raw) {
  const state = Object.assign(defaultState(), raw || {});
  state.totalBricks = Number(state.totalBricks) || DEFAULT_TOTAL;
  state.selections = state.selections || {};
  state.winnerHistory = Array.isArray(state.winnerHistory) ? state.winnerHistory : [];
  state.testMode = Boolean(state.testMode);
  state.usedEmails = state.usedEmails && typeof state.usedEmails === "object" ? state.usedEmails : {};

  // Back-fill usedEmails from existing entries. This makes the uniqueness guard
  // work even if a previous app version wrote entries without the usedEmails map.
  Object.values(state.selections || {}).forEach(entry => {
    const email = normaliseEmail(entry?.email);
    if (email) state.usedEmails[emailKey(email)] = email;
  });

  return state;
}
function normaliseEmail(email) {
  return String(email || "").trim().toLowerCase();
}
function emailKey(email) {
  // Firestore-safe key. Email addresses contain dots, which are awkward in field paths.
  // This keeps the original email as the value while using a simple encoded key.
  return btoa(unescape(encodeURIComponent(normaliseEmail(email)))).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function isEmailAlreadyUsed(state, email) {
  const normalised = normaliseEmail(email);
  if (!normalised) return false;
  const key = emailKey(normalised);
  if (state.usedEmails && state.usedEmails[key]) return true;
  return Object.values(state.selections || {}).some(entry => normaliseEmail(entry?.email) === normalised);
}
function getMode() { return localStorage.getItem(MODE_KEY) || "firebase"; }
function setMode(mode) { localStorage.setItem(MODE_KEY, mode === "offline" ? "offline" : "firebase"); }
function loadLocalState() { return normaliseState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
function saveLocalState(state) {
  const next = normaliseState(state);
  next.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("pickABrickLocalChange", { detail: next }));
  return next;
}
function randomTestEmail() {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const x = Math.floor(10 + Math.random() * 90);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${a}${n}${x}${suffix}@test.local`;
}
function hasFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG || {};
  return cfg.apiKey && !String(cfg.apiKey).includes("PASTE_") && cfg.projectId && !String(cfg.projectId).includes("PASTE_");
}
function gameDocPath() { return `games/${window.GAME_ID || "ntt-redhat-lego-game"}`; }
let firebaseParts = null;
async function getFirebase() {
  if (firebaseParts) return firebaseParts;
  if (!hasFirebaseConfig()) throw new Error("Firebase config has not been completed in firebase-config.js");
  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
  const app = appMod.initializeApp(window.FIREBASE_CONFIG);
  const db = fsMod.getFirestore(app);
  firebaseParts = { db, ...fsMod };
  return firebaseParts;
}
async function getState() {
  if (getMode() === "offline") return loadLocalState();
  const f = await getFirebase();
  const ref = f.doc(f.db, gameDocPath());
  const snap = await f.getDoc(ref);
  if (!snap.exists()) {
    const state = defaultState();
    await f.setDoc(ref, state);
    return state;
  }
  return normaliseState(snap.data());
}
async function setState(state) {
  const next = normaliseState(state);
  next.updatedAt = new Date().toISOString();
  if (getMode() === "offline") return saveLocalState(next);
  const f = await getFirebase();
  await f.setDoc(f.doc(f.db, gameDocPath()), next);
  return next;
}
async function updateState(mutator) {
  if (getMode() === "offline") {
    const state = loadLocalState();
    const next = normaliseState(mutator(clone(state)) || state);
    return saveLocalState(next);
  }
  const f = await getFirebase();
  const ref = f.doc(f.db, gameDocPath());
  let finalState;
  await f.runTransaction(f.db, async tx => {
    const snap = await tx.get(ref);
    const state = snap.exists() ? normaliseState(snap.data()) : defaultState();
    finalState = normaliseState(mutator(clone(state)) || state);
    finalState.updatedAt = new Date().toISOString();
    tx.set(ref, finalState);
  });
  return finalState;
}
async function subscribeState(callback) {
  if (getMode() === "offline") {
    callback(loadLocalState());
    const handler = ev => callback(normaliseState(ev.detail || loadLocalState()));
    window.addEventListener("storage", handler);
    window.addEventListener("pickABrickLocalChange", handler);
    return () => { window.removeEventListener("storage", handler); window.removeEventListener("pickABrickLocalChange", handler); };
  }
  try {
    const f = await getFirebase();
    const ref = f.doc(f.db, gameDocPath());
    const snap = await f.getDoc(ref);
    if (!snap.exists()) await f.setDoc(ref, defaultState());
    return f.onSnapshot(ref, s => callback(normaliseState(s.data())), err => callback(null, err));
  } catch (err) {
    callback(null, err);
    return () => {};
  }
}
async function claimBrick(number, email) {
  number = Number(number);
  email = normaliseEmail(email);
  if (!EMAIL_REGEX.test(email)) throw new Error("Please enter a valid email address.");

  return updateState(state => {
    state.usedEmails = state.usedEmails || {};

    if (number < 1 || number > state.totalBricks) throw new Error("That number is outside the current board.");
    if (state.selections[number]) throw new Error("That brick has already been selected.");

    if (isEmailAlreadyUsed(state, email)) {
      throw new Error("This email address has already been used for today's draw.");
    }

    state.selections[number] = { email, number, timestamp: new Date().toISOString(), drawn: false, drawOrder: "" };
    state.usedEmails[emailKey(email)] = email;
    return state;
  });
}
async function drawWinner() {
  return updateState(state => {
    const available = Object.keys(state.selections).map(Number).filter(n => !state.selections[n].drawn);
    if (!available.length) throw new Error("There are no undrawn entries available.");
    const number = available[Math.floor(Math.random() * available.length)];
    const entry = state.selections[number];
    const winner = { number, email: entry.email, timestamp: new Date().toISOString(), drawOrder: state.winnerHistory.length + 1 };
    entry.drawn = true;
    entry.drawOrder = winner.drawOrder;
    state.lastWinner = winner;
    state.winnerHistory.push(winner);
    return state;
  });
}
async function clearLastWinnerBanner() {
  return updateState(state => { state.lastWinner = null; return state; });
}
async function resetGame(total) { return setState(defaultState(Number(total) || DEFAULT_TOTAL)); }
async function setTestMode(enabled) { return updateState(state => { state.testMode = Boolean(enabled); return state; }); }
function entriesToCsv(state) {
  const rows = [["Number","Email","Selected At","Drawn","Draw Order"]];
  for (let i=1;i<=state.totalBricks;i++) {
    const e = state.selections[i];
    if (e) rows.push([i, e.email || "", e.timestamp || "", e.drawn ? "yes" : "no", e.drawOrder || ""]);
  }
  return rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
}
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
