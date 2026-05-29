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
  else if (!hasFirebaseConfig()) showNotice("Firebase is not configured yet. Complete firebase-config.js or switch to offline mode in admin.html.");
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
    btn.className = `brick-button brick-${colour} ${isPicked ? "picked" : ""}`;
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
function renderBanner() {
  if (!state.lastWinner) { winnerPanel.classList.add("hidden"); winnerPanel.innerHTML = ""; return; }
  winnerPanel.innerHTML = `<button class="close-banner" type="button" aria-label="Close winner banner">×</button>🏆 Winner: Brick ${state.lastWinner.number}<small>Organiser can see the matching email on admin.html</small>`;
  winnerPanel.classList.remove("hidden");
  winnerPanel.querySelector("button").addEventListener("click", async () => { try { await clearLastWinnerBanner(); } catch { winnerPanel.classList.add("hidden"); } });
}
function openEntryDialog(number) {
  if (state.testMode) { claimBrick(number, randomTestEmail()).catch(err => alert(err.message)); return; }
  pendingNumber = number;
  dialogText.textContent = `You are choosing brick ${number}.`;
  entrantEmail.value = "";
  emailError.textContent = "";
  if (typeof dialog.showModal === "function") dialog.showModal(); else alert("Dialog support is required. Use a current browser.");
  setTimeout(() => entrantEmail.focus(), 50);
}
cancelPick.addEventListener("click", () => dialog.close());
entryForm.addEventListener("submit", async ev => {
  ev.preventDefault();
  const email = entrantEmail.value.trim();
  if (!EMAIL_REGEX.test(email)) { emailError.textContent = "Please enter a valid email address."; return; }
  try { await claimBrick(pendingNumber, email); dialog.close(); }
  catch (err) { emailError.textContent = err.message; }
});
fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});
