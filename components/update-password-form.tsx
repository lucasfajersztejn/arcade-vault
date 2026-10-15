"use client";
import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const PASSWORD_MIN = 8;
export function UpdatePasswordForm() {
  const router = useRouter();
  const uid = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < PASSWORD_MIN) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    startTransition(async () => {
      // La actualización se hace desde el navegador: `supabase.auth.updateUser`
      // va directo a supabase.co usando la sesión de recovery depositada por
      // /auth/callback. Así la contraseña nunca viaja por nuestro Next server.
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" aria-hidden="true" />
          <h1 className="neon-cyan">NUEVA CONTRASEÑA</h1>
          <p
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ELIGE UNA CLAVE PARA TU CUENTA
          </p>
        </div>
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor={`${uid}-pass`}>Nueva contraseña</label>
            <input
              id={`${uid}-pass`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
            />
            <small className="hint">Mínimo {PASSWORD_MIN} caracteres.</small>
          </div>
          <div className="field">
            <label htmlFor={`${uid}-pass2`}>Repite la contraseña</label>
            <input
              id={`${uid}-pass2`}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
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
            {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
          </button>
        </form>
      </div>
    </div>
  );
}
