import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GameCategory, GameColor, GameWithStats } from "@/lib/types";
type Db = SupabaseClient<Database>;
type GameRow = Database["public"]["Tables"]["games"]["Row"];
type StatsRow = Database["public"]["Views"]["game_stats"]["Row"];
// `cat` y `color` están acotados por CHECK en la tabla, por eso el cast es seguro.
function toGame(row: GameRow, stats: StatsRow | undefined): GameWithStats {
  return {
    id: row.id,
    title: row.title,
    short: row.short,
    long: row.long,
    cat: row.cat as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
    best: stats?.best ?? 0,
    plays: stats?.plays ?? 0,
  };
}
/** Catálogo completo en el orden de `sort_order`, con `plays` y `best` calculados. Lanza si Supabase falla. */
export async function getGames(supabase: Db): Promise<GameWithStats[]> {
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order"),
    supabase.from("game_stats").select("*"),
  ]);
  if (games.error) throw games.error;
  if (stats.error) throw stats.error;
  const byId = new Map(stats.data.map((s) => [s.game_id, s]));
  return games.data.map((g) => toGame(g, byId.get(g.id)));
}
/** Un juego por id, o null si no existe. Lanza si Supabase falla. */
export async function getGame(
  supabase: Db,
  id: string,
): Promise<GameWithStats | null> {
  const [game, stats] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("game_stats").select("*").eq("game_id", id).maybeSingle(),
  ]);
  if (game.error) throw game.error;
  if (stats.error) throw stats.error;
  return game.data ? toGame(game.data, stats.data ?? undefined) : null;
}
