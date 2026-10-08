"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";

const LINKS = [
  { href: "/", label: "Biblioteca", match: (p: string) => p === "/" || p.startsWith("/juegos") },
  { href: "/salon", label: "Salón de la Fama", match: (p: string) => p.startsWith("/salon") },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { user, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const loginActive = pathname.startsWith("/login");

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav" aria-label="Principal">
        <Link href="/" className="logo" aria-label="Arcade Vault, ir a la biblioteca">
          <div className="logo-mark" aria-hidden="true"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin" aria-hidden="true"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button
            type="button"
            className="btn ghost auth-btn"
            onClick={signOut}
            title="Cerrar sesión"
            aria-label={`Cerrar sesión de ${user.name}`}
          >
            {user.name} ▾
          </button>
        ) : (
          <Link href="/login" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          type="button"
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="av-mobile-panel"
        >
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close} aria-hidden="true"></div>
      <aside
        id="av-mobile-panel"
        className={"av-mobile-panel" + (open ? " open" : "")}
        aria-label="Menú"
        inert={!open}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="pixel neon-cyan" style={{ fontSize: 11 }}>MENÚ</div>
          <button ref={closeRef} type="button" className="btn ghost" onClick={close} aria-label="Cerrar menú">
            ✕
          </button>
        </div>
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
              onClick={close}
            >
              {l.label}
            </Link>
          );
        })}
        <Link
          href="/login"
          className={loginActive ? "active" : ""}
          aria-current={loginActive ? "page" : undefined}
          onClick={close}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
