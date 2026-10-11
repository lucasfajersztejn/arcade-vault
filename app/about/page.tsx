import type { Metadata } from "next";
import { HighlightIcon, type HighlightKind } from "@/components/highlight-icon";
import { RevealObserver } from "@/components/reveal-observer";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
  description: "Qué es Arcade Vault y cómo contactar con el equipo.",
};

const HIGHLIGHTS: { kind: HighlightKind; text: string; color: string }[] = [
  { kind: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  { kind: "BROWSER", text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", color: "cyan" },
  { kind: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export default function AboutPage() {
  return (
    <div className="about fade-in">
      <RevealObserver />

      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar
          los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar
          y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.kind} className={"highlight " + h.color} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.kind} />
              <div className="hl-text pixel">{h.text}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      <section className="about-contact reveal" aria-labelledby="contact-title">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 id="contact-title" className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip"><span className="tip-led" aria-hidden="true"></span>RESPUESTA EN 24-48H</div>
              <div className="tip"><span className="tip-led y" aria-hidden="true"></span>SUGERENCIAS BIENVENIDAS</div>
              <div className="tip"><span className="tip-led m" aria-hidden="true"></span>SIN SPAM, JAMÁS</div>
            </div>
          </div>

          {/* Visual provisional: el paso 7 lo sustituye por <ContactForm /> */}
          <div className="contact-form">
            <div className="field">
              <label htmlFor="contact-name">NOMBRE</label>
              <input id="contact-name" placeholder="px_kai" />
            </div>
            <div className="field">
              <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
              <input id="contact-email" type="email" placeholder="jugador@vault.gg" />
            </div>
            <div className="field">
              <label htmlFor="contact-msg">MENSAJE</label>
              <textarea id="contact-msg" rows={5} placeholder="Cuéntanos qué tienes en mente…"></textarea>
            </div>
            <button className="btn xl press" type="button" style={{ width: "100%" }}>
              ▶&nbsp; ENVIAR MENSAJE
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
