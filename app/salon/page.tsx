import { Suspense } from "react";
import type { Metadata } from "next";
import { HallOfFame } from "@/components/hall-of-fame";
import { getGames } from "@/lib/db/games";
import { createClient } from "@/lib/supabase/server";
export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};
export default function SalonPage() {
  return (
    <Suspense
      fallback={
        <div
          className="av-detail"
          role="status"
          aria-label="Cargando el Salón de la Fama"
        >
          <span className="spinner"></span>
        </div>
      }
    >
      <Hall />
    </Suspense>
  );
}
async function Hall() {
  const games = await getGames(await createClient());
  return <HallOfFame games={games} />;
}
