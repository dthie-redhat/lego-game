import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pool } from "./db.js";

export async function migrate() {
  const sql = await readFile(join(process.cwd(), "sql", "001_init.sql"), "utf8");
  await pool.query(sql);

  const total = Number(process.env.DEFAULT_TOTAL_BRICKS || 100);
  if (Number.isInteger(total) && total >= 4 && total <= 500) {
    await pool.query(
      "UPDATE game_settings SET total_bricks = $1 WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM entries)",
      [total]
    );
  }
}
