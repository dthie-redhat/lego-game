import { withClient, withTransaction } from "./db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function rowToWinner(row) {
  if (!row.last_winner_number) return null;
  return {
    number: row.last_winner_number,
    email: row.last_winner_email,
    drawOrder: row.last_winner_draw_order,
    timestamp: toIso(row.last_winner_at)
  };
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

export async function getState(clientOverride) {
  const run = async client => {
    const settingsResult = await client.query("SELECT * FROM game_settings WHERE id = 1");
    const settings = settingsResult.rows[0];
    const entriesResult = await client.query("SELECT * FROM entries ORDER BY number ASC");

    const selections = {};
    const winnerHistory = [];

    for (const entry of entriesResult.rows) {
      selections[entry.number] = {
        number: entry.number,
        email: entry.email,
        timestamp: toIso(entry.selected_at),
        drawn: entry.drawn,
        drawOrder: entry.draw_order || ""
      };
      if (entry.drawn) {
        winnerHistory.push({
          number: entry.number,
          email: entry.email,
          drawOrder: entry.draw_order,
          timestamp: toIso(entry.drawn_at)
        });
      }
    }

    winnerHistory.sort((a, b) => a.drawOrder - b.drawOrder);

    return {
      totalBricks: settings.total_bricks,
      selections,
      winnerHistory,
      lastWinner: rowToWinner(settings),
      testMode: settings.test_mode,
      updatedAt: toIso(settings.updated_at)
    };
  };

  if (clientOverride) return run(clientOverride);
  return withClient(run);
}

export async function claimBrick(number, email) {
  const brickNumber = Number(number);
  const normalizedEmail = normalizeEmail(email);

  if (!Number.isInteger(brickNumber)) throw publicError("Choose a valid brick number.");
  if (!EMAIL_REGEX.test(normalizedEmail)) throw publicError("Please enter a valid email address.");

  return withTransaction(async client => {
    const settingsResult = await client.query("SELECT total_bricks FROM game_settings WHERE id = 1 FOR UPDATE");
    const totalBricks = settingsResult.rows[0].total_bricks;

    if (brickNumber < 1 || brickNumber > totalBricks) {
      throw publicError("That number is outside the current board.");
    }

    try {
      await client.query(
        "INSERT INTO entries (number, email, email_normalized) VALUES ($1, $2, $3)",
        [brickNumber, normalizedEmail, normalizedEmail]
      );
    } catch (err) {
      if (err.code === "23505" && err.constraint === "entries_pkey") {
        throw publicError("That brick has already been selected.");
      }
      if (err.code === "23505" && err.constraint === "entries_email_normalized_key") {
        throw publicError("This email address has already been used for today's draw.");
      }
      throw err;
    }

    await client.query("UPDATE game_settings SET updated_at = now() WHERE id = 1");
    return getState(client);
  });
}

export async function drawWinner() {
  return withTransaction(async client => {
    const candidate = await client.query(
      "SELECT number, email FROM entries WHERE drawn = false ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED"
    );

    if (!candidate.rows.length) {
      throw publicError("There are no undrawn entries available.");
    }

    const drawOrderResult = await client.query("SELECT COALESCE(MAX(draw_order), 0) + 1 AS next_order FROM entries");
    const drawOrder = drawOrderResult.rows[0].next_order;
    const winner = candidate.rows[0];

    const updateResult = await client.query(
      "UPDATE entries SET drawn = true, draw_order = $1, drawn_at = now() WHERE number = $2 RETURNING number, email, draw_order, drawn_at",
      [drawOrder, winner.number]
    );
    const row = updateResult.rows[0];

    await client.query(
      `UPDATE game_settings
       SET last_winner_number = $1,
           last_winner_email = $2,
           last_winner_draw_order = $3,
           last_winner_at = $4,
           updated_at = now()
       WHERE id = 1`,
      [row.number, row.email, row.draw_order, row.drawn_at]
    );

    return getState(client);
  });
}

export async function resetGame(totalBricks) {
  const total = Number(totalBricks);
  if (!Number.isInteger(total) || total < 4 || total > 500) {
    throw publicError("Choose a brick count between 4 and 500.");
  }

  return withTransaction(async client => {
    await client.query("DELETE FROM entries");
    await client.query(
      `UPDATE game_settings
       SET total_bricks = $1,
           last_winner_number = NULL,
           last_winner_email = NULL,
           last_winner_draw_order = NULL,
           last_winner_at = NULL,
           updated_at = now()
       WHERE id = 1`,
      [total]
    );
    return getState(client);
  });
}

export async function setTestMode(enabled) {
  return withTransaction(async client => {
    await client.query(
      "UPDATE game_settings SET test_mode = $1, updated_at = now() WHERE id = 1",
      [Boolean(enabled)]
    );
    return getState(client);
  });
}

export async function entriesCsv() {
  const state = await getState();
  const winnersByNumber = {};
  for (const winner of state.winnerHistory) winnersByNumber[Number(winner.number)] = winner;

  const rows = [["Number", "Email", "Selected At", "Winner Status", "Draw Order", "Winner Timestamp"]];
  for (let i = 1; i <= state.totalBricks; i += 1) {
    const entry = state.selections[i];
    if (!entry) continue;
    const winner = winnersByNumber[i] || {};
    rows.push([
      i,
      entry.email || "",
      entry.timestamp || "",
      entry.drawn ? "winner" : "",
      entry.drawOrder || winner.drawOrder || "",
      winner.timestamp || ""
    ]);
  }

  return rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
}
