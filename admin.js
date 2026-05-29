const offlineModeToggle = document.getElementById("offlineModeToggle");
const modeStatus = document.getElementById("modeStatus");
const adminRemaining = document.getElementById("adminRemaining");
const adminEntries = document.getElementById("adminEntries");
const adminWinners = document.getElementById("adminWinners");
const drawButton = document.getElementById("drawButton");
const closeBannerButton = document.getElementById("closeBannerButton");
const exportButton = document.getElementById("exportButton");
const resetButton = document.getElementById("resetButton");
const brickCountForm = document.getElementById("brickCountForm");
const brickCountInput = document.getElementById("brickCountInput");
const testModeToggle = document.getElementById("testModeToggle");
const winnerHistoryList = document.getElementById("winnerHistoryList");

let state = defaultState();
let unsubscribe = null;
let resubscribing = false;

async function startAdmin() {
  offlineModeToggle.checked = getMode() === "offline";
  await resubscribe();
}

async function resubscribe() {
  if (resubscribing) return;
  resubscribing = true;
  if (typeof unsubscribe === "function") unsubscribe();
  renderModeStatus();
  unsubscribe = await subscribeState((nextState, error) => {
    if (error) {
      modeStatus.textContent = `Firebase error: ${error.message}. Switch to offline mode if the event connection is wobbling.`;
      return;
    }
    state = nextState;
    renderAdmin();
  });
  resubscribing = false;
}

function renderModeStatus() {
  const mode = getMode();
  if (mode === "offline") {
    modeStatus.textContent = "Offline mode active. Board and admin only sync when opened in this same browser/device.";
  } else if (!hasFirebaseConfig()) {
    modeStatus.textContent = "Online mode selected, but Firebase is not configured. Update firebase-config.js.";
  } else {
    modeStatus.textContent = "Online mode active. Board and admin sync through Firebase across devices.";
  }
}

function renderAdmin() {
  const entries = Object.keys(state.selections).length;
  adminRemaining.textContent = state.totalBricks - entries;
  adminEntries.textContent = entries;
  adminWinners.textContent = state.winnerHistory.length;
  brickCountInput.value = state.totalBricks;
  testModeToggle.checked = Boolean(state.settings && state.settings.testMode);
  renderWinnerHistory();
  renderModeStatus();
}

offlineModeToggle.addEventListener("change", async () => {
  const nextMode = offlineModeToggle.checked ? "offline" : "online";
  const message = nextMode === "offline"
    ? "Switch to offline mode? This will use this browser's local copy and stop cross-device syncing."
    : "Switch to online Firebase mode? The board will use the shared Firebase game state.";
  if (!confirm(message)) {
    offlineModeToggle.checked = !offlineModeToggle.checked;
    return;
  }
  setMode(nextMode);
  await resubscribe();
});

testModeToggle.addEventListener("change", async () => {
  await mutateState(current => ({
    state: normaliseState({
      ...current,
      settings: { ...current.settings, testMode: testModeToggle.checked }
    })
  }));
});

brickCountForm.addEventListener("submit", async event => {
  event.preventDefault();
  const nextTotal = clampBrickCount(Number(brickCountInput.value));
  if (nextTotal !== Number(brickCountInput.value)) brickCountInput.value = nextTotal;
  if (!confirm(`Change the board to ${nextTotal} bricks? This resets all selections and drawn winners.`)) return;
  await resetGame(nextTotal);
});

resetButton.addEventListener("click", async () => {
  if (!confirm("Reset all selected numbers, entries, banners and already-drawn winners?")) return;
  await resetGame(state.totalBricks);
});

closeBannerButton.addEventListener("click", async () => {
  await mutateState(current => ({ state: { ...current, currentBanner: null } }));
});

drawButton.addEventListener("click", async () => {
  try {
    const { result } = await mutateState(current => {
      const selectedEntries = Object.values(current.selections);
      const availableDrawEntries = selectedEntries.filter(selection => !selection.drawnAt);
      if (selectedEntries.length === 0) {
        return { state: { ...current, currentBanner: { message: "No bricks have been selected yet.", celebratory: false, id: crypto.randomUUID() } }, result: { ok: false } };
      }
      if (availableDrawEntries.length === 0) {
        return { state: { ...current, currentBanner: { message: "All selected bricks have already been drawn. Reset the board to start again.", celebratory: false, id: crypto.randomUUID() } }, result: { ok: false } };
      }
      const winner = availableDrawEntries[Math.floor(Math.random() * availableDrawEntries.length)];
      const now = new Date().toISOString();
      const updatedWinner = { ...winner, drawnAt: now };
      const next = normaliseState({
        ...current,
        selections: { ...current.selections, [winner.number]: updatedWinner },
        winnerHistory: [...current.winnerHistory, { number: winner.number, email: winner.email || "", drawnAt: now }],
        currentBanner: { message: `Winner: brick ${winner.number}`, celebratory: true, id: crypto.randomUUID() }
      });
      return { state: next, result: { ok: true, winner: winner.number } };
    });
  } catch (error) {
    alert(`Could not draw a winner: ${error.message}`);
  }
});

exportButton.addEventListener("click", () => {
  const csv = buildCsv(state);
  downloadFile(csv, `pick-a-brick-selections-${dateStamp()}.csv`, "text/csv");
});

function renderWinnerHistory() {
  winnerHistoryList.innerHTML = "";
  if (!state.winnerHistory.length) {
    const li = document.createElement("li");
    li.className = "empty-history";
    li.textContent = "No winners drawn yet.";
    winnerHistoryList.appendChild(li);
    return;
  }
  state.winnerHistory.slice().reverse().forEach((winner, indexFromLatest) => {
    const drawNumber = state.winnerHistory.length - indexFromLatest;
    const li = document.createElement("li");
    const drawnTime = winner.drawnAt ? new Date(winner.drawnAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    li.innerHTML = `<strong>#${drawNumber}: Brick ${escapeHtml(winner.number)}</strong><span>${escapeHtml(winner.email || "No email recorded")}${drawnTime ? ` · ${escapeHtml(drawnTime)}` : ""}</span>`;
    winnerHistoryList.appendChild(li);
  });
}

startAdmin();
