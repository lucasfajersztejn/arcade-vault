import "server-only";
import { headers } from "next/headers";
/**
 * Rate limiter in-memory por bucket (sliding window básico).
 * Sirve para deploys mono-instancia; la interfaz queda preparada para migrar a
 * Upstash/Redis sin tocar los call sites.
 */
export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterMs: number };
const buckets = new Map<string, number[]>();
export function checkRateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(bucket) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    const retryAfterMs = Math.max(0, hits[0] + windowMs - now);
    buckets.set(bucket, hits);
    return { ok: false, retryAfterMs };
  }
  hits.push(now);
  buckets.set(bucket, hits);
  return { ok: true };
}
/**
 * Lee la IP del cliente desde `x-forwarded-for`. Vercel y la mayoría de hosts
 * la rellenan; si no está, cae a un bucket global `"unknown"` (acceptable para
 * MVP: en prod detrás de un proxy que siempre la manda, nunca se usa).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (!fwd) return "unknown";
  const first = fwd.split(",")[0]?.trim();
  return first || "unknown";
}
