"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

type Tab = "in" | "up";

export function AuthForm() {
  const router = useRouter();
  const { login, signOut } = useSession();
  const uid = useId();
  const [tab, setTab] = useState<Tab>("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login({ name: (user || "PLAYER1").toUpperCase().slice(0, 10) });
    router.push("/");
  };

  const playAsGuest = () => {
    signOut();
    router.push("/");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "in", label: "INICIAR SESIÓN" },
    { id: "up", label: "CREAR CUENTA" },
  ];

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" aria-hidden="true"></div>
          <h1 className="neon-cyan">ARCADE VAULT</h1>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}>
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Acceso">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`${uid}-panel`}
              className={tab === t.id ? "on" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tab}`}>
          <div className="field">
            <label htmlFor={`${uid}-user`}>Usuario</label>
            <input
              id={`${uid}-user`}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="px_kai"
              autoComplete="username"
            />
          </div>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor={`${uid}-email`}>Correo electrónico</label>
              <input
                id={`${uid}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
                autoComplete="email"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor={`${uid}-pass`}>Contraseña</label>
            <input
              id={`${uid}-pass`}
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
            />
          </div>

          <button className="btn lg" type="submit" style={{ width: "100%", marginTop: 8 }}>
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <button type="button" className="btn ghost" style={{ width: "100%", marginTop: 10 }} onClick={playAsGuest}>
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button" aria-disabled="true" title="Próximamente">
            ◆&nbsp;&nbsp;GOOGLE
          </button>
          <button className="btn ghost" type="button" aria-disabled="true" title="Próximamente">
            ▣&nbsp;&nbsp;GITHUB
          </button>
        </div>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
