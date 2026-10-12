"use client";
// TEMPORAL (SPEC 04, paso 6): se elimina en el paso 7.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export function ClientCheck() {
  const [result, setResult] = useState("Comprobando navegador…");
  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.auth.getClaims(),
      supabase
        .from("__ping" as never)
        .select("*")
        .limit(1),
    ])
      .then(([claims, ping]) =>
        setResult(
          JSON.stringify(
            {
              where: "client",
              claims: {
                data: claims.data,
                error: claims.error?.message ?? null,
              },
              ping: { status: ping.status, code: ping.error?.code ?? null },
            },
            null,
            2,
          ),
        ),
      )
      .catch((e: unknown) =>
        setResult(`ERROR: ${e instanceof Error ? e.message : String(e)}`),
      );
  }, []);
  return <pre>{result}</pre>;
}
