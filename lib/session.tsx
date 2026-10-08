"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { SessionUser } from "./types";

const USER_KEY = "av_user";
const CHANGE_EVENT = "av-session-change";

interface SessionContextValue {
  /** null = invitado o aún no hidratado */
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

function writeRaw(value: string | null) {
  try {
    if (value === null) localStorage.removeItem(USER_KEY);
    else localStorage.setItem(USER_KEY, value);
  } catch {
    // localStorage no disponible: la sesión simplemente no persiste
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as SessionUser).name === "string"
    ) {
      return { name: (parsed as SessionUser).name };
    }
  } catch {}
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // En el servidor (y durante la hidratación) el snapshot es null → sin sesión.
  // Tras hidratar, React relee localStorage sin provocar mismatch.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const user = useMemo(() => parseUser(raw), [raw]);

  const login = useCallback((u: SessionUser) => writeRaw(JSON.stringify(u)), []);
  const signOut = useCallback(() => writeRaw(null), []);

  const value = useMemo(() => ({ user, login, signOut }), [user, login, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
