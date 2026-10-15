import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/types";
/**
 * Devuelve el usuario autenticado + su perfil, o `null` si es invitado.
 * Usarse SOLO en Server Components, Server Actions y Route Handlers.
 * Si existe un usuario de `auth.users` sin fila en `profiles` (p. ej. porque
 * el trigger falló), se trata como invitado para no filtrar un estado roto.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name, created_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    profile,
  };
}
