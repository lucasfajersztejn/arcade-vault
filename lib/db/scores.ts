import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PlayerBest, ScoreRow } from "@/lib/types";
import { formatDate } from "@/lib/format";
type Db = SupabaseClient<Database>;
const NAME_MAX = 20;
const SCORE_MAX = 99_999_999;
/** Top `limit` de un juego: una fila por jugador con su mejor marca. Lanza si Supabase falla. */
export async function getLeaderboard(
  supabase: Db,
  gameId: string,
  limit: number,
): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("player_name, score, achieved_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("achieved_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name ?? "",
    score: r.score ?? 0,
    date: r.achieved_at ? formatDate(r.achieved_at) : "",
  }));
}
/** Mejor marca de un jugador en un juego y su rango global, o null si no ha puntuado. */
export async function getPlayerBest(
  supabase: Db,
  gameId: string,
  name: string,
): Promise<PlayerBest | null> {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("score, achieved_at")
    .eq("game_id", gameId)
    .eq("player_name", name)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.score === null) return null;
  const { count, error: countError } = await supabase
    .from("leaderboard")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId)
    .gt("score", data.score);
  if (countError) throw countError;
  return {
    rank: (count ?? 0) + 1,
    score: data.score,
    date: data.achieved_at ? formatDate(data.achieved_at) : "",
  };
}
/** Inserta una puntuación; devuelve false si no se pudo guardar (mismo contrato que el antiguo `saveScore`). */
export async function submitScore(
  supabase: Db,
  entry: { gameId: string; playerName: string; score: number },
): Promise<boolean> {
  const player_name = entry.playerName.trim().slice(0, NAME_MAX) || "INVITADO";
  const score = Math.min(Math.max(Math.floor(entry.score), 0), SCORE_MAX);
  try {
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: entry.gameId, player_name, score });
    return !error;
  } catch {
    return false;
  }
}
