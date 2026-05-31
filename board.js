const board = document.getElementById("brickBoard");
const remainingCount = document.getElementById("remainingCount");
const winnersDrawnCount = document.getElementById("winnersDrawnCount");
const fullscreenButton = document.getElementById("fullscreenButton");
const winnerPanel = document.getElementById("winnerPanel");
const connectionNotice = document.getElementById("connectionNotice");
const dialog = document.getElementById("confirmDialog");
const dialogText = document.getElementById("dialogText");
const entryForm = document.getElementById("entryForm");
const entrantEmail = document.getElementById("entrantEmail");
const emailError = document.getElementById("emailError");
const cancelPick = document.getElementById("cancelPick");
let state = defaultState();
let pendingNumber = null;

subscribeState((nextState, error) => {
  if (error) { showNotice(`Connection issue: ${error.message}`); renderBoard(); return; }
  state = nextState;
  renderBoard();
  renderBanner();
  showModeNotice();
});

function showModeNotice() {
  if (getMode() === "offline") showNotice("Offline mode is active on this browser. Cross-device updates are disabled.");
  else if (!hasFirebaseConfig()) showNotice("Firebase is not configured on this device. Please ask an organiser to configure the app or use offline mode.");
  else hideNotice();
}
function showNotice(msg) { connectionNotice.textContent = msg; connectionNotice.classList.remove("hidden"); }
function hideNotice() { connectionNotice.textContent = ""; connectionNotice.classList.add("hidden"); }
function renderBoard() {
  board.innerHTML = "";
  for (let number = 1; number <= state.totalBricks; number++) {
    const colour = COLOURS[(number - 1) % COLOURS.length];
    const isPicked = Boolean(state.selections[number]);
    const btn = document.createElement("button");
    btn.type = "button";
    const shape = brickShapeFor(number);
    btn.className = `brick-button brick-${colour} brick-shape-${shape} ${isPicked ? "picked" : ""}`;
    btn.disabled = isPicked;
    btn.ariaLabel = isPicked ? `Number ${number} has already been selected` : `Select brick number ${number}`;
    btn.innerHTML = `<span class="brick-inner"><span class="brick-face"><span class="brick-number">${number}</span></span><span class="brick-back" aria-hidden="true"></span></span>`;
    btn.addEventListener("click", () => openEntryDialog(number));
    board.appendChild(btn);
  }
  const picked = Object.keys(state.selections).length;
  remainingCount.textContent = String(state.totalBricks - picked);
  winnersDrawnCount.textContent = String(state.winnerHistory.length);
}
function brickShapeFor(number) {
  // A repeating tessellation inspired by physical LEGO layouts.
  // wide = 2x4 brick, tall = rotated 2x4 brick, square = simplified 2x2 brick.
  // CSS grid-auto-flow:dense packs these together so the board scales cleanly
  // when the organiser changes the total brick count.
  const pattern = [
    "wide", "wide", "tall", "square", "wide", "tall", "square", "wide",
    "square", "tall", "wide", "wide", "tall", "square", "wide", "square"
  ];
  return pattern[(number - 1) % pattern.length];
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}
function renderBanner() {
  if (!state.lastWinner) { winnerPanel.classList.add("hidden"); winnerPanel.innerHTML = ""; return; }
  const number = Number(state.lastWinner.number);
  const email = state.lastWinner.email || state.selections?.[number]?.email || "Email not recorded";
  winnerPanel.innerHTML = `<button class="close-banner" type="button" aria-label="Close winner banner">×</button><span class="winner-title">🏆 Winner: Brick ${escapeHtml(number)}</span><small class="winner-email">${escapeHtml(email)}</small>`;
  winnerPanel.classList.remove("hidden");
  winnerPanel.querySelector("button").addEventListener("click", async () => { try { await clearLastWinnerBanner(); } catch { winnerPanel.classList.add("hidden"); } });
}
function openEntryDialog(number) {
  pendingNumber = number;
  dialogText.textContent = `You are choosing brick ${number}.`;
  entrantEmail.value = state.testMode ? randomTestEmail() : "";
  emailError.textContent = "";
  if (typeof dialog.showModal === "function") dialog.showModal(); else alert("Dialog support is required. Use a current browser.");
  setTimeout(() => { entrantEmail.focus(); if (state.testMode) entrantEmail.select(); }, 50);
}
cancelPick.addEventListener("click", () => dialog.close());
entryForm.addEventListener("submit", async ev => {
  ev.preventDefault();
  const email = entrantEmail.value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) { emailError.textContent = "Please enter a valid email address."; return; }
  if (isEmailAlreadyUsed(state, email)) { emailError.textContent = "This email address has already been used for today's draw."; return; }
  try { await claimBrick(pendingNumber, email); dialog.close(); }
  catch (err) { emailError.textContent = err.message; }
});
fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});
