/**
 * Allowlist cerrada de rutas internas que se admiten como `returnTo` tras login,
 * registro u OAuth. Añadir una ruta nueva aquí es un cambio consciente.
 */
export const ALLOWED_RETURN_TO_PREFIXES = [
  "/",
  "/games",
  "/salon",
  "/about",
  "/update-password",
  "/login",
  "/register",
] as const;
/**
 * Normaliza un `returnTo` recibido por querystring.
 * Sólo admite rutas internas y únicamente si su pathname empieza por uno de los
 * prefijos de `ALLOWED_RETURN_TO_PREFIXES` (match exacto o seguido de `/`).
 * Bloquea open-redirects (`//evil.com`, `/\evil`, `javascript:`, etc.) y rutas
 * internas no previstas (`/admin`, `/api/...`, `/_next/...`).
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  const queryIdx = value.search(/[?#]/);
  const pathname = queryIdx === -1 ? value : value.slice(0, queryIdx);
  const allowed = ALLOWED_RETURN_TO_PREFIXES.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
  return allowed ? value : fallback;
}
