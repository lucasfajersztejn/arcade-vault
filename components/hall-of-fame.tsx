"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyRanking } from "@/components/empty-ranking";
import { LoadError } from "@/components/load-error";
import { getLeaderboard, getPlayerBest } from "@/lib/db/scores";
import { useUser } from "@/lib/auth/use-user";
import { createClient } from "@/lib/supabase/client";
import type { Game, PlayerBest, ScoreRow } from "@/lib/types";
const TOP_CLASS = ["top1", "top2", "top3"];
const TABLE_ROWS = 12;
const fmt = (n: number) => n.toLocaleString("es-ES");
const pad = (n: number) => String(n).padStart(2, "0");
type Loaded = { rows: ScoreRow[]; you: PlayerBest | null } | "error";
export function HallOfFame({ games }: { games: Game[] }) {
  const { user } = useUser();
  const [tab, setTab] = useState(games[0].id);
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Record<string, Loaded>>({});
  const game = games.find((g) => g.id === tab) ?? games[0];
  const userName = user?.profile.display_name ?? null;
  // Cada combinación juego + jugador + intento tiene su resultado; sin resultado = cargando.
  const key = `${tab}|${userName ?? ""}|${attempt}`;
  const result = results[key];
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      getLeaderboard(supabase, tab, TABLE_ROWS),
      userName ? getPlayerBest(supabase, tab, userName) : Promise.resolve(null),
    ])
      .then(([rows, you]) => {
        if (!cancelled) setResults((r) => ({ ...r, [key]: { rows, you } }));
      })
      .catch(() => {
        if (!cancelled) setResults((r) => ({ ...r, [key]: "error" }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, tab, userName]);
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs" role="group" aria-label="Elegir juego">
        {games.map((g) => (
          <button
            key={g.id}
            type="button"
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {result === undefined && (
        <div
          className="av-hall-loading"
          role="status"
          aria-label="Cargando clasificación"
        >
          <span className="spinner"></span>
        </div>
      )}
      {result === "error" && (
        <LoadError what="el ranking" retry={() => setAttempt((a) => a + 1)} />
      )}
      {result && result !== "error" && result.rows.length === 0 && (
        <EmptyRanking gameId={game.id} title={game.title} />
      )}
      {result && result !== "error" && result.rows.length > 0 && (
        <Ranking
          rows={result.rows}
          you={result.you}
          userName={userName}
          gameTitle={game.title}
        />
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
function Ranking({
  rows,
  you,
  userName,
  gameTitle,
}: {
  rows: ScoreRow[];
  you: PlayerBest | null;
  userName: string | null;
  gameTitle: string;
}) {
  const [first, second, third] = rows;
  return (
    <>
      <div className="podium">
        <PodiumSlot className="silver" rank="02" row={second} />
        <PodiumSlot className="gold" rank="01" row={first} champion />
        <PodiumSlot className="bronze" rank="03" row={third} />
      </div>
      <div
        className="hall-table"
        role="table"
        aria-label={`Clasificación de ${gameTitle}`}
      >
        <div className="th" role="row">
          <div role="columnheader">RANGO</div>
          <div role="columnheader">JUGADOR</div>
          <div role="columnheader">PUNTUACIÓN</div>
          <div role="columnheader">FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name}
            role="row"
            className={"tr" + (TOP_CLASS[i] ? " " + TOP_CLASS[i] : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk" role="cell">
              #{pad(r.rank)}
            </div>
            <div className="pl" role="cell">
              {r.name}
            </div>
            <div className="sc" role="cell">
              {fmt(r.score)}
            </div>
            <div className="dt" role="cell">
              {r.date}
            </div>
          </div>
        ))}
        {userName && you && (
          <>
            <div className="tr you-label" role="row">
              ▸ TU MEJOR MARCA EN {gameTitle}
            </div>
            <div
              className="tr you"
              role="row"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div
                className="rk"
                role="cell"
                style={{ color: "var(--yellow)" }}
              >
                #{pad(you.rank)}
              </div>
              <div
                className="pl"
                role="cell"
                style={{ color: "var(--yellow)" }}
              >
                {userName}
              </div>
              <div
                className="sc"
                role="cell"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                {fmt(you.score)}
              </div>
              <div className="dt" role="cell">
                {you.date}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
function PodiumSlot({
  className,
  rank,
  row,
  champion = false,
}: {
  className: string;
  rank: string;
  row: ScoreRow | undefined;
  champion?: boolean;
}) {
  return (
    <div className={"podium-slot " + className}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {rank}
      </div>
      <div className="name">{row?.name ?? "—"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row ? fmt(row.score) : "—"}
      </div>
      <div className="date">{row?.date ?? ""}</div>
    </div>
  );
}
