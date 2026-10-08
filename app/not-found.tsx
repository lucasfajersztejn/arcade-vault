import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 · Arcade Vault",
  description: "La página que buscas no existe en el Vault.",
};

export default function NotFound() {
  return (
    <section className="av-404">
      <svg className="machine" viewBox="0 0 64 80" fill="none" aria-hidden="true">
        <path d="M10 78V22L18 6h28l8 16v56" stroke="#00f5ff" strokeWidth="3" strokeLinejoin="round" />
        <rect x="16" y="22" width="32" height="22" stroke="#ff006e" strokeWidth="3" />
        <path d="M24 30l6 6m0-6l-6 6M36 30l6 6m0-6l-6 6" stroke="#ff006e" strokeWidth="2.5" />
        <rect x="14" y="54" width="36" height="8" stroke="#00f5ff" strokeWidth="3" />
        <circle cx="24" cy="58" r="2" fill="#f5ff00" />
        <circle cx="32" cy="58" r="2" fill="#00ff88" />
        <path d="M10 78h44" stroke="#00f5ff" strokeWidth="3" />
      </svg>
      <h1 className="code">404</h1>
      <h2>Esta partida no existe</h2>
      <p>La página que buscas no está en el Vault. Puede que el enlace sea antiguo o que la dirección tenga un error.</p>
      <div className="continue" aria-hidden="true">
        CONTINUAR? <span className="blink">_</span>
      </div>
      <div className="actions">
        <Link href="/games" className="btn lg">
          VER JUEGOS
        </Link>
        <Link href="/" className="btn ghost lg">
          VOLVER AL INICIO
        </Link>
      </div>
    </section>
  );
}
