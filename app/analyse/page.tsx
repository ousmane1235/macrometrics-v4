"use client";
import { useState, useEffect, useRef } from "react";
import {
  FOREX_CURRENCIES, COMMODITIES, CRYPTOS,
  CurrencyMacro, CommodityMacro, CryptoMacro,
  Signal, Stance,
} from "@/lib/macro-data";
import { useMacroLive } from "@/lib/use-macro-live";

// ─── Types live data ──────────────────────────────────────────────────────
interface LiveIndicator {
  value: number;
  prev?: number;
  date: string;
  unit: string;
  source: string;
  url?: string;
}
interface LiveCurrencyData {
  rate:           { rate: number; prev: number; date: string; next: string };
  cpi:            LiveIndicator;
  gdp:            LiveIndicator;
  unemployment:   LiveIndicator;
  currentAccount: LiveIndicator;
  pmiMfg:  { value: number; prev: number; date: string; source?: string };
  pmiSvc:  { value: number; prev: number; date: string; source?: string };
  wages:   { value: number; prev: number; date: string; unit: string; source?: string };
  retail:  { value: number; prev: number; date: string; unit: string; source?: string };
  confidence: { value: number; prev: number; date: string; label: string; source?: string };
}
type LiveData = Record<string, LiveCurrencyData>;

// ─── Adaptateur Trading Economics → LiveData ──────────────────────────────
interface TEInd {
  value: number; prev: number; date: string; unit: string;
  source: "Trading Economics"; url: string; category: string;
}
type TECountryData = Record<string, TEInd>;

// Taux statiques banques centrales (avril 2026)
const CB_RATES: Record<string, { rate: number; prev: number; date: string; next: string }> = {
  USD: { rate: 4.50, prev: 4.75, date: "Jan 2026", next: "7 mai 2026" },
  EUR: { rate: 2.50, prev: 2.75, date: "Mar 2026", next: "17 avr 2026" },
  GBP: { rate: 4.50, prev: 4.75, date: "Fév 2026", next: "8 mai 2026" },
  JPY: { rate: 0.50, prev: 0.25, date: "Jan 2026", next: "1 mai 2026" },
  CHF: { rate: 0.25, prev: 0.50, date: "Mar 2026", next: "19 juin 2026" },
  CAD: { rate: 2.75, prev: 3.00, date: "Mar 2026", next: "16 avr 2026" },
  AUD: { rate: 4.10, prev: 4.35, date: "Fév 2026", next: "20 mai 2026" },
  NZD: { rate: 3.50, prev: 4.00, date: "Fév 2026", next: "28 mai 2026" },
};

function adaptTE(raw: Record<string, TECountryData>): LiveData {
  const result: LiveData = {};
  for (const [code, inds] of Object.entries(raw)) {
    const g = (key: string): TEInd | undefined => inds[key];
    const toInd = (key: string, fallbackUnit = "%"): LiveIndicator => {
      const d = g(key);
      if (!d) return { value: 0, date: "N/A", unit: fallbackUnit, source: "N/A" };
      return { value: d.value, prev: d.prev, date: d.date, unit: d.unit, source: "Trading Economics", url: d.url };
    };

    // Taux depuis TE si disponible, sinon statique
    const rateTE = g("rate");
    const rate = rateTE
      ? { rate: rateTE.value, prev: rateTE.prev, date: rateTE.date, next: CB_RATES[code]?.next ?? "" }
      : (CB_RATES[code] ?? { rate: 0, prev: 0, date: "N/A", next: "N/A" });

    result[code] = {
      rate,
      cpi:            toInd("cpi", "%"),
      gdp:            toInd("gdpAnnual") ?? toInd("gdp", "%"),
      unemployment:   toInd("unemployment", "%"),
      currentAccount: toInd("currentAccount"),
      pmiMfg: {
        value: g("pmiManufacturing")?.value ?? 0,
        prev:  g("pmiManufacturing")?.prev  ?? 0,
        date:  g("pmiManufacturing")?.date  ?? "N/A",
        source: g("pmiManufacturing") ? "Trading Economics" : "Statique",
      },
      pmiSvc: {
        value: g("pmiServices")?.value ?? 0,
        prev:  g("pmiServices")?.prev  ?? 0,
        date:  g("pmiServices")?.date  ?? "N/A",
        source: g("pmiServices") ? "Trading Economics" : "Statique",
      },
      wages: {
        value: g("wageGrowth")?.value ?? 0,
        prev:  g("wageGrowth")?.prev  ?? 0,
        date:  g("wageGrowth")?.date  ?? "N/A",
        unit:  g("wageGrowth")?.unit  ?? "% YoY",
        source: g("wageGrowth") ? "Trading Economics" : "Statique",
      },
      retail: {
        value: g("retailSales")?.value ?? g("retailSalesYoY")?.value ?? 0,
        prev:  g("retailSales")?.prev  ?? g("retailSalesYoY")?.prev  ?? 0,
        date:  g("retailSales")?.date  ?? "N/A",
        unit:  g("retailSales")?.unit  ?? "% MoM",
        source: (g("retailSales") || g("retailSalesYoY")) ? "Trading Economics" : "Statique",
      },
      confidence: {
        value: g("confidence")?.value ?? 0,
        prev:  g("confidence")?.prev  ?? 0,
        date:  g("confidence")?.date  ?? "N/A",
        label: "Trading Economics",
        source: g("confidence") ? "Trading Economics" : "Statique",
      },
    };
  }
  return result;
}

