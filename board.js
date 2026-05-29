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
let unsubscribe = null;

async function startBoard() {
  showModeNotice();
  unsubscribe = await subscribeState((nextState, error) => {
    if (error) {
      showNotice(`Connection issue: ${error.message}. Open admin.html and switch to offline mode if needed.`);
      return;
    }
    state = nextState;
    renderBoard();
    renderBanner();
    showModeNotice();
  });
}

function showModeNotice() {
  if (getMode() === "offline") {
    showNotice("Offline mode is active on this browser. Cross-device updates are disabled.");
  } else if (!hasFirebaseConfig()) {
    showNotice("Firebase is not configured yet. Update firebase-config.js or use offline mode from admin.html.");
  } else {
    connectionNotice.classList.add("hidden");
    connectionNotice.textContent = "";
  }
}

function showNotice(message) {
  connectionNotice.textContent = message;
  connectionNotice.classList.remove("hidden");
}

function renderBoard() {
  board.innerHTML = "";
  board.style.setProperty("--brick-count", String(state.totalBricks));

  for (let number = 1; number <= state.totalBricks; number++) {
    const button = document.createElement("button");
    const colour = COLOURS[(number - 1) % COLOURS.length];
    const isPicked = Boolean(state.selections[number]);

    button.type = "button";
    button.dataset.number = String(number);
    button.className = `brick-button brick-${colour} ${isPicked ? "picked" : ""}`;
    button.disabled = isPicked;
    button.ariaLabel = isPicked ? `Number ${number} has already been selected` : `Select brick number ${number}`;
    button.innerHTML = `
      <span class="brick-inner">
        <span class="brick-face"><span class="brick-number">${number}</span></span>
        <span class="brick-back" aria-hidden="true"></span>
      </span>`;
    button.addEventListener("click", () => openEntryDialog(number));
    board.appendChild(button);
  }

  updateCounters();
}

function updateCounters() {
  const picked = Object.keys(state.selections).length;
  remainingCount.textContent = state.totalBricks - picked;
  winnersDrawnCount.textContent = state.winnerHistory.length;
}

function renderBanner() {
  const banner = state.currentBanner;
  if (!banner || !banner.message) {
    winnerPanel.classList.add("hidden");
    winnerPanel.innerHTML = "";
    return;
  }
  winnerPanel.innerHTML = `
    <div class="winner-message">${banner.celebratory ? "🏆 " : ""}${escapeHtml(banner.message)}</div>
    <button class="winner-close" type="button" aria-label="Close winner banner" title="Close">×</button>`;
  winnerPanel.classList.remove("hidden");
  winnerPanel.querySelector(".winner-close").addEventListener("click", async () => {
    await mutateState(current => ({ state: { ...current, currentBanner: null } }));
  });
}

function openEntryDialog(number) {
  pendingNumber = number;
  entryForm.reset();
  emailError.textContent = "";
  entrantEmail.classList.remove("invalid");
  dialogText.textContent = `Confirm brick number ${number}. Enter your email address to claim this number.`;
  if (state.settings && state.settings.testMode) entrantEmail.value = randomTestEmail();
  dialog.showModal();
  entrantEmail.focus();
  if (entrantEmail.value) entrantEmail.select();
}

entryForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!pendingNumber) return;
  const number = pendingNumber;
  const email = entrantEmail.value.trim().toLowerCase();

  if (!validateEmail(email)) {
    emailError.textContent = "Please enter a valid email address, for example name@example.com.";
    entrantEmail.classList.add("invalid");
    entrantEmail.focus();
    return;
  }

  try {
    const { result } = await mutateState(current => {
      if (current.selections[number]) return { state: current, result: { ok: false, reason: "taken" } };
      const next = normaliseState({
        ...current,
        selections: {
          ...current.selections,
          [number]: { number, email, selectedAt: new Date().toISOString(), drawnAt: "" }
        }
      });
      return { state: next, result: { ok: true } };
    });

    if (result && result.ok === false) {
      emailError.textContent = "Sorry, that brick has just been claimed. Please choose another.";
      await refreshOnce();
      return;
    }

    pendingNumber = null;
    dialog.close();
  } catch (error) {
    emailError.textContent = `Could not save the entry: ${error.message}`;
  }
});

async function refreshOnce() {
  try {
    state = await getState();
    renderBoard();
  } catch {}
}

entrantEmail.addEventListener("input", () => {
  emailError.textContent = "";
  entrantEmail.classList.remove("invalid");
});

cancelPick.addEventListener("click", () => {
  pendingNumber = null;
  dialog.close();
});

fullscreenButton.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    const popup = window.open(window.location.href, "pickABrickKiosk", "popup=yes,noopener,noreferrer,width=1280,height=900,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes");
    if (!popup) alert("Your browser blocked the pop-up. Use F11 on Windows/Linux or Control + Command + F on macOS.");
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  fullscreenButton.classList.toggle("is-fullscreen", isFullscreen);
  fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
  fullscreenButton.setAttribute("title", isFullscreen ? "Exit fullscreen" : "Fullscreen");
});

startBoard();
