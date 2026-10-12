import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";
/** Cliente de Supabase para componentes cliente (singleton interno de @supabase/ssr). */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
