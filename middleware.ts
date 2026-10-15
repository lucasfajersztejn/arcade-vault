import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function middleware(request: NextRequest) {
  return updateSession(request);
}
export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     *   - _next/static, _next/image (bundles y optimización)
     *   - favicon y archivos estáticos de imagen
     * Mantener public/* fuera también para no pagar getUser() en assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