// ─── helpers ──────────────────────────────────────────────────────────────
const SIG_COLOR: Record<Signal, string> = {
  bullish: "#22c55e", bearish: "#ef4444", neutral: "#eab308",
};
const SIG_ICON: Record<Signal, string> = {
  bullish: "▲", bearish: "▼", neutral: "◆",
};
const SIG_BG: Record<Signal, string> = {
  bullish: "rgba(34,197,94,0.10)",
  bearish: "rgba(239,68,68,0.10)",
  neutral: "rgba(234,179,8,0.10)",
};
const STANCE_COLOR: Record<Stance, string> = {
  hawkish: "#22c55e", neutral: "#eab308", dovish: "#ef4444",
};
const STANCE_LABEL: Record<Stance, string> = {
  hawkish: "HAWKISH 🦅", neutral: "NEUTRE ⚖️", dovish: "DOVISH 🕊️",
};

/** Détermine le signal depuis la variation valeur vs précédent */
function autoSignal(value: number, prev: number | undefined, inverted = false): Signal {
  if (prev == null) return "neutral";
  const up = value > prev;
  return inverted ? (up ? "bearish" : "bullish") : (up ? "bullish" : "bearish");
}

// ─── TradingView chart ────────────────────────────────────────────────────
function TVChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "height:400px;width:100%";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.cssText = "height:calc(100% - 32px);width:100%";
    wrapper.appendChild(inner);
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (script as any).innerHTML = JSON.stringify({
      autosize: true, symbol, interval: "D",
      timezone: "Europe/Paris", theme: "dark", style: "1",
      locale: "fr", backgroundColor: "#10101e",
      gridColor: "rgba(28,28,56,0.5)",
      hide_top_toolbar: false, hide_legend: false,
      save_image: false, calendar: false,
      support_host: "https://www.tradingview.com",
    });
    wrapper.appendChild(script);
    ref.current.appendChild(wrapper);
  }, [symbol]);
  return <div ref={ref} style={{ height: 400, borderRadius: 10, overflow: "hidden" }} />;
}

// ─── Source badge ─────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const isLive = source !== "N/A" && source !== "Statique" && source !== "📌";
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
      background: isLive ? "rgba(59,130,246,0.15)" : "rgba(71,85,105,0.2)",
      color: isLive ? "#60a5fa" : "#475569",
      border: `1px solid ${isLive ? "rgba(59,130,246,0.3)" : "rgba(71,85,105,0.3)"}`,
      letterSpacing: "0.04em", textTransform: "uppercase" as const,
    }}>
      {isLive ? `🌐 ${source}` : `📌 ${source}`}
    </span>
  );
}

