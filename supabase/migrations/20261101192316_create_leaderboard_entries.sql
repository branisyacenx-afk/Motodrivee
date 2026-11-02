/*
# Create leaderboard entries (public, no sign-in)

1. New Tables
- `leaderboard_entries`
  - `id` (uuid, primary key, generated automatically)
  - `name` (text, 1 to 16 characters) - the rider name shown on the leaderboard
  - `score` (integer, 0 to 1,000,000) - points earned during one shift
  - `deliveries` (integer, 0 or more) - number of orders delivered in that shift
  - `vehicle` (text) - the bike the rider used
  - `created_at` (timestamp)

2. Security
- Enable RLS on `leaderboard_entries`.
- Grant SELECT and INSERT to `anon` and `authenticated` only (no update or delete, so scores cannot be edited or removed after submission).
- The table is intentionally public: anyone can read the leaderboard and submit a score. No personal data is stored.

3. Notes
- Shop progress (wallet, owned bikes, upgrades) is stored on the player's device, not in this table.
- An index on score keeps the leaderboard query fast.
*/

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 16),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 1000000),
  deliveries integer NOT NULL DEFAULT 0 CHECK (deliveries >= 0),
  vehicle text NOT NULL DEFAULT 'classic' CHECK (char_length(vehicle) <= 32),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_entries_score_idx ON leaderboard_entries (score DESC);

ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON leaderboard_entries TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_leaderboard" ON leaderboard_entries;
CREATE POLICY "anon_select_leaderboard" ON leaderboard_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_leaderboard" ON leaderboard_entries;
CREATE POLICY "anon_insert_leaderboard" ON leaderboard_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
