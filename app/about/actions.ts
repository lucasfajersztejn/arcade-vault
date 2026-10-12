"use server";

import { Resend } from "resend";
import { validateContact, type ContactInput, type ContactState } from "@/lib/contact";

const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Un header no puede contener saltos de línea: evita inyección en el asunto.
function oneLine(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const field = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };

  // Honeypot: un bot rellena el campo oculto; se finge éxito sin enviar nada.
  if (field("website").trim() !== "") {
    return { status: "sent", name: oneLine(field("name")) || "PLAYER" };
  }

  const values: ContactInput = { name: field("name"), email: field("email"), msg: field("msg") };
  const errors = validateContact(values);
  if (Object.keys(errors).length > 0) {
    return { status: "invalid", errors, values };
  }

  const name = oneLine(values.name);
  const email = values.email.trim();
  const msg = values.msg.trim();

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    console.error("[contact] Faltan RESEND_API_KEY o CONTACT_TO_EMAIL en el entorno.");
    return { status: "error", message: "Servicio de correo no configurado. Inténtalo más tarde.", values };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Nuevo mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\n${msg}`,
      html:
        `<p><strong>Nombre:</strong> ${escapeHtml(name)}</p>` +
        `<p><strong>Correo:</strong> ${escapeHtml(email)}</p>` +
        `<p style="white-space:pre-wrap">${escapeHtml(msg)}</p>`,
    });

    if (error) {
      console.error("[contact] Resend rechazó el envío:", error.name, error.message);
      return { status: "error", message: "No se pudo enviar el mensaje. Inténtalo de nuevo.", values };
    }
  } catch (err) {
    console.error("[contact] Fallo inesperado al enviar:", err);
    return { status: "error", message: "No se pudo enviar el mensaje. Inténtalo de nuevo.", values };
  }

  return { status: "sent", name };
}
