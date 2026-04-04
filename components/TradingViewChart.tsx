"use client";

import { useEffect, useRef, useState } from "react";

const SYMBOLS = [
  { label: "EUR/USD", tv: "FX:EURUSD" },
  { label: "GBP/USD", tv: "FX:GBPUSD" },
  { label: "USD/JPY", tv: "FX:USDJPY" },
  { label: "Gold", tv: "OANDA:XAUUSD" },
  { label: "DXY", tv: "TVC:DXY" },
  { label: "S&P 500", tv: "SP:SPX" },
  { label: "BTC/USD", tv: "BITSTAMP:BTCUSD" },
  { label: "WTI Oil", tv: "TVC:USOIL" },
];

const INTERVALS = [
  { label: "1H", value: "60" },
  { label: "4H", value: "240" },
  { label: "1J", value: "D" },
  { label: "1S", value: "W" },
];

export default function TradingViewChart() {
  const ref = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState("FX:EURUSD");
  const [interval, setInterval] = useState("D");

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Europe/Paris",
      theme: "dark",
      style: "1",
      locale: "fr",
      backgroundColor: "#10101e",
      gridColor: "#1c1c38",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      save_image: false,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.height = "500px";
    wrapper.style.width = "100%";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.height = "calc(100% - 32px)";
    inner.style.width = "100%";
    wrapper.appendChild(inner);
    wrapper.appendChild(script);
    ref.current.appendChild(wrapper);
  }, [symbol, interval]);

  return (
    <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #1c1c38", flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Graphiques TradingView — Analyse Technique
        </h3>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {/* Symbol buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            {SYMBOLS.map((s) => (
              <button key={s.tv} onClick={() => setSymbol(s.tv)}
                style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
                  background: symbol === s.tv ? "rgba(212,175,55,0.12)" : "transparent",
                  border: `1px solid ${symbol === s.tv ? "rgba(212,175,55,0.3)" : "#1c1c38"}`,
                  color: symbol === s.tv ? "#f0c84a" : "#475569" }}>
                {s.label}
              </button>
            ))}
          </div>
          {/* Interval buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            {INTERVALS.map((iv) => (
              <button key={iv.value} onClick={() => setInterval(iv.value)}
                style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
                  background: interval === iv.value ? "rgba(34,197,94,0.1)" : "transparent",
                  border: `1px solid ${interval === iv.value ? "rgba(34,197,94,0.3)" : "#1c1c38"}`,
                  color: interval === iv.value ? "#22c55e" : "#475569" }}>
                {iv.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div ref={ref} style={{ height: 500 }} />
    </div>
  );
}
