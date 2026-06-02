CREATE TABLE IF NOT EXISTS game_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_bricks integer NOT NULL CHECK (total_bricks BETWEEN 4 AND 500),
  test_mode boolean NOT NULL DEFAULT false,
  last_winner_number integer,
  last_winner_email text,
  last_winner_draw_order integer,
  last_winner_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entries (
  number integer PRIMARY KEY,
  email text NOT NULL,
  email_normalized text NOT NULL UNIQUE,
  selected_at timestamptz NOT NULL DEFAULT now(),
  drawn boolean NOT NULL DEFAULT false,
  draw_order integer UNIQUE,
  drawn_at timestamptz,
  CONSTRAINT entries_draw_consistency CHECK (
    (drawn = false AND draw_order IS NULL AND drawn_at IS NULL)
    OR
    (drawn = true AND draw_order IS NOT NULL AND drawn_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS entries_drawn_idx ON entries (drawn);

INSERT INTO game_settings (id, total_bricks)
VALUES (1, 100)
ON CONFLICT (id) DO NOTHING;
