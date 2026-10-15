"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
const LINKS = [
  {
    href: "/games",
    label: "Biblioteca",
    match: (p: string) => p.startsWith("/games"),
  },
  {
    href: "/salon",
    label: "Salón de la Fama",
    match: (p: string) => p.startsWith("/salon"),
  },
  {
    href: "/about",
    label: "Acerca de",
    match: (p: string) => p.startsWith("/about"),
  },
] as const;
interface NavShellProps {
  displayName: string | null;
}
export function NavShell({ displayName }: NavShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loginActive = pathname.startsWith("/login");
  const registerActive = pathname.startsWith("/register");
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
        <Link href="/" className="logo" aria-label="Arcade Vault, ir al inicio">
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
        {displayName ? (
          <form action={signOut} className="auth-session">
            <span className="auth-session__name" title={displayName}>
              {displayName}
            </span>
            <button
              type="submit"
              className="btn ghost auth-btn"
              aria-label={`Cerrar sesión de ${displayName}`}
            >
              Cerrar sesión
            </button>
          </form>
        ) : (
          <div className="auth-session">
            <Link
              href="/login"
              className={"btn ghost auth-btn" + (loginActive ? " active" : "")}
              aria-current={loginActive ? "page" : undefined}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className={"btn auth-btn" + (registerActive ? " active" : "")}
              aria-current={registerActive ? "page" : undefined}
            >
              Registrarse
            </Link>
          </div>
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
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
        aria-hidden="true"
      ></div>
      <aside
        id="av-mobile-panel"
        className={"av-mobile-panel" + (open ? " open" : "")}
        aria-label="Menú"
        inert={!open}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div className="pixel neon-cyan" style={{ fontSize: 11 }}>
            MENÚ
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn ghost"
            onClick={close}
            aria-label="Cerrar menú"
          >
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
        {displayName ? (
          <form action={signOut}>
            <button
              type="submit"
              className="btn ghost"
              style={{ width: "100%" }}
            >
              Cerrar sesión ({displayName})
            </button>
          </form>
        ) : (
          <>
            <Link
              href="/login"
              className={loginActive ? "active" : ""}
              aria-current={loginActive ? "page" : undefined}
              onClick={close}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className={registerActive ? "active" : ""}
              aria-current={registerActive ? "page" : undefined}
              onClick={close}
            >
              Registrarse
            </Link>
          </>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
