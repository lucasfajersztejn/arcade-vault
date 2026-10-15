import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeReturnTo } from "@/lib/auth/return-to";
/**
 * Callback de OAuth. Supabase redirige aquí con `?code=...` tras el consent;
 * cambiamos el code por sesión y redirigimos a `?next=` (whitelist a rutas
 * internas). Si falla, volvemos a `/login?error=oauth` para que el usuario
 * reintente sin estado corrupto (p. ej. reuso del code tras un refresh).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeReturnTo(searchParams.get("next"), "/");
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
