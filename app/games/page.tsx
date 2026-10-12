import { Suspense } from "react";
import { Library } from "@/components/library";
import { getGames } from "@/lib/db/games";
import { createClient } from "@/lib/supabase/server";
export default function GamesPage() {
  return (
    <Suspense
      fallback={
        <div className="av-detail" role="status" aria-label="Cargando juegos">
          <span className="spinner"></span>
        </div>
      }
    >
      <GamesLibrary />
    </Suspense>
  );
}
async function GamesLibrary() {
  const games = await getGames(await createClient());
  return <Library games={games} />;
}
