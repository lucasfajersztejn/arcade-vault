"use client";
import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { signUp, signInWithProvider } from "@/lib/auth/actions";
export function RegisterForm() {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signUp({ email, password, displayName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSentTo(email.trim());
    });
  }
  function onOAuth(provider: "google" | "github") {
    setError(null);
    startTransition(async () => {
      const result = await signInWithProvider({ provider, returnTo: "/games" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }
  if (sentTo) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark" aria-hidden="true" />
            <h1 className="neon-cyan">REVISA TU CORREO</h1>
            <p
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.16em",
                marginTop: 6,
              }}
            >
              CONFIRMACIÓN ENVIADA A {sentTo.toUpperCase()}
            </p>
          </div>
          <p style={{ textAlign: "center", lineHeight: 1.5 }}>
            Haz clic en el enlace del email para activar tu cuenta y luego
            vuelve a <Link href="/login">iniciar sesión</Link>.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" aria-hidden="true" />
          <h1 className="neon-cyan">CREAR CUENTA</h1>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            NUEVO JUGADOR · v2.6
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor={`${uid}-alias`}>Alias</label>
            <input
              id={`${uid}-alias`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="px_kai"
              autoComplete="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_\-]{3,20}"
              aria-describedby={`${uid}-alias-hint`}
            />
            <small id={`${uid}-alias-hint`} className="hint">
              3–20 caracteres · letras, números, guion o guion bajo
            </small>
          </div>
          <div className="field">
            <label htmlFor={`${uid}-email`}>Correo electrónico</label>
            <input
              id={`${uid}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-pass`}>Contraseña</label>
            <input
              id={`${uid}-pass`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <small className="hint">Mínimo 8 caracteres.</small>
          </div>
          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="btn lg"
            type="submit"
            style={{ width: "100%", marginTop: 8 }}
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "CREAR CUENTA"}
          </button>
        </form>
        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => onOAuth("google")}
            disabled={pending}
          >
            ◆&nbsp;&nbsp;GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => onOAuth("github")}
            disabled={pending}
          >
            ▣&nbsp;&nbsp;GITHUB
          </button>
        </div>
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          ¿YA TIENES CUENTA? <Link href="/login">ENTRAR</Link>
        </div>
      </div>
    </div>
  );
}
