"use client";
import { useEffect, useRef } from "react";

export default function CalendarPage() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "720px";
    wrapper.style.width  = "100%";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "calc(100% - 32px)";
    inner.style.width  = "100%";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.type  = "text/javascript";
    script.src   = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    // Same pattern as TradingViewChart.tsx (which works)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (script as any).innerHTML = JSON.stringify({
      colorTheme:       "dark",
      isTransparent:    false,
      width:            "100%",
      height:           "720",
      locale:           "fr",
      importanceFilter: "-1,0,1",
      countryFilter:    "us,eu,gb,jp,ca,au,ch,cn,nz",
    });
    wrapper.appendChild(script);

    ref.current.appendChild(wrapper);
  }, []);

  const parisDate = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>Calendrier Économique</h1>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>
          🇫🇷 {parisDate} · G8 + Chine · Événements haute importance
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          ["🔴 Haute importance", "NFP, CPI, FOMC, BCE, BOE, BOJ"],
          ["🟠 Moyenne importance", "PMI, PIB, ventes au détail"],
          ["🟡 Faible importance", "Discours, statistiques mineures"],
        ].map(([l, d]) => (
          <div key={String(l)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px", background: "#10101e",
            border: "1px solid #1c1c38", borderRadius: 8,
          }}>
            <span style={{ fontSize: 12 }}>{l}</span>
            <span style={{ fontSize: 11, color: "#475569" }}>{d}</span>
          </div>
        ))}
      </div>

      <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, overflow: "hidden", minHeight: 720 }}>
        <div ref={ref} style={{ height: 720 }} />
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 10, fontSize: 12, color: "#475569" }}>
        💡 <strong style={{ color: "#94a3b8" }}>Règle d&apos;or :</strong> Éviter les entrées 30 min avant et après les publications rouges.
        NFP et décisions de taux peuvent générer 100–200 pips en quelques minutes.
        Source : TradingView · Heure de Paris (CET/CEST)
      </div>
    </div>
  );
}
