"use client";

import { useMemo, useState } from "react";
import { GameCard } from "@/components/game-card";
import { ALL_CATEGORIES, CATS, GAMES } from "@/lib/data";

export function Library() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>(ALL_CATEGORIES);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return GAMES.filter(
      (g) => (cat === ALL_CATEGORIES || g.cat === cat) && g.title.toLowerCase().includes(term),
    );
  }, [q, cat]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink" aria-hidden="true">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
            aria-label="Buscar un juego por nombre"
          />
        </div>
        <div className="av-chips" role="group" aria-label="Filtrar por categoría">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              className={"chip" + (cat === c ? " active" : "")}
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {filtered.length === 0 ? "Sin resultados" : `${filtered.length} juegos`}
      </p>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 80, color: "var(--ink-faint)" }}>
            <div className="pixel" style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}>
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