// ─── Indicator card ───────────────────────────────────────────────────────
interface IndicatorCardProps {
  label: string;
  value: number;
  prev?: number;
  unit: string;
  signal: Signal;
  date: string;
  description: string;
  source?: string;
}
function IndicatorCard({ label, value, prev, unit, signal, date, description, source }: IndicatorCardProps) {
  const [hover, setHover] = useState(false);
  const chg = prev != null ? value - prev : null;
  const chgStr = chg != null
    ? (chg >= 0 ? "+" : "") + chg.toFixed(Math.abs(chg) < 10 ? 1 : 0)
    : null;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#141428" : "#10101e",
        border: `1px solid ${hover ? SIG_COLOR[signal] + "50" : "#1c1c38"}`,
        borderRadius: 10, padding: "12px 14px",
        cursor: "default", transition: "all 0.15s",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: SIG_COLOR[signal], borderRadius: "10px 0 0 10px",
      }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, lineHeight: 1.3 }}>
            {label}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
            background: SIG_BG[signal], color: SIG_COLOR[signal],
            border: `1px solid ${SIG_COLOR[signal]}30`, whiteSpace: "nowrap",
          }}>
            {SIG_ICON[signal]} {signal.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9", fontFamily: "JetBrains Mono, monospace" }}>
            {value}
          </span>
          <span style={{ fontSize: 11, color: "#475569" }}>{unit}</span>
          {chgStr && (
            <span style={{
              fontSize: 11, fontWeight: 700, marginLeft: "auto",
              color: chg! > 0 ? "#22c55e" : chg! < 0 ? "#ef4444" : "#475569",
              fontFamily: "JetBrains Mono, monospace",
            }}>
              {chgStr}
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, gap: 6 }}>
          {prev != null && (
            <span style={{ fontSize: 10, color: "#334155" }}>Préc. {prev}</span>
          )}
          <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto" }}>{date}</span>
          {source && <SourceBadge source={source} />}
        </div>
        {hover && (
          <div style={{
            marginTop: 8, fontSize: 11, color: "#94a3b8",
            borderTop: "1px solid #1c1c38", paddingTop: 8, lineHeight: 1.5,
          }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hawkish/Dovish gauge ─────────────────────────────────────────────────
function StanceGauge({ stance }: { stance: Stance }) {
  const positions: Record<Stance, number> = { dovish: 15, neutral: 50, hawkish: 85 };
  const color = STANCE_COLOR[stance];
  return (
    <div style={{ padding: "6px 0" }}>
      <div style={{ position: "relative", height: 8, background: "linear-gradient(to right,#ef4444 0%,#eab308 50%,#22c55e 100%)", borderRadius: 99 }}>
        <div style={{
          position: "absolute", top: "50%", left: `${positions[stance]}%`,
          transform: "translate(-50%,-50%)",
          width: 16, height: 16, borderRadius: "50%",
          background: color, border: "2px solid #060610",
          boxShadow: `0 0 8px ${color}`,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 9, color: "#ef4444" }}>DOVISH 🕊️</span>
        <span style={{ fontSize: 9, color: "#22c55e" }}>HAWKISH 🦅</span>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 20 }: { w?: string; h?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "linear-gradient(90deg,#1c1c38 25%,#252540 50%,#1c1c38 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ─── Currency view ────────────────────────────────────────────────────────
function ForexView({ data, live }: { data: CurrencyMacro; live: LiveCurrencyData | null }) {
  const rate = live?.rate ?? { rate: data.currentRate, prev: data.prevRate, date: data.rateDate, next: data.nextMeeting };
  const rateChg = rate.rate - rate.prev;

  // Build enriched indicators array (live > static)
  const indicators: IndicatorCardProps[] = [
    {
      label: "IPC / Inflation",
      value: live?.cpi.value ?? data.indicators.cpi.value,
      prev: live?.cpi.prev ?? data.indicators.cpi.prev,
      unit: live?.cpi.unit ?? data.indicators.cpi.unit,
      signal: autoSignal(
        live?.cpi.value ?? data.indicators.cpi.value,
        live?.cpi.prev ?? data.indicators.cpi.prev,
        true,
      ),
      date: live?.cpi.date ?? data.indicators.cpi.date,
      description: data.indicators.cpi.description,
      source: live?.cpi.source ?? "📌",
    },
    {
      label: "PIB (Croissance)",
      value: live?.gdp.value ?? data.indicators.gdp.value,
      prev: data.indicators.gdp.prev,
      unit: live?.gdp.unit ?? data.indicators.gdp.unit,
      signal: autoSignal(
        live?.gdp.value ?? data.indicators.gdp.value,
        data.indicators.gdp.prev,
      ),
      date: live?.gdp.date ?? data.indicators.gdp.date,
      description: data.indicators.gdp.description,
      source: live?.gdp.source ?? "📌",
    },
    {
      label: "PMI Manufacturier",
      value: live?.pmiMfg.value ?? data.indicators.pmiManufacturing.value,
      prev: live?.pmiMfg.prev ?? data.indicators.pmiManufacturing.prev,
      unit: "pts",
      signal: (live?.pmiMfg.value ?? data.indicators.pmiManufacturing.value) >= 50 ? "bullish" : "bearish",
      date: live?.pmiMfg.date ?? data.indicators.pmiManufacturing.date,
      description: data.indicators.pmiManufacturing.description,
      source: "S&P Global",
    },
    {
      label: "PMI Services",
      value: live?.pmiSvc.value ?? data.indicators.pmiServices.value,
      prev: live?.pmiSvc.prev ?? data.indicators.pmiServices.prev,
      unit: "pts",
      signal: (live?.pmiSvc.value ?? data.indicators.pmiServices.value) >= 50 ? "bullish" : "bearish",
      date: live?.pmiSvc.date ?? data.indicators.pmiServices.date,
      description: data.indicators.pmiServices.description,
      source: "S&P Global",
    },
    {
      label: "Chômage",
      value: live?.unemployment.value ?? data.indicators.unemployment.value,
      prev: data.indicators.unemployment.prev,
      unit: live?.unemployment.unit ?? data.indicators.unemployment.unit,
      signal: autoSignal(
        live?.unemployment.value ?? data.indicators.unemployment.value,
        data.indicators.unemployment.prev,
        true,
      ),
      date: live?.unemployment.date ?? data.indicators.unemployment.date,
      description: data.indicators.unemployment.description,
      source: live?.unemployment.source ?? "📌",
    },
    {
      label: "Compte Courant",
      value: live?.currentAccount.value ?? data.indicators.currentAccount.value,
      prev: data.indicators.currentAccount.prev,
      unit: live?.currentAccount.unit ?? data.indicators.currentAccount.unit,
      signal: autoSignal(
        live?.currentAccount.value ?? data.indicators.currentAccount.value,
        data.indicators.currentAccount.prev,
      ),
      date: live?.currentAccount.date ?? data.indicators.currentAccount.date,
      description: data.indicators.currentAccount.description,
      source: live?.currentAccount.source ?? "📌",
    },
    {
      label: "Ventes au Détail",
      value: live?.retail.value ?? data.indicators.retailSales.value,
      prev: live?.retail.prev ?? data.indicators.retailSales.prev,
      unit: live?.retail.unit ?? data.indicators.retailSales.unit,
      signal: autoSignal(
        live?.retail.value ?? data.indicators.retailSales.value,
        live?.retail.prev ?? data.indicators.retailSales.prev,
      ),
      date: live?.retail.date ?? data.indicators.retailSales.date,
      description: data.indicators.retailSales.description,
      source: "Statique",
    },
    {
      label: `Confiance Conso. (${live?.confidence.label ?? ""})`,
      value: live?.confidence.value ?? data.indicators.confidence.value,
      prev: live?.confidence.prev ?? data.indicators.confidence.prev,
      unit: "pts",
      signal: autoSignal(
        live?.confidence.value ?? data.indicators.confidence.value,
        live?.confidence.prev ?? data.indicators.confidence.prev,
      ),
      date: live?.confidence.date ?? data.indicators.confidence.date,
      description: data.indicators.confidence.description,
      source: "Statique",
    },
    {
      label: "Salaires",
      value: live?.wages.value ?? data.indicators.wageGrowth.value,
      prev: live?.wages.prev ?? data.indicators.wageGrowth.prev,
      unit: live?.wages.unit ?? data.indicators.wageGrowth.unit,
      signal: autoSignal(
        live?.wages.value ?? data.indicators.wageGrowth.value,
        live?.wages.prev ?? data.indicators.wageGrowth.prev,
        true,
      ),
      date: live?.wages.date ?? data.indicators.wageGrowth.date,
      description: data.indicators.wageGrowth.description,
      source: "Statique",
    },
    {
      label: "Balance Commerciale",
      value: data.indicators.tradeBalance.value,
      prev: data.indicators.tradeBalance.prev,
      unit: data.indicators.tradeBalance.unit,
      signal: data.indicators.tradeBalance.signal,
      date: data.indicators.tradeBalance.date,
      description: data.indicators.tradeBalance.description,
      source: "Statique",
    },
  ];

  const bullCount = indicators.filter(i => i.signal === "bullish").length;
  const bearCount = indicators.filter(i => i.signal === "bearish").length;
  const bias: Signal = bullCount > bearCount ? "bullish" : bearCount > bullCount ? "bearish" : "neutral";
  const liveCount = indicators.filter(i => i.source && i.source !== "Statique" && i.source !== "📌").length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
      {/* LEFT */}
      <div>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
          padding: "16px 20px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12,
        }}>
          <span style={{ fontSize: 44 }}>{data.flag}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9" }}>{data.name}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{data.country} · {data.centralBank}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f0c84a", fontFamily: "JetBrains Mono, monospace" }}>
              {rate.rate.toFixed(2)}%
            </div>
            <div style={{ fontSize: 11, color: rateChg < 0 ? "#22c55e" : rateChg > 0 ? "#ef4444" : "#475569", fontFamily: "JetBrains Mono, monospace" }}>
              {rateChg <= 0 ? "▼" : "▲"} {Math.abs(rateChg).toFixed(2)}% vs préc.
            </div>
            <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{rate.date}</div>
          </div>
        </div>

        {/* Live data banner */}
        {live && (
          <div style={{
            marginBottom: 14, padding: "8px 14px", borderRadius: 8,
            background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)",
            display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#60a5fa",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <strong>{liveCount} indicateurs en données réelles</strong>
            <span style={{ color: "#334155" }}>· IMF WEO · BLS · ECB SDW</span>
            <span style={{ marginLeft: "auto", color: "#334155" }}>
              {indicators.length - liveCount} statiques (PMI, salaires, retail)
            </span>
          </div>
        )}

        {/* Indicator grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {indicators.map((ind) => (
            <IndicatorCard key={ind.label} {...ind} />
          ))}
        </div>

        {/* Bias summary */}
        <div style={{
          padding: "12px 16px", background: "#10101e",
          border: `1px solid ${SIG_COLOR[bias]}30`, borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: SIG_BG[bias], display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 18, color: SIG_COLOR[bias], fontWeight: 900,
          }}>
            {SIG_ICON[bias]}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: SIG_COLOR[bias] }}>
              Biais Global : {bias === "bullish" ? "Haussier" : bias === "bearish" ? "Baissier" : "Neutre"} ({bullCount}▲ / {bearCount}▼ / {10 - bullCount - bearCount}◆)
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              Sur {indicators.length} indicateurs · Survolez chaque carte pour les détails
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Central Bank Card */}
        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {data.cbCode}
            </h3>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
              background: STANCE_COLOR[data.stance] + "18", color: STANCE_COLOR[data.stance],
              border: `1px solid ${STANCE_COLOR[data.stance]}40`,
            }}>
              {STANCE_LABEL[data.stance]}
            </span>
          </div>

          <StanceGauge stance={data.stance} />

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#0d0d1a", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>Taux Actuel</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#f0c84a", fontFamily: "JetBrains Mono, monospace" }}>
                {live ? rate.rate.toFixed(2) : data.currentRate.toFixed(2)}%
              </div>
              {live && data.code === "EUR" && rate.date === "ECB live" && (
                <SourceBadge source="ECB live" />
              )}
            </div>
            <div style={{ background: "#0d0d1a", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#475569" }}>Cible Inflation</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>{data.rateTarget}</div>
            </div>
          </div>

          <div style={{ marginTop: 10, background: "#0d0d1a", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>📅 Prochaine Réunion</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
              {live ? rate.next : data.nextMeeting}
            </div>
          </div>

          <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, lineHeight: 1.6, margin: "12px 0 0" }}>
            {data.stanceNote}
          </p>
        </div>

        {/* Themes */}
        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Thèmes Macro Clés
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.themes.map((t, i) => (
              <div key={i} style={{
                padding: "10px 12px", background: "#0d0d1a",
                borderRadius: 8, border: "1px solid #1c1c38",
                fontSize: 12, color: "#94a3b8", lineHeight: 1.5,
              }}>{t}</div>
            ))}
          </div>
        </div>

        {/* TV Chart */}
        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1c1c38" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>📈 {data.tvSymbol}</span>
          </div>
          <TVChart symbol={data.tvSymbol} />
        </div>
      </div>
    </div>
  );
}

