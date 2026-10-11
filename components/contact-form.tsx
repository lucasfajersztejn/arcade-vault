"use client";

import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";
import { sendContactMessage } from "@/app/about/actions";
import {
  validateContact,
  type ContactErrors,
  type ContactField,
  type ContactInput,
  type ContactState,
} from "@/lib/contact";

const EMPTY: ContactInput = { name: "", email: "", msg: "" };
const IDLE: ContactState = { status: "idle" };

export function ContactForm() {
  // Cambiar la key remonta el formulario y reinicia useActionState ("ENVIAR OTRO MENSAJE").
  const [run, setRun] = useState(0);
  return <ContactFormInner key={run} onReset={() => setRun((n) => n + 1)} />;
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(sendContactMessage, IDLE);
  const [values, setValues] = useState<ContactInput>(EMPTY);
  const [clientErrors, setClientErrors] = useState<ContactErrors>({});
  const [shake, setShake] = useState(false);

  const serverErrors = state.status === "invalid" ? state.errors : {};
  const errors: ContactErrors = { ...serverErrors, ...clientErrors };
  const shaking = shake || state.status === "invalid";

  const onChange =
    (field: ContactField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
      if (clientErrors[field]) setClientErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const found = validateContact(values);
    if (Object.keys(found).length === 0) {
      setClientErrors({});
      return;
    }
    // Validación en cliente: no se llama al servidor.
    e.preventDefault();
    setClientErrors(found);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    const first = (["name", "email", "msg"] as const).find((f) => found[f]);
    if (first) document.getElementById(`contact-${first}`)?.focus();
  };

  if (state.status === "sent") {
    return (
      <div className="contact-form">
        <div className="terminal-success">
          <div className="term-bar" aria-hidden="true">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret" aria-hidden="true">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className={"contact-form" + (shaking ? " shake" : "")}
      action={formAction}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="field">
        <label htmlFor="contact-name">NOMBRE</label>
        <input
          id="contact-name"
          name="name"
          value={values.name}
          onChange={onChange("name")}
          placeholder="px_kai"
          autoComplete="nickname"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "contact-name-error" : undefined}
        />
        {errors.name && <FieldError id="contact-name-error">{errors.name}</FieldError>}
      </div>
      <div className="field">
        <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          value={values.email}
          onChange={onChange("email")}
          placeholder="jugador@vault.gg"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
        />
        {errors.email && <FieldError id="contact-email-error">{errors.email}</FieldError>}
      </div>
      <div className="field">
        <label htmlFor="contact-msg">MENSAJE</label>
        <textarea
          id="contact-msg"
          name="msg"
          rows={5}
          value={values.msg}
          onChange={onChange("msg")}
          placeholder="Cuéntanos qué tienes en mente…"
          aria-invalid={errors.msg ? true : undefined}
          aria-describedby={errors.msg ? "contact-msg-error" : undefined}
        ></textarea>
        {errors.msg && <FieldError id="contact-msg-error">{errors.msg}</FieldError>}
      </div>

      {/* Honeypot: invisible para personas; los bots lo rellenan. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="contact-website">Sitio web</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={pending}>
        {pending ? "TRANSMITIENDO…" : "▶  ENVIAR MENSAJE"}
      </button>

      {state.status === "error" && (
        <p className="term-error" role="alert">
          <span className="prompt">[ERR]</span> {state.message}
        </p>
      )}
    </form>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="field-error" role="alert">
      {children}
    </p>
  );
}
