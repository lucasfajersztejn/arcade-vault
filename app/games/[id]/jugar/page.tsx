import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { getGame } from "@/lib/db/games";
import { createClient } from "@/lib/supabase/server";
export default function PlayPage({ params }: PageProps<"/games/[id]/jugar">) {
  return (
    <Suspense
      fallback={
        <div className="av-player" role="status" aria-label="Cargando juego">
          <span className="spinner"></span>
        </div>
      }
    >
      <Player params={params} />
    </Suspense>
  );
}
async function Player({
  params,
}: {
  params: PageProps<"/games/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = await getGame(await createClient(), id);
  if (!game) notFound();
  return <GamePlayer game={game} />;
}
