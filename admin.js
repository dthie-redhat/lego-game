const modeSelect = document.getElementById("modeSelect");
const testModeBox = document.getElementById("testMode");
const disableCacheBox = document.getElementById("disableCache");
const brickCount = document.getElementById("brickCount");
const applyBrickCount = document.getElementById("applyBrickCount");
const drawWinnerBtn = document.getElementById("drawWinner");
const exportCsvBtn = document.getElementById("exportCsv");
const resetBoardBtn = document.getElementById("resetBoard");
const boardLink = document.getElementById("boardLink");
const adminNotice = document.getElementById("adminNotice");
const entriesCount = document.getElementById("entriesCount");
const totalBricksAdmin = document.getElementById("totalBricksAdmin");
const remainingAdmin = document.getElementById("remainingAdmin");
const winnersAdmin = document.getElementById("winnersAdmin");
const currentModeAdmin = document.getElementById("currentModeAdmin");
const winnerHistory = document.getElementById("winnerHistory");
let state = defaultState();
let unsub = null;

async function boot() {
  modeSelect.value = getMode();
  modeSelect.disabled = isModeForced();
  disableCacheBox.checked = isCacheDisabled();
  updateBoardLink();
  await resubscribe();
}
async function resubscribe() {
  if (unsub) unsub();
  unsub = await subscribeState((nextState, error) => {
    if (error) { notice(`Connection issue: ${error.message}`); return; }
    state = nextState;
    renderAdmin();
    updateBoardLink();
    if (isModeForced()) notice("Mode is locked by this page URL. Open admin.html without a mode query parameter to switch modes.");
    else if (getMode() === "offline") notice("Offline mode is active. Admin and board must be on this same browser/device and same site origin to share state.");
    else if (!hasFirebaseConfig()) notice("Firebase is not configured yet. Complete firebase-config.js or use offline mode.");
    else hideNotice();
  });
}
function notice(msg) { adminNotice.textContent = msg; adminNotice.classList.remove("hidden"); }
function hideNotice() { adminNotice.textContent = ""; adminNotice.classList.add("hidden"); }
function updateBoardLink() {
  if (!boardLink) return;
  boardLink.href = isModeForced() ? `./index.html?mode=${encodeURIComponent(getMode())}` : "./index.html";
}
function renderAdmin() {
  const picked = Object.keys(state.selections).length;
  totalBricksAdmin.textContent = state.totalBricks;
  entriesCount.textContent = picked;
  remainingAdmin.textContent = state.totalBricks - picked;
  winnersAdmin.textContent = state.winnerHistory.length;
  currentModeAdmin.textContent = getMode() === "offline" ? "Offline" : "Firebase";
  brickCount.value = state.totalBricks;
  testModeBox.checked = state.testMode;
  winnerHistory.innerHTML = state.winnerHistory.length ? "" : `<p class="muted">No winners drawn yet.</p>`;
  [...state.winnerHistory].reverse().forEach(w => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>#${w.drawOrder}: Brick ${w.number}</strong><br>${w.email}<br><span class="muted">${new Date(w.timestamp).toLocaleString()}</span>`;
    winnerHistory.appendChild(div);
  });
}
modeSelect.addEventListener("change", async () => { setMode(modeSelect.value); updateBoardLink(); await resubscribe(); });
testModeBox.addEventListener("change", async () => { try { await setTestMode(testModeBox.checked); } catch (err) { alert(err.message); } });
disableCacheBox.addEventListener("change", () => {
  try {
    setCacheDisabled(disableCacheBox.checked);
    window.location.reload();
  } catch (err) {
    alert(`Could not update cache setting: ${err.message}`);
  }
});
applyBrickCount.addEventListener("click", async () => {
  const total = Number(brickCount.value);
  if (!Number.isInteger(total) || total < 4 || total > 500) return alert("Choose a brick count between 4 and 500.");
  try { await setTotalBricks(total); } catch (err) { alert(err.message); }
});
drawWinnerBtn.addEventListener("click", async () => { try { await drawWinner(); } catch (err) { alert(err.message); } });
exportCsvBtn.addEventListener("click", () => downloadText(`pick-a-brick-entries-${new Date().toISOString().slice(0,10)}.csv`, entriesToCsv(state)));
resetBoardBtn.addEventListener("click", async () => { if (confirm("Reset everything including entries and winners?")) { try { await resetGame(state.totalBricks); } catch (err) { alert(err.message); } } });
boot();
