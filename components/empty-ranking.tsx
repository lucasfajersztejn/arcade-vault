import Link from "next/link";
/** Ranking sin puntuaciones: invita a jugar la primera partida. */
export function EmptyRanking({
  gameId,
  title,
}: {
  gameId: string;
  title: string;
}) {
  return (
    <div className="av-empty" role="status">
      <div className="pixel">Sé el primero en puntuar</div>
      <p>Todavía no hay marcas en {title}.</p>
      <Link href={`/games/${gameId}/jugar`} className="btn">
        JUGAR AHORA
      </Link>
    </div>
  );
}
