export type ContactField = "name" | "email" | "msg";

export interface ContactInput {
  name: string;
  email: string;
  msg: string;
}

export type ContactErrors = Partial<Record<ContactField, string>>;

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: ContactErrors; values: ContactInput }
  | { status: "error"; message: string; values: ContactInput }
  | { status: "sent"; name: string };

export const CONTACT_LIMITS = { name: 60, email: 254, msgMin: 10, msgMax: 2000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact({ name, email, msg }: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  const n = name.trim();
  const e = email.trim();
  const m = msg.trim();

  if (!n) errors.name = "Escribe tu nombre.";
  else if (n.length > CONTACT_LIMITS.name) errors.name = `Máximo ${CONTACT_LIMITS.name} caracteres.`;

  if (!e) errors.email = "Escribe tu correo electrónico.";
  else if (e.length > CONTACT_LIMITS.email || !EMAIL_RE.test(e)) errors.email = "Introduce un correo válido.";

  if (!m) errors.msg = "Escribe un mensaje.";
  else if (m.length < CONTACT_LIMITS.msgMin) errors.msg = `Mínimo ${CONTACT_LIMITS.msgMin} caracteres.`;
  else if (m.length > CONTACT_LIMITS.msgMax) errors.msg = `Máximo ${CONTACT_LIMITS.msgMax} caracteres.`;

  return errors;
}
