/**
 * Lee las variables públicas de Supabase.
 * El acceso a `process.env.NEXT_PUBLIC_*` debe ser literal: Next.js solo las
 * incrusta en el bundle del navegador si aparecen escritas así en el código.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL (ver .env.template).",
    );
  }
  if (!publishableKey) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.template).",
    );
  }
  return { url, publishableKey };
}
