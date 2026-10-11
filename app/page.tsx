import Link from "next/link";

// Home provisional: se sustituirá por la home definitiva en una spec posterior.
export default function HomePage() {
  return (
    <section className="av-hero" style={{ paddingBlock: "96px" }}>
      <h1 className="flicker">ARCADE VAULT</h1>
      <p className="mono" style={{ marginTop: 24, color: "var(--ink-dim)" }}>
        Juega y compite por la puntuación más alta.
      </p>
      <div style={{ marginTop: 40 }}>
        <Link href="/games" className="btn xl pulse">
          ENTRAR AL VAULT
        </Link>
      </div>
    </section>
  );
}
