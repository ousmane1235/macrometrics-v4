import SeasonalityG8 from "@/components/SeasonalityG8";

export const dynamic = "force-dynamic";

export default function SeasonalityPage() {
  const parisDate = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const currentMonthName = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", month: "long" });

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>Saisonnalité G8 — 28 Paires</h1>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>🇫🇷 {parisDate} · Données réelles Yahoo Finance · 10 ans d&apos;historique</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { icon: "📊", title: "Moyennes historiques", desc: `Retours mensuels moyens sur 10 ans. Le mois actuel (${currentMonthName}) est mis en surbrillance.` },
          { icon: "🌡", title: "Heatmap complète", desc: "Vue toutes les paires du groupe d'un coup. Vert = tendance haussière historique, Rouge = baissière." },
          { icon: "⚡", title: "Signal saisonnier", desc: "Une paire avec +65% de mois positifs sur 10 ans donne un biais fort. Combiner avec COT et fundamentals." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <SeasonalityG8 />

      <div style={{ marginTop: 20, padding: "14px 18px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 10, fontSize: 12, color: "#475569", lineHeight: 1.7 }}>
        💡 <strong style={{ color: "#94a3b8" }}>Comment utiliser :</strong> La saisonnalité donne un <em>biais</em>, pas un signal d&apos;entrée. Utiliser en confluence avec le COT (positionnement), le sentiment retail (contrarian) et les fondamentaux macroéconomiques. Les données sont calculées depuis Yahoo Finance en temps réel.
      </div>
    </div>
  );
}
