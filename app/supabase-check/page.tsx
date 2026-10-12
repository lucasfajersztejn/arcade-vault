// TEMPORAL (SPEC 04, paso 6): se elimina en el paso 7.
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ClientCheck } from "./client-check";
async function ServerCheck() {
  const supabase = await createClient();
  const claims = await supabase.auth.getClaims();
  // La tabla no existe: un PGRST205 prueba que la petición llegó a PostgREST.
  const ping = await supabase
    .from("__ping" as never)
    .select("*")
    .limit(1);
  return (
    <pre>
      {JSON.stringify(
        {
          where: "server",
          claims: { data: claims.data, error: claims.error?.message ?? null },
          ping: { status: ping.status, code: ping.error?.code ?? null },
        },
        null,
        2,
      )}
    </pre>
  );
}
export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <Suspense fallback={<p>Comprobando servidor…</p>}>
        <ServerCheck />
      </Suspense>
      <ClientCheck />
    </main>
  );
}
