"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeReturnTo } from "./return-to";
import { checkRateLimit, getClientIp } from "./rate-limit";
export type AuthResult = { ok: true } | { ok: false; error: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPLAY_NAME_RE = /^[A-Za-z0-9_-]{3,20}$/;
const PASSWORD_MIN = 8;
const RATE_LIMIT_MESSAGE =
  "Demasiados intentos. Espera un momento y vuelve a probar.";
const RATE_SIGNIN = { limit: 10, windowMs: 10 * 60 * 1000 };
const RATE_SIGNUP = { limit: 5, windowMs: 60 * 60 * 1000 };
const RATE_RESET = { limit: 5, windowMs: 60 * 60 * 1000 };
const RATE_OAUTH = { limit: 20, windowMs: 60 * 60 * 1000 };
function siteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SITE_URL (ver .env.template).",
    );
  }
  return base.replace(/\/$/, "");
}
export async function signUp(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `signUp:${ip}`,
    RATE_SIGNUP.limit,
    RATE_SIGNUP.windowMs,
  );
  if (!rl.ok) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const email = input.email.trim();
  const password = input.password;
  const displayName = input.displayName.trim();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Correo no válido." };
  if (password.length < PASSWORD_MIN) {
    return {
      ok: false,
      error: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`,
    };
  }
  if (!DISPLAY_NAME_RE.test(displayName)) {
    return {
      ok: false,
      error:
        "El alias debe tener 3–20 caracteres: letras, números, guion o guion bajo.",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/login?verified=1`,
      data: { display_name: displayName },
    },
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}
export async function signIn(input: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `signIn:${ip}`,
    RATE_SIGNIN.limit,
    RATE_SIGNIN.windowMs,
  );
  if (!rl.ok) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const email = input.email.trim();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Correo no válido." };
  if (!input.password) return { ok: false, error: "Escribe tu contraseña." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true };
}
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
export async function requestPasswordReset(input: {
  email: string;
}): Promise<AuthResult> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `reset:${ip}`,
    RATE_RESET.limit,
    RATE_RESET.windowMs,
  );
  if (!rl.ok) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const email = input.email.trim();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Correo no válido." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/update-password`,
  });
  // Nunca distinguimos "existe/no existe" para no filtrar la base de usuarios:
  // devolvemos ok aunque Supabase falle; el error real queda sólo en servidor.
  if (error) console.error("[auth] reset", error.message);
  return { ok: true };
}
/**
 * Inicia un flujo OAuth. Devuelve la URL a la que debe redirigir el navegador.
 * El cliente invoca esta Server Action y luego `window.location.href = url`.
 */
export async function signInWithProvider(input: {
  provider: "google" | "github";
  returnTo?: string | null;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `oauth:${ip}`,
    RATE_OAUTH.limit,
    RATE_OAUTH.windowMs,
  );
  if (!rl.ok) return { ok: false, error: RATE_LIMIT_MESSAGE };
  const next = safeReturnTo(input.returnTo, "/");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: input.provider,
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) {
    return {
      ok: false,
      error: mapAuthError(error?.message ?? "No se pudo iniciar OAuth."),
    };
  }
  return { ok: true, url: data.url };
}
function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) {
    return "Tu correo aún no está confirmado. Revisa tu bandeja de entrada.";
  }
  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("user already registered")) {
    return "Ya existe una cuenta con ese correo.";
  }
  if (m.includes("rate limit")) {
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  }
  console.error("[auth] unmapped", message);
  return "No se pudo completar la operación. Vuelve a intentarlo.";
}
