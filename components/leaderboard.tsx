import { EmptyRanking } from "@/components/empty-ranking";
import type { ScoreRow } from "@/lib/types";
const TOP_CLASS = ["top1", "top2", "top3"];
export function Leaderboard({
  rows,
  gameId,
  title,
}: {
  rows: ScoreRow[];
  gameId: string;
  title: string;
}) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.length === 0 && <EmptyRanking gameId={gameId} title={title} />}
      {rows.map((r, i) => (
        <div
          key={r.name}
          className={"lb-row" + (TOP_CLASS[i] ? " " + TOP_CLASS[i] : "")}
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </div>
  );
}
