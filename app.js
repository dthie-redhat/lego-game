const TOTAL_BRICKS = 100;
const STORAGE_KEY = "pick-a-brick-selections-v1";
const COLOURS = ["red", "yellow", "blue", "green", "black", "white"];

const board = document.getElementById("brickBoard");
const remainingCount = document.getElementById("remainingCount");
const resetButton = document.getElementById("resetButton");
const exportButton = document.getElementById("exportButton");
const drawButton = document.getElementById("drawButton");
const winnerPanel = document.getElementById("winnerPanel");
const dialog = document.getElementById("confirmDialog");
const dialogText = document.getElementById("dialogText");
const entrantName = document.getElementById("entrantName");
const confirmPick = document.getElementById("confirmPick");

let pendingNumber = null;
let selections = loadSelections();

function loadSelections() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSelections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

function renderBoard() {
  board.innerHTML = "";

  for (let number = 1; number <= TOTAL_BRICKS; number++) {
    const button = document.createElement("button");
    const colour = COLOURS[(number - 1) % COLOURS.length];
    const isPicked = Boolean(selections[number]);

    button.type = "button";
    button.className = `brick-button ${isPicked ? "picked" : ""}`;
    button.disabled = isPicked;
    button.ariaLabel = isPicked
      ? `Number ${number} has already been selected`
      : `Select brick number ${number}`;

    button.innerHTML = `
      <span class="brick-inner">
        <span class="brick-face ${colour}">
          <span class="brick-number">${number}</span>
        </span>
        <span class="brick-back ${colour}" aria-hidden="true"></span>
      </span>
    `;

    button.addEventListener("click", () => openConfirm(number));
    board.appendChild(button);
  }

  updateRemainingCount();
}

function updateRemainingCount() {
  const picked = Object.keys(selections).length;
  remainingCount.textContent = TOTAL_BRICKS - picked;
}

function openConfirm(number) {
  pendingNumber = number;
  entrantName.value = "";
  dialogText.textContent = `Confirm brick number ${number}. Once confirmed, it will flip over and cannot be selected again.`;
  dialog.showModal();
  entrantName.focus();
}

confirmPick.addEventListener("click", () => {
  if (!pendingNumber || selections[pendingNumber]) return;

  selections[pendingNumber] = {
    number: pendingNumber,
    entrant: entrantName.value.trim(),
    selectedAt: new Date().toISOString()
  };

  saveSelections();
  renderBoard();
  pendingNumber = null;
});

resetButton.addEventListener("click", () => {
  const confirmed = confirm("Reset all selected numbers? This clears the local board on this device.");
  if (!confirmed) return;

  selections = {};
  saveSelections();
  winnerPanel.classList.add("hidden");
  renderBoard();
});

exportButton.addEventListener("click", () => {
  const rows = [["Number", "Entrant", "Selected at"]];
  Object.values(selections)
    .sort((a, b) => a.number - b.number)
    .forEach(selection => {
      rows.push([
        selection.number,
        csvSafe(selection.entrant || ""),
        selection.selectedAt
      ]);
    });

  const csv = rows.map(row => row.join(",")).join("\n");
  downloadFile(csv, `pick-a-brick-selections-${dateStamp()}.csv`, "text/csv");
});

drawButton.addEventListener("click", () => {
  const selectedEntries = Object.values(selections);
  if (selectedEntries.length === 0) {
    winnerPanel.textContent = "No bricks have been selected yet.";
    winnerPanel.classList.remove("hidden");
    return;
  }

  const winner = selectedEntries[Math.floor(Math.random() * selectedEntries.length)];
  const entrant = winner.entrant ? ` — ${winner.entrant}` : "";
  winnerPanel.textContent = `Winner: brick ${winner.number}${entrant}`;
  winnerPanel.classList.remove("hidden");
});

function csvSafe(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

renderBoard();
