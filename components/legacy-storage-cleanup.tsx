"use client";
import { useEffect } from "react";
/**
 * Limpia la clave `av_user` que usaba el `SessionProvider` legado (SPEC 14).
 * Un único efecto al montar; silencioso si no existe o si localStorage no está
 * disponible (modo privado, cookies bloqueadas).
 */
export function LegacyStorageCleanup() {
  useEffect(() => {
    try {
      localStorage.removeItem("av_user");
    } catch {}
  }, []);
  return null;
}
