const testModeBox = document.getElementById("testMode");
const brickCount = document.getElementById("brickCount");
const applyBrickCount = document.getElementById("applyBrickCount");
const drawWinnerBtn = document.getElementById("drawWinner");
const resetBoardBtn = document.getElementById("resetBoard");
const adminNotice = document.getElementById("adminNotice");
const entriesCount = document.getElementById("entriesCount");
const totalBricksAdmin = document.getElementById("totalBricksAdmin");
const remainingAdmin = document.getElementById("remainingAdmin");
const winnersAdmin = document.getElementById("winnersAdmin");
const connectionState = document.getElementById("connectionState");
const winnerHistory = document.getElementById("winnerHistory");
let state = { totalBricks: 100, selections: {}, winnerHistory: [], testMode: false };

subscribeState((nextState, error, connectionLabel) => {
  if (connectionLabel) connectionState.textContent = connectionLabel;
  if (error) notice(error.message);
  if (!nextState) return;
  state = nextState;
  hideNotice();
  renderAdmin();
});

function notice(msg) {
  adminNotice.textContent = msg;
  adminNotice.classList.remove("hidden");
}

function hideNotice() {
  adminNotice.textContent = "";
  adminNotice.classList.add("hidden");
}

function renderAdmin() {
  const picked = Object.keys(state.selections || {}).length;
  totalBricksAdmin.textContent = state.totalBricks;
  entriesCount.textContent = picked;
  remainingAdmin.textContent = state.totalBricks - picked;
  winnersAdmin.textContent = (state.winnerHistory || []).length;
  brickCount.value = state.totalBricks;
  testModeBox.checked = Boolean(state.testMode);

  winnerHistory.innerHTML = state.winnerHistory.length ? "" : `<p class="muted">No winners drawn yet.</p>`;
  [...state.winnerHistory].reverse().forEach(winner => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<strong>#${escapeHtml(winner.drawOrder)}: Brick ${escapeHtml(winner.number)}</strong><br>${escapeHtml(winner.email)}<br><span class="muted">${new Date(winner.timestamp).toLocaleString()}</span>`;
    winnerHistory.appendChild(div);
  });
}

testModeBox.addEventListener("change", async () => {
  try {
    state = await setTestMode(testModeBox.checked);
    renderAdmin();
  } catch (err) {
    alert(err.message);
  }
});

applyBrickCount.addEventListener("click", async () => {
  const total = Number(brickCount.value);
  if (!Number.isInteger(total) || total < 4 || total > 500) {
    alert("Choose a brick count between 4 and 500.");
    return;
  }
  if (!confirm(`Reset the game and render ${total} bricks?`)) return;
  try {
    state = await resetGame(total);
    renderAdmin();
  } catch (err) {
    alert(err.message);
  }
});

drawWinnerBtn.addEventListener("click", async () => {
  try {
    state = await drawWinner();
    renderAdmin();
  } catch (err) {
    alert(err.message);
  }
});

resetBoardBtn.addEventListener("click", async () => {
  if (!confirm("Reset everything including entries and winners?")) return;
  try {
    state = await resetGame(state.totalBricks);
    renderAdmin();
  } catch (err) {
    alert(err.message);
  }
});
