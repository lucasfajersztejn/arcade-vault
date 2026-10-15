"use client";
import { useId, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/auth/actions";
export function ResetPasswordForm() {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" aria-hidden="true" />
          <h1 className="neon-cyan">RECUPERAR ACCESO</h1>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            TE ENVIAMOS UN ENLACE AL CORREO
          </p>
        </div>
        {sent ? (
          <>
            <p className="auth-notice" role="status">
              Si existe una cuenta con ese correo, recibirás un enlace para
              elegir nueva contraseña.
            </p>
            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              <Link href="/login">VOLVER A ENTRAR</Link>
            </div>
          </>
        ) : (
          <>
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
                {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
              </button>
            </form>
            <div
              style={{
                marginTop: 18,
                textAlign: "center",
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.1em",
              }}
            >
              <Link href="/login">VOLVER AL ACCESO</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
