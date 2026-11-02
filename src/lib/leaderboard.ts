import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface LeaderboardRow {
  id: string;
  name: string;
  score: number;
  deliveries: number;
  vehicle: string;
}

export interface NewLeaderboardEntry {
  name: string;
  score: number;
  deliveries: number;
  vehicle: string;
}

const TABLE = 'leaderboard_entries';

function isLeaderboardRow(value: unknown): value is LeaderboardRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.score === 'number' &&
    typeof row.deliveries === 'number' &&
    typeof row.vehicle === 'string'
  );
}

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardRow[]> {
  requireSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, name, score, deliveries, vehicle')
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || !data.every(isLeaderboardRow)) throw new Error('Unexpected leaderboard response');
  return data;
}

export async function submitScore(entry: NewLeaderboardEntry): Promise<void> {
  requireSupabase();
  const { error } = await supabase.from(TABLE).insert(entry);
  if (error) throw new Error(error.message);
}
