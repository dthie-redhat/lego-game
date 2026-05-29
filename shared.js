const DEFAULT_TOTAL_BRICKS = 100;
const MIN_BRICKS = 4;
const MAX_BRICKS = 300;
const STATE_KEY = "pick-a-brick-state-v9";
const MODE_KEY = "pick-a-brick-mode-v1";
const COLOURS = ["orange", "red", "yellow", "blue", "green", "black", "white"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const channel = "BroadcastChannel" in window ? new BroadcastChannel("pick-a-brick") : null;

let firestoreSdk = null;
let firestoreDb = null;
let firestoreDocRef = null;

function getMode() {
  return localStorage.getItem(MODE_KEY) || "online";
}

function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode === "offline" ? "offline" : "online");
  notifyLocal();
}

function hasFirebaseConfig() {
  const cfg = window.PICK_A_BRICK_FIREBASE_CONFIG || {};
  return Boolean(cfg.apiKey && cfg.projectId && !String(cfg.apiKey).includes("PASTE_"));
}

async function initFirebase() {
  if (firestoreDb && firestoreDocRef) return { db: firestoreDb, docRef: firestoreDocRef, sdk: firestoreSdk };
  if (!hasFirebaseConfig()) throw new Error("Firebase config is missing. Update firebase-config.js first.");

  const [{ initializeApp }, sdk] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
  ]);

  const app = initializeApp(window.PICK_A_BRICK_FIREBASE_CONFIG);
  firestoreDb = sdk.getFirestore(app);
  firestoreDocRef = sdk.doc(firestoreDb, "games", window.PICK_A_BRICK_GAME_ID || "default");
  firestoreSdk = sdk;
  return { db: firestoreDb, docRef: firestoreDocRef, sdk };
}

function defaultState() {
  return {
    totalBricks: DEFAULT_TOTAL_BRICKS,
    selections: {},
    winnerHistory: [],
    currentBanner: null,
    settings: { testMode: false },
    updatedAt: new Date().toISOString()
  };
}

function normaliseState(value) {
  const base = defaultState();
  const raw = value && typeof value === "object" ? value : {};
  const totalBricks = clampBrickCount(Number(raw.totalBricks || DEFAULT_TOTAL_BRICKS));
  const selections = raw.selections && typeof raw.selections === "object" ? { ...raw.selections } : {};
  const winnerHistory = Array.isArray(raw.winnerHistory) ? raw.winnerHistory : [];
  const settings = { ...base.settings, ...(raw.settings || {}) };

  Object.keys(selections).forEach(key => {
    const number = Number(key);
    if (!Number.isInteger(number) || number < 1 || number > totalBricks) delete selections[key];
  });

  return {
    ...base,
    ...raw,
    totalBricks,
    selections,
    winnerHistory,
    currentBanner: raw.currentBanner || null,
    settings,
    updatedAt: raw.updatedAt || base.updatedAt
  };
}

function getLocalState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) return normaliseState(JSON.parse(saved));
  } catch {}
  return defaultState();
}

function setLocalState(nextState) {
  const state = normaliseState({ ...nextState, updatedAt: new Date().toISOString() });
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  notifyLocal();
  return state;
}

function notifyLocal() {
  if (channel) channel.postMessage({ type: "state" });
  window.dispatchEvent(new CustomEvent("pickabrick-local-change"));
}

function subscribeLocal(callback) {
  const emit = () => callback(getLocalState(), null);
  const onStorage = event => {
    if ([STATE_KEY, MODE_KEY].includes(event.key)) emit();
  };
  const onCustom = () => emit();
  window.addEventListener("storage", onStorage);
  window.addEventListener("pickabrick-local-change", onCustom);
  if (channel) channel.addEventListener("message", onCustom);
  emit();
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pickabrick-local-change", onCustom);
    if (channel) channel.removeEventListener("message", onCustom);
  };
}

async function loadRemoteState() {
  const { docRef, sdk } = await initFirebase();
  const snap = await sdk.getDoc(docRef);
  if (!snap.exists()) {
    const initial = defaultState();
    await sdk.setDoc(docRef, initial);
    return initial;
  }
  return normaliseState(snap.data());
}

async function setRemoteState(nextState) {
  const { docRef, sdk } = await initFirebase();
  const state = normaliseState({ ...nextState, updatedAt: new Date().toISOString() });
  await sdk.setDoc(docRef, state);
  return state;
}

async function subscribeRemote(callback) {
  const { docRef, sdk } = await initFirebase();
  const existing = await sdk.getDoc(docRef);
  if (!existing.exists()) await sdk.setDoc(docRef, defaultState());
  return sdk.onSnapshot(docRef, snap => callback(normaliseState(snap.data()), null), error => callback(null, error));
}

async function getState() {
  if (getMode() === "offline") return getLocalState();
  try { return await loadRemoteState(); }
  catch (error) { throw error; }
}

async function saveState(nextState) {
  if (getMode() === "offline") return setLocalState(nextState);
  return setRemoteState(nextState);
}

async function mutateState(mutator) {
  if (getMode() === "offline") {
    const current = getLocalState();
    const result = mutator(current);
    const nextState = result && result.state ? result.state : current;
    return { state: setLocalState(nextState), result: result && result.result };
  }

  const { db, docRef, sdk } = await initFirebase();
  let transactionResult;
  await sdk.runTransaction(db, async transaction => {
    const snap = await transaction.get(docRef);
    const current = normaliseState(snap.exists() ? snap.data() : defaultState());
    const result = mutator(current);
    const nextState = normaliseState(result && result.state ? result.state : current);
    transaction.set(docRef, nextState);
    transactionResult = result && result.result;
  });
  return { state: await loadRemoteState(), result: transactionResult };
}

async function subscribeState(callback) {
  if (getMode() === "offline") return subscribeLocal(callback);
  try { return await subscribeRemote(callback); }
  catch (error) {
    callback(null, error);
    return () => {};
  }
}

function resetGame(totalBricks) {
  return saveState({ ...defaultState(), totalBricks: clampBrickCount(totalBricks) });
}

function clampBrickCount(value) {
  if (!Number.isFinite(value)) return DEFAULT_TOTAL_BRICKS;
  return Math.max(MIN_BRICKS, Math.min(MAX_BRICKS, Math.round(value)));
}

function validateEmail(email) { return EMAIL_REGEX.test(email); }

function randomTestEmail() {
  const adjectives = ["red", "blue", "swift", "cloud", "nova", "pixel", "bright", "rapid", "solar", "quiet"];
  const nouns = ["fox", "otter", "hawk", "raven", "lynx", "panda", "falcon", "tiger", "badger", "koala"];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${a}${n}${suffix}@test.local`;
}

function csvSafe(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp() { return new Date().toISOString().slice(0, 10); }

function buildCsv(state) {
  const rows = [["Number", "Email", "Selected at", "Drawn at", "Draw order"]];
  Object.values(state.selections)
    .sort((a, b) => Number(a.number) - Number(b.number))
    .forEach(selection => {
      const drawIndex = state.winnerHistory.findIndex(w => Number(w.number) === Number(selection.number));
      rows.push([
        selection.number,
        selection.email || "",
        selection.selectedAt || "",
        selection.drawnAt || "",
        drawIndex >= 0 ? drawIndex + 1 : ""
      ]);
    });
  return rows.map(row => row.map(csvSafe).join(",")).join("\n");
}
