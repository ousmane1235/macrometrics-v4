"use client";
import TradingViewChart from "@/components/TradingViewChart";

export default function ChartsPage() {
  const parisDate = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>Graphiques Techniques</h1>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>🇫🇷 {parisDate} · TradingView · Heure de Paris</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { icon: "📊", title: "Multi-timeframes", desc: "Analyse 1H, 4H, Daily, Weekly pour identifier la tendance de fond et les points d'entrée." },
          { icon: "📈", title: "RSI + MACD", desc: "Indicateurs RSI et MACD intégrés pour détecter les divergences et les zones de retournement." },
          { icon: "⏰", title: "Heure de Paris", desc: "Tous les graphiques affichés en heure de Paris (CET/CEST) pour cohérence avec l'analyse macro." },
        ].map(({ icon, title, desc }) => (
          <div key={title} style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 5 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <TradingViewChart />
    </div>
  );
}
