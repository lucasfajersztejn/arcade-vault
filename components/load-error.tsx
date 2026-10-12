"use client";
import { useEffect } from "react";
interface LoadErrorProps {
  /** Qué no se pudo cargar, p.ej. "los juegos" o "el ranking". */
  what: string;
  error?: Error;
  retry: () => void;
}
/** Estado de error con reintento para pantallas que leen de Supabase. */
export function LoadError({ what, error, retry }: LoadErrorProps) {
  useEffect(() => {
    if (error) console.error(error);
  }, [error]);
  return (
    <section className="av-error" role="alert">
      <h2>No se pudo cargar {what}</h2>
      <p>Comprueba tu conexión e inténtalo de nuevo.</p>
      <button type="button" className="btn ghost lg" onClick={retry}>
        REINTENTAR
      </button>
    </section>
  );
}