// ─── Commodity view ───────────────────────────────────────────────────────
function CommodityView({ data }: { data: CommodityMacro }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
          padding: "16px 20px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12,
        }}>
          <span style={{ fontSize: 44 }}>{data.flag}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9" }}>{data.name}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{data.category}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f0c84a", fontFamily: "JetBrains Mono, monospace" }}>
              {data.currentPrice.toLocaleString("fr-FR")}
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>{data.priceUnit}</div>
          </div>
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Facteurs & Drivers
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {data.drivers.map((d, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: "#10101e", border: `1px solid ${SIG_COLOR[d.signal]}25`,
              borderLeft: `3px solid ${SIG_COLOR[d.signal]}`, borderRadius: "0 8px 8px 0",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{d.label}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{d.desc}</div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800, fontSize: 14, color: SIG_COLOR[d.signal] }}>
                {d.value}
              </div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Facteurs Clés Trader
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {data.keyFactors.map((f, i) => (
            <div key={i} style={{ padding: "10px 12px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 8, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{f}</div>
          ))}
        </div>

        <div style={{ padding: "14px 16px", background: "#10101e", border: `1px solid ${SIG_COLOR[data.outlineSignal]}40`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SIG_COLOR[data.outlineSignal], marginBottom: 6 }}>
            {SIG_ICON[data.outlineSignal]} OUTLOOK
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{data.outlook}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1c1c38" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>📈 {data.tvSymbol}</span>
          </div>
          <TVChart symbol={data.tvSymbol} />
        </div>

        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Corrélations
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.correlations.map((c, i) => {
              const val = parseFloat(c.correlation);
              const corrColor = val > 0.5 ? "#22c55e" : val < -0.5 ? "#ef4444" : "#eab308";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#0d0d1a", borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{c.asset}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{c.note}</div>
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800, fontSize: 14, color: corrColor }}>{c.correlation}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Crypto view ──────────────────────────────────────────────────────────
function CryptoView({ data }: { data: CryptoMacro }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, alignItems: "start" }}>
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
          padding: "16px 20px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12,
        }}>
          <span style={{ fontSize: 44 }}>{data.flag}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#f1f5f9" }}>{data.name}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>Crypto · CME Futures</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f0c84a", fontFamily: "JetBrains Mono, monospace" }}>
              ${data.currentPrice.toLocaleString("fr-FR")}
            </div>
            <div style={{ fontSize: 11, color: "#475569" }}>USD</div>
          </div>
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Drivers Macro & Marché
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {data.drivers.map((d, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
              background: "#10101e", border: `1px solid ${SIG_COLOR[d.signal]}25`,
              borderLeft: `3px solid ${SIG_COLOR[d.signal]}`, borderRadius: "0 8px 8px 0",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0" }}>{d.label}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{d.desc}</div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800, fontSize: 14, color: SIG_COLOR[d.signal] }}>{d.value}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Métriques On-Chain
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {data.onchain.map((o, i) => (
            <div key={i} style={{
              background: "#10101e", border: `1px solid ${SIG_COLOR[o.signal]}25`,
              borderTop: `2px solid ${SIG_COLOR[o.signal]}`,
              borderRadius: 8, padding: "10px 12px", textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{o.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: SIG_COLOR[o.signal], fontFamily: "JetBrains Mono, monospace" }}>{o.value}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Facteurs Clés
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {data.keyFactors.map((f, i) => (
            <div key={i} style={{ padding: "10px 12px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 8, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{f}</div>
          ))}
        </div>

        <div style={{ padding: "14px 16px", background: "#10101e", border: `1px solid ${SIG_COLOR[data.outlineSignal]}40`, borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: SIG_COLOR[data.outlineSignal], marginBottom: 6 }}>
            {SIG_ICON[data.outlineSignal]} OUTLOOK
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>{data.outlook}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #1c1c38" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>📈 {data.tvSymbol}</span>
          </div>
          <TVChart symbol={data.tvSymbol} />
        </div>

        <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
            Corrélations
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.correlations.map((c, i) => {
              const val = parseFloat(c.correlation);
              const corrColor = val > 0.5 ? "#22c55e" : val < -0.5 ? "#ef4444" : "#eab308";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#0d0d1a", borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{c.asset}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{c.note}</div>
                  </div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 800, fontSize: 14, color: corrColor }}>{c.correlation}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live status bar ─────────────────────────────────────────────────────
function LiveStatusBar({
  loading, error, refreshing, lastUpdate, nextRefreshIn, inWindow, windowLabel,
  dataSource, apiKeyMissing, onRefresh,
}: {
  loading: boolean; error: boolean; refreshing: boolean;
  lastUpdate: Date | null; nextRefreshIn: number;
  inWindow: boolean; windowLabel: string;
  dataSource: string | null; apiKeyMissing: boolean;
  onRefresh: () => void;
}) {
  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  const isTE = dataSource === "Trading Economics";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "8px 14px", borderRadius: 10,
        background: inWindow ? "rgba(251,191,36,0.07)" : error ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.05)",
        border: `1px solid ${inWindow ? "rgba(251,191,36,0.3)" : error ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.2)"}`,
        fontSize: 11,
      }}>
        {/* Dot */}
        {loading || refreshing ? (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#eab308", display: "inline-block", animation: "pulse 1s infinite" }} />
        ) : error ? (
          <span style={{ color: "#ef4444" }}>⚠️</span>
        ) : (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: inWindow ? "#fbbf24" : "#22c55e", display: "inline-block" }} className="blink" />
        )}

        {/* Status text */}
        <span style={{ fontWeight: 700, color: inWindow ? "#fbbf24" : error ? "#ef4444" : "#22c55e" }}>
          {loading ? "Chargement…" : refreshing ? "Mise à jour…" : error ? "Données statiques (API indisponible)" : inWindow ? `🔔 ANNONCE IMMINENTE — ${windowLabel}` : "LIVE"}
        </span>

        {/* Source badge */}
        {!error && !loading && dataSource && (
          <span style={{
            padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
            background: isTE ? "rgba(59,130,246,0.15)" : "rgba(71,85,105,0.2)",
            color: isTE ? "#60a5fa" : "#94a3b8",
            border: `1px solid ${isTE ? "rgba(59,130,246,0.3)" : "rgba(71,85,105,0.3)"}`,
          }}>
            {isTE ? "📊 Trading Economics" : "🌐 IMF · BLS · ECB"}
          </span>
        )}

      {/* Last update */}
      {timeStr && (
        <span style={{ color: "#334155", marginLeft: 4 }}>
          Mise à jour {timeStr}
        </span>
      )}

      {/* Countdown */}
      {!loading && !error && (
        <span style={{
          marginLeft: "auto", color: inWindow ? "#fbbf24" : "#475569",
          fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
        }}>
          ↻ {nextRefreshIn}s {inWindow && <span style={{ color: "#fbbf24" }}>(mode annonce)</span>}
        </span>
      )}

        {/* Countdown */}
        {!loading && !error && (
          <span style={{
            marginLeft: "auto", color: inWindow ? "#fbbf24" : "#475569",
            fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
          }}>
            ↻ {nextRefreshIn}s {inWindow && <span style={{ color: "#fbbf24" }}>(mode annonce)</span>}
          </span>
        )}

        {/* Last update */}
        {timeStr && (
          <span style={{ color: "#334155" }}>Màj {timeStr}</span>
        )}

        {/* Manual refresh button */}
        <button
          onClick={onRefresh}
          disabled={refreshing || loading}
          style={{
            background: "rgba(240,200,74,0.1)", border: "1px solid rgba(240,200,74,0.3)",
            borderRadius: 6, padding: "3px 10px", cursor: refreshing ? "wait" : "pointer",
            color: "#f0c84a", fontWeight: 700, fontSize: 11,
            opacity: refreshing ? 0.5 : 1, transition: "opacity 0.2s",
          }}
        >
          {refreshing ? "↻ …" : "↻ Rafraîchir"}
        </button>
      </div>

      {/* Clé API manquante → instructions */}
      {apiKeyMissing && !loading && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, fontSize: 11,
          background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)",
          color: "#92400e", display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>⚠️</span>
          <span style={{ color: "#d97706" }}>
            <strong>Données Trading Economics limitées</strong> — accès guest utilisé.
            Clé gratuite sur{" "}
            <strong style={{ color: "#f0c84a" }}>tradingeconomics.com</strong>{" "}
            → ajouter <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 3 }}>TE_API_KEY=votre_clé</code> dans <code style={{ background: "rgba(0,0,0,0.3)", padding: "1px 5px", borderRadius: 3 }}>.env.local</code>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────
type Tab = "forex" | "commodity" | "crypto";

export default function AnalysePage() {
  const [tab, setTab] = useState<Tab>("forex");
  const [selectedForex, setSelectedForex] = useState("USD");
  const [selectedCommodity, setSelectedCommodity] = useState("XAU");
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");

  const {
    data: rawLive, loading: loadingLive, error: liveError,
    lastUpdate, nextRefreshIn, refreshing, inWindow, windowLabel,
    dataSource, apiKeyMissing, refresh,
  } = useMacroLive();

  // Adapter les données selon la source
  let liveData: LiveData | null = null;
  if (rawLive) {
    if (dataSource === "Trading Economics") {
      liveData = adaptTE(rawLive as Record<string, TECountryData>);
    } else {
      liveData = rawLive as LiveData;
    }
  }

  const currentForex     = FOREX_CURRENCIES.find(c => c.code === selectedForex)     ?? FOREX_CURRENCIES[0];
  const currentCommodity = COMMODITIES.find(c => c.code === selectedCommodity)       ?? COMMODITIES[0];
  const currentCrypto    = CRYPTOS.find(c => c.code === selectedCrypto)              ?? CRYPTOS[0];

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "forex",     label: "G8 Forex",          icon: "💱" },
    { id: "commodity", label: "Matières Premières", icon: "🛢️" },
    { id: "crypto",    label: "Crypto",             icon: "₿" },
  ];

  return (
    <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 20px" }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .blink{animation:pulse 2s infinite}
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>Analyse Macro Complète</h1>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
          G8 Forex · Matières Premières · Crypto · Taux · Inflation · PMI · PIB · Emploi
        </p>
      </div>

      {/* Live status bar */}
      <div style={{ marginBottom: 20 }}>
        <LiveStatusBar
          loading={loadingLive} error={liveError} refreshing={refreshing}
          lastUpdate={lastUpdate} nextRefreshIn={nextRefreshIn}
          inWindow={inWindow} windowLabel={windowLabel}
          dataSource={dataSource} apiKeyMissing={apiKeyMissing}
          onRefresh={refresh}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: tab === t.id ? "rgba(240,200,74,0.12)" : "#10101e",
            border: `1px solid ${tab === t.id ? "rgba(240,200,74,0.4)" : "#1c1c38"}`,
            color: tab === t.id ? "#f0c84a" : "#475569", transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Asset selector */}
      {tab === "forex" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
          {FOREX_CURRENCIES.map(c => {
            const live = liveData?.[c.code];
            const inds = Object.values(c.indicators);
            const bulls = inds.filter(i => i.signal === "bullish").length;
            const bears = inds.filter(i => i.signal === "bearish").length;
            const bias: Signal = bulls > bears ? "bullish" : bears > bulls ? "bearish" : "neutral";
            const active = selectedForex === c.code;
            const cpiVal = live?.cpi.value;
            return (
              <button key={c.code} onClick={() => setSelectedForex(c.code)} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                background: active ? SIG_BG[bias] : "#10101e",
                border: `1px solid ${active ? SIG_COLOR[bias] + "60" : "#1c1c38"}`,
                color: active ? SIG_COLOR[bias] : "#94a3b8", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <span>{c.flag}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{c.code}</span>
                {cpiVal != null && (
                  <span style={{ fontSize: 10, color: "#60a5fa", fontFamily: "JetBrains Mono, monospace" }}>
                    {cpiVal}%
                  </span>
                )}
                <span style={{
                  fontSize: 10, padding: "1px 5px", borderRadius: 4,
                  background: SIG_COLOR[bias] + "20", color: SIG_COLOR[bias],
                }}>
                  {SIG_ICON[bias]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "commodity" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
          {COMMODITIES.map(c => {
            const active = selectedCommodity === c.code;
            return (
              <button key={c.code} onClick={() => setSelectedCommodity(c.code)} style={{
                padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                background: active ? SIG_BG[c.outlineSignal] : "#10101e",
                border: `1px solid ${active ? SIG_COLOR[c.outlineSignal] + "60" : "#1c1c38"}`,
                color: active ? SIG_COLOR[c.outlineSignal] : "#94a3b8", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <span>{c.flag}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{c.code}</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "crypto" && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
          {CRYPTOS.map(c => {
            const active = selectedCrypto === c.code;
            return (
              <button key={c.code} onClick={() => setSelectedCrypto(c.code)} style={{
                padding: "8px 16px", borderRadius: 10, cursor: "pointer",
                background: active ? SIG_BG[c.outlineSignal] : "#10101e",
                border: `1px solid ${active ? SIG_COLOR[c.outlineSignal] + "60" : "#1c1c38"}`,
                color: active ? SIG_COLOR[c.outlineSignal] : "#94a3b8", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 7,
              }}>
                <span>{c.flag}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{c.code}</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {tab === "forex" && (
        loadingLive
          ? <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} h={90} />)}
            </div>
          : <ForexView data={currentForex} live={liveData?.[selectedForex] ?? null} />
      )}
      {tab === "commodity" && <CommodityView data={currentCommodity} />}
      {tab === "crypto"    && <CryptoView    data={currentCrypto} />}

      {/* Footer */}
      <div style={{ marginTop: 28, padding: "12px 16px", background: "#10101e", border: "1px solid #1c1c38", borderRadius: 10, fontSize: 11, color: "#475569", lineHeight: 1.7 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <span><strong style={{ color: "#94a3b8" }}>🌐 Live :</strong> IMF WEO · BLS (CPI US mensuel) · ECB SDW (taux BCE)</span>
          <span><strong style={{ color: "#94a3b8" }}>🔔 Auto-refresh :</strong> 60s normal · 15s pendant fenêtres d&apos;annonces (8h30 ET, 10h00 ET, 14h00 ET)</span>
          <span><strong style={{ color: "#94a3b8" }}>📌 Statique :</strong> PMI S&P Global · Ventes détail · Salaires · Confiance conso.</span>
        </div>
        <div style={{ marginTop: 6, color: "#334155" }}>
          ⚠️ Indicatif uniquement — vérifiez toujours les sources officielles avant toute décision de trading.
        </div>
      </div>
    </div>
  );
}
