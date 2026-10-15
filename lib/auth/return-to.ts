/**
 * Whitelist mínima para evitar open redirects.
 * Sólo se admite una ruta interna que empiece por "/" y no por "//" ni por una
 * barra invertida; cualquier otra cosa (http://, javascript:, protocolo-relativo)
 * se reemplaza por el fallback.
 */
export function safeReturnTo(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
