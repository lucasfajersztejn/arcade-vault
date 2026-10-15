"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CurrentUser, Profile } from "@/lib/types";
interface UseUserState {
  user: CurrentUser | null;
  /** `true` hasta la primera resolución desde `auth.getSession()`. */
  loading: boolean;
}
/**
 * Suscripción al estado de sesión de Supabase en el cliente.
 * Mantiene `{ user, loading }` sincronizado con `onAuthStateChange` y
 * resuelve el perfil (`profiles`) por `user_id`. Devuelve `null` si el
 * perfil no existe todavía (p. ej. carrera con el trigger tras el signup).
 */
export function useUser(): UseUserState {
  const [state, setState] = useState<UseUserState>({
    user: null,
    loading: true,
  });
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    async function hydrate(userId: string | null, email: string | null) {
      if (!userId) {
        if (active) setState({ user: null, loading: false });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, created_at")
        .eq("user_id", userId)
        .maybeSingle<Profile>();
      if (!active) return;
      if (!data) {
        setState({ user: null, loading: false });
        return;
      }
      setState({
        user: { id: userId, email: email ?? "", profile: data },
        loading: false,
      });
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrate(session?.user.id ?? null, session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session?.user.id ?? null, session?.user.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return state;
}
