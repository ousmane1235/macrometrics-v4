"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import OpenInterestCard from "@/components/OpenInterestCard";
import { TV_SYMBOLS } from "@/components/TradingViewChart";

const TradingViewChart = dynamic(() => import("@/components/TradingViewChart"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 520 }} />,
});

const MyIndicatorChart = dynamic(() => import("@/components/MyIndicatorChart"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 380 }} />,
});

export default function ChartsPage() {
  const [symIdx, setSymIdx] = useState(0);
  const selected = TV_SYMBOLS[symIdx];

  const parisDate = new Date().toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>
      {/* Page header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>Graphiques</h1>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>
          🇫🇷 {parisDate} · TradingView · Mon Indicateur Privé · Open Interest
        </p>
      </div>

      {/* Symbol selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {TV_SYMBOLS.map((s, i) => (
          <button key={s.tv} onClick={() => setSymIdx(i)} style={{
            fontSize: 11, fontWeight: 600, padding: "4px 11px", borderRadius: 7, cursor: "pointer",
            background: symIdx === i ? "rgba(212,175,55,0.12)" : "#10101e",
            border: `1px solid ${symIdx === i ? "rgba(212,175,55,0.3)" : "#1c1c38"}`,
            color: symIdx === i ? "#f0c84a" : "#475569",
          }}>{s.label}</button>
        ))}
      </div>

      {/* Row 1: TradingView professional chart */}
      <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              TradingView — {selected.label}
            </h3>
            <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              Chart professionnel · Change de symbole directement dans le widget
            </p>
          </div>
          <span style={{
            fontSize: 10, color: "#22c55e", background: "rgba(34,197,94,0.08)",
            padding: "2px 8px", borderRadius: 999, border: "1px solid rgba(34,197,94,0.2)", fontWeight: 700,
          }}>
            LIVE
          </span>
        </div>
        {/* key forces widget remount on symbol change */}
        <TradingViewChart key={selected.tv} tvSymbol={selected.tv} height={520} />
      </div>

      {/* Row 2: Private indicator */}
      <div style={{ marginBottom: 20 }}>
        <MyIndicatorChart yfSymbol={selected.yf} label={selected.label} />
      </div>

      {/* Row 3: Open Interest */}
      <div style={{ marginBottom: 20 }}>
        <OpenInterestCard />
      </div>

      {/* How-to footer */}
      <div style={{
        padding: "12px 16px", background: "#10101e", border: "1px solid #1c1c38",
        borderRadius: 10, fontSize: 11, color: "#475569", lineHeight: 1.7,
      }}>
        💡 <strong style={{ color: "#94a3b8" }}>Mon Indicateur</strong> : La logique est dans{" "}
        <code style={{ color: "#f0c84a", background: "#0d0d1a", padding: "1px 5px", borderRadius: 4 }}>
          components/MyIndicatorChart.tsx
        </code>{" "}
        → fonction{" "}
        <code style={{ color: "#f0c84a", background: "#0d0d1a", padding: "1px 5px", borderRadius: 4 }}>
          computeMyIndicator()
        </code>
        . Traduis ton Pine Script en TypeScript dans cette fonction. Les données OHLCV viennent de Yahoo Finance (gratuit, sans clé API).
      </div>
    </div>
  );
}
