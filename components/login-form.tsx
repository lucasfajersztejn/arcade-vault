"use client";
import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signInWithProvider } from "@/lib/auth/actions";
import { safeReturnTo } from "@/lib/auth/return-to";
export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const uid = useId();
  const returnTo = safeReturnTo(search.get("returnTo"), "/");
  const verified = search.get("verified") === "1";
  const oauthFailed = search.get("error") === "oauth";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn({ email, password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(returnTo);
      router.refresh();
    });
  }
  function onOAuth(provider: "google" | "github") {
    setError(null);
    startTransition(async () => {
      const result = await signInWithProvider({ provider, returnTo });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.url;
    });
  }
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" aria-hidden="true" />
          <h1 className="neon-cyan">ARCADE VAULT</h1>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </p>
        </div>
        {verified ? (
          <p className="auth-notice" role="status">
            Correo verificado. Ya puedes entrar.
          </p>
        ) : null}
        {oauthFailed ? (
          <p className="auth-error" role="alert">
            No se pudo completar el inicio con el proveedor. Vuelve a
            intentarlo.
          </p>
        ) : null}
        <form onSubmit={onSubmit} noValidate>
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
              autoComplete="current-password"
              required
              minLength={8}
            />
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
            {pending ? "ENTRANDO…" : "ENTRAR AL VAULT"}
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
          <Link href="/reset-password">OLVIDÉ MI CONTRASEÑA</Link>
          <span style={{ margin: "0 10px", color: "var(--ink-faint)" }}>·</span>
          <Link
            href={`/register${returnTo !== "/" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          >
            CREAR CUENTA
          </Link>
        </div>
      </div>
    </div>
  );
}
