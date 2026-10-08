"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { GAMES, seededScores } from "@/lib/data";
import { parseScores, readScoresRaw, subscribeScores } from "@/lib/scores";
import { useSession } from "@/lib/session";

const TOP_CLASS = ["top1", "top2", "top3"];

const fmt = (n: number) => n.toLocaleString("es-ES");
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

export function HallOfFame() {
  const { user } = useSession();
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];

  const rawScores = useSyncExternalStore(subscribeScores, readScoresRaw, () => null);
  const saved = useMemo(() => parseScores(rawScores), [rawScores]);

  // Mejor marca real del usuario en este juego; si no hay ninguna, se muestra la de ejemplo.
  const you = useMemo(() => {
    if (!user) return null;
    const mine = saved.filter((s) => s.game === tab && s.name === user.name);
    if (mine.length > 0) {
      const best = mine.reduce((a, b) => (b.score > a.score ? b : a));
      return {
        rank: 1 + rows.filter((r) => r.score > best.score).length,
        score: best.score,
        date: fmtDate(best.at),
      };
    }
    return { rank: 8 + (tab.length % 4), score: (rows[5]?.score ?? 12000) - 2400, date: "11/05/2026" };
  }, [user, saved, tab, rows]);

  const [first, second, third] = rows;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs" role="group" aria-label="Elegir juego">
        {GAMES.map((g) => (
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

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{second.name}</div>
          <div className="score">{fmt(second.score)}</div>
          <div className="date">{second.date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>CAMPEÓN</div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
          <div className="name">{first.name}</div>
          <div className="score" style={{ fontSize: 20 }}>{fmt(first.score)}</div>
          <div className="date">{first.date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{third.name}</div>
          <div className="score">{fmt(third.score)}</div>
          <div className="date">{third.date}</div>
        </div>
      </div>

      <div className="hall-table" role="table" aria-label={`Clasificación de ${game.title}`}>
        <div className="th" role="row">
          <div role="columnheader">RANGO</div>
          <div role="columnheader">JUGADOR</div>
          <div role="columnheader">PUNTUACIÓN</div>
          <div role="columnheader">FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name + i}
            role="row"
            className={"tr" + (TOP_CLASS[i] ? " " + TOP_CLASS[i] : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk" role="cell">#{pad(r.rank)}</div>
            <div className="pl" role="cell">{r.name}</div>
            <div className="sc" role="cell">{fmt(r.score)}</div>
            <div className="dt" role="cell">{r.date}</div>
          </div>
        ))}
        {user && you && (
          <>
            <div className="tr you-label" role="row">▸ TU MEJOR MARCA EN {game.title}</div>
            <div className="tr you" role="row" style={{ animationDelay: `${rows.length * 50 + 50}ms` }}>
              <div className="rk" role="cell" style={{ color: "var(--yellow)" }}>#{pad(you.rank)}</div>
              <div className="pl" role="cell" style={{ color: "var(--yellow)" }}>{user.name}</div>
              <div className="sc" role="cell" style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}>
                {fmt(you.score)}
              </div>
              <div className="dt" role="cell">{you.date}</div>
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
