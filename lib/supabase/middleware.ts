import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";
import type { Database } from "./database.types";
/**
 * Refresca la sesión de Supabase en cada request del middleware.
 * Patrón oficial de @supabase/ssr para App Router: crea un cliente ligado a las
 * cookies de la request/response, llama a `auth.getUser()` para disparar el
 * refresco de tokens y devuelve la response con las cookies actualizadas.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
