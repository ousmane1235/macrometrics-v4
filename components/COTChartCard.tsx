"use client";
import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

interface COTWeek { weekDate: string; nonCommNet: number; openInterest: number; changeLong: number; changeShort: number; nonCommLong: number; nonCommShort: number; commNet: number; }
interface COTInstrument { name: string; category: string; latest: COTWeek; history: COTWeek[]; sentiment: string; extremeLevel: number; }

function formatK(n: number) {
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return String(n);
}

function fmtDate(raw: string) {
  // "2026-03-24T00:00:00.000" → "24 Mar 2026"
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      <div style={{ color: payload[0].value >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
        Net: {formatK(payload[0].value)}
      </div>
    </div>
  );
};

export default function COTChartCard() {
  const [data, setData]           = useState<COTInstrument[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState("EUR/USD");
  const [catFilter, setCatFilter] = useState("Forex");
  const [weekIdx, setWeekIdx]     = useState(0); // 0 = most recent

  useEffect(() => {
    fetch("/api/cot").then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Reset week index when instrument changes
  useEffect(() => { setWeekIdx(0); }, [selected]);

  const categories = ["Forex", "Commodities", "Indices", "Crypto"];
  const inst = data.find(d => d.name === selected);

  // history[0] = most recent, history[N] = oldest
  const weekData = inst?.history[weekIdx] ?? inst?.latest;
  const maxIdx   = inst ? inst.history.length - 1 : 0;

  // For the chart: reversed so oldest→newest on x-axis; mark selected week
  const chartData = inst ? [...inst.history].reverse().map((h, i) => ({
    date:    fmtDate(h.weekDate).slice(0, 6), // "24 Mar" style label
    fullDate: fmtDate(h.weekDate),
    net:     h.nonCommNet,
    // The reversed index corresponding to weekIdx (0=latest = last in reversed array)
    selected: i === (inst.history.length - 1 - weekIdx),
  })) : [];

  // X-axis label of selected week (for reference line)
  const selectedLabel = chartData.find(d => d.selected)?.date ?? "";

  const extremeForWeek = (() => {
    if (!inst) return 50;
    const nets = inst.history.map(h => h.nonCommNet);
    const cur  = weekData?.nonCommNet ?? 0;
    const min  = Math.min(...nets);
    const max  = Math.max(...nets);
    if (max === min) return 50;
    return Math.round(((cur - min) / (max - min)) * 100);
  })();

  const weekNet = weekData?.nonCommNet ?? 0;
  const weekSentiment = weekNet > 0 ? "Bullish" : weekNet < 0 ? "Bearish" : "Neutral";

  return (
    <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>COT — 2 Ans d&apos;Historique</h3>
          <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Positions Non-Commerciales nettes · Source CFTC</p>
        </div>
        {weekData && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>
              {weekIdx === 0 ? "Dernière semaine" : `Semaine ${weekIdx + 1}/${inst?.history.length ?? 1}`} · {fmtDate(weekData.weekDate)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700,
              color: weekSentiment === "Bullish" ? "#22c55e" : weekSentiment === "Bearish" ? "#ef4444" : "#eab308",
              background: weekSentiment === "Bullish" ? "rgba(34,197,94,0.1)" : weekSentiment === "Bearish" ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
              padding: "2px 10px", borderRadius: 999, border: "1px solid currentColor",
            }}>{weekSentiment}</div>
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
        {categories.map(c => (
          <button key={c} onClick={() => { setCatFilter(c); const first = data.find(d => d.category === c); if (first) setSelected(first.name); }}
            style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
              background: catFilter === c ? "rgba(212,175,55,0.12)" : "transparent",
              border: `1px solid ${catFilter === c ? "rgba(212,175,55,0.3)" : "#1c1c38"}`,
              color: catFilter === c ? "#f0c84a" : "#475569" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Instrument selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {data.filter(d => d.category === catFilter).map(d => (
          <button key={d.name} onClick={() => setSelected(d.name)}
            style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, cursor: "pointer",
              background: selected === d.name ? "#1c1c38" : "transparent",
              border: `1px solid ${selected === d.name ? "#2a2a50" : "#1c1c38"}`,
              color: selected === d.name ? "#f1f5f9" : "#475569",
            }}>
            {d.name}
            <span style={{ marginLeft: 4, fontSize: 10, color: d.sentiment === "Bullish" ? "#22c55e" : d.sentiment === "Bearish" ? "#ef4444" : "#eab308" }}>
              {d.sentiment === "Bullish" ? "▲" : d.sentiment === "Bearish" ? "▼" : "—"}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : inst && weekData ? (
        <>
          {/* Week navigator */}
          {inst.history.length > 1 && (
            <div style={{ marginBottom: 16, background: "#0d0d1a", border: "1px solid #1c1c38", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap" }}>📅 Semaine :</span>
                <button onClick={() => setWeekIdx(i => Math.max(0, i - 1))} disabled={weekIdx === 0}
                  style={{ fontSize: 13, padding: "1px 8px", borderRadius: 5, cursor: weekIdx === 0 ? "not-allowed" : "pointer",
                    background: "transparent", border: "1px solid #1c1c38", color: weekIdx === 0 ? "#1c1c38" : "#94a3b8" }}>‹</button>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f0c84a", fontFamily: "JetBrains Mono, monospace", flex: 1, textAlign: "center" }}>
                  {fmtDate(weekData.weekDate)}
                  {weekIdx === 0 && <span style={{ marginLeft: 6, fontSize: 9, color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "1px 5px", borderRadius: 4, border: "1px solid rgba(34,197,94,0.2)" }}>RÉCENTE</span>}
                </span>
                <button onClick={() => setWeekIdx(i => Math.min(maxIdx, i + 1))} disabled={weekIdx === maxIdx}
                  style={{ fontSize: 13, padding: "1px 8px", borderRadius: 5, cursor: weekIdx === maxIdx ? "not-allowed" : "pointer",
                    background: "transparent", border: "1px solid #1c1c38", color: weekIdx === maxIdx ? "#1c1c38" : "#94a3b8" }}>›</button>
              </div>
              <input type="range" min={0} max={maxIdx} value={weekIdx}
                onChange={e => setWeekIdx(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#f0c84a", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#334155", marginTop: 2 }}>
                <span>{fmtDate(inst.history[0].weekDate)}</span>
                <span>{inst.history.length} semaines</span>
                <span>{fmtDate(inst.history[maxIdx].weekDate)}</span>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
            {[
              { label: "Net Non-Comm", value: formatK(weekData.nonCommNet), color: weekData.nonCommNet >= 0 ? "#22c55e" : "#ef4444" },
              { label: "Variation",    value: (weekData.changeLong - weekData.changeShort >= 0 ? "+" : "") + formatK(weekData.changeLong - weekData.changeShort), color: weekData.changeLong - weekData.changeShort >= 0 ? "#22c55e" : "#ef4444" },
              { label: "Open Interest",value: formatK(weekData.openInterest), color: "#3b82f6" },
              { label: "Longs",        value: formatK(weekData.nonCommLong),  color: "#22c55e" },
              { label: "Shorts",       value: formatK(weekData.nonCommShort), color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#0d0d1a", border: "1px solid #1c1c38", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color, fontFamily: "JetBrains Mono, monospace" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Extreme level bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
              <span style={{ color: "#475569" }}>Niveau extrême (percentile 2 ans)</span>
              <span style={{ color: extremeForWeek >= 70 ? "#22c55e" : extremeForWeek <= 30 ? "#ef4444" : "#eab308", fontWeight: 700 }}>
                {extremeForWeek}%
                {extremeForWeek >= 80 ? " ⚠ Extrême Long" : extremeForWeek <= 20 ? " ⚠ Extrême Short" : ""}
              </span>
            </div>
            <div style={{ height: 8, background: "#1c1c38", borderRadius: 999, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${extremeForWeek}%`,
                background: `linear-gradient(90deg, #ef4444, #eab308, #22c55e)`, borderRadius: 999 }} />
              <div style={{ position: "absolute", top: 0, left: "20%", width: 1, height: "100%", background: "#475569" }} />
              <div style={{ position: "absolute", top: 0, left: "80%", width: 1, height: "100%", background: "#475569" }} />
            </div>
          </div>

          {/* Net positions chart */}
          <div style={{ marginBottom: 8, fontSize: 12, color: "#475569" }}>Positions nettes Non-Commerciales ({chartData.length} semaines)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="negGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.02} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c38" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} interval={Math.floor(chartData.length / 8)} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 9, fill: "#475569" }} tickLine={false} axisLine={false} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
              {weekIdx > 0 && selectedLabel && (
                <ReferenceLine x={selectedLabel} stroke="#f0c84a" strokeDasharray="3 2" strokeWidth={1.5}
                  label={{ value: "◆", position: "top", fill: "#f0c84a", fontSize: 10 }} />
              )}
              <Area type="monotone" dataKey="net" stroke={weekNet >= 0 ? "#22c55e" : "#ef4444"}
                strokeWidth={1.5} fill={weekNet >= 0 ? "url(#posGrad)" : "url(#negGrad)"} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      ) : (
        <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>Données COT indisponibles (publiées chaque vendredi)</div>
      )}
    </div>
  );
}
