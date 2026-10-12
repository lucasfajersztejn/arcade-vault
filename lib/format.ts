/** 12400 → "12.4K", 1250000 → "1.3M"; por debajo de 1000 se deja el número tal cual. */
export function formatPlays(n: number): string {
  const short = (value: number, suffix: string) =>
    value.toFixed(1).replace(/\.0$/, "") + suffix;
  if (n >= 1_000_000) return short(n / 1_000_000, "M");
  if (n >= 1_000) return short(n / 1_000, "K");
  return String(n);
}
/** ISO 8601 → "DD/MM/AAAA". Se fija UTC para que servidor y navegador den la misma fecha. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
