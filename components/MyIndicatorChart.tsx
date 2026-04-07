// components/MyIndicatorChart.tsx
// ─────────────────────────────────────────────────────────────────────────────
// TON INDICATEUR PRIVÉ — Ce fichier est uniquement sur ton site local.
// Ajoute ta logique Pine Script traduite en TypeScript dans computeMyIndicator().
// La bibliothèque lightweight-charts v4.2 est installée.
// ─────────────────────────────────────────────────────────────────────────────
"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

interface Candle {
  time: number;   // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LWPoint { time: Time; value: number; }
interface LWCandle { time: Time; open: number; high: number; low: number; close: number; }

// ─── INTERVALS & RANGES ──────────────────────────────────────────────────────
const INTERVALS = [
  { label: "Journalier",   interval: "1d",  range: "1y"  },
  { label: "Hebdomadaire", interval: "1wk", range: "5y"  },
  { label: "Mensuel",      interval: "1mo", range: "10y" },
];

// ─── TON INDICATEUR ──────────────────────────────────────────────────────────
// Remplace cette fonction par ta logique Pine Script traduite en TypeScript.
// Reçoit le tableau de bougies OHLCV, retourne un tableau de { time, value }.
function computeMyIndicator(candles: Candle[]): LWPoint[] {
  // EXEMPLE : EMA 21 (remplace par ton Pine Script)
  // EMA[i] = close[i] * k + EMA[i-1] * (1-k), k = 2/(period+1)
  if (!candles.length) return [];
  const period = 21;
  const k = 2 / (period + 1);
  const result: LWPoint[] = [];
  let ema = candles[0].close;
  for (const c of candles) {
    ema = c.close * k + ema * (1 - k);
    result.push({ time: c.time as Time, value: parseFloat(ema.toFixed(6)) });
  }
  return result;
}

function volColor(c: Candle): string {
  return c.close >= c.open ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)";
}

interface Props {
  yfSymbol: string;   // Yahoo Finance symbol e.g. "EURUSD=X"
  label: string;      // Display name e.g. "EUR/USD"
}

export default function MyIndicatorChart({ yfSymbol, label }: Props) {
  const chartRef  = useRef<HTMLDivElement>(null);
  const chartApi  = useRef<IChartApi | null>(null);
  const csSeries  = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const indSeries = useRef<ISeriesApi<"Line", Time> | null>(null);
  const volSeries = useRef<ISeriesApi<"Histogram", Time> | null>(null);

  const [intervalIdx, setIntervalIdx] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [candles, setCandles]         = useState<Candle[]>([]);

  const cfg = INTERVALS[intervalIdx];

  // ── Fetch from our own /api/chart-data (Yahoo Finance, free, cached 15 min)
  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/chart-data?symbol=${encodeURIComponent(yfSymbol)}&interval=${cfg.interval}&range=${cfg.range}`)
      .then(r => r.json())
      .then((d: Candle[]) => { setCandles(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [yfSymbol, cfg.interval, cfg.range]);

  // ── Build / update lightweight-charts
  useEffect(() => {
    if (!chartRef.current || loading || error || !candles.length) return;

    if (chartApi.current) {
      chartApi.current.remove();
      chartApi.current = null;
      csSeries.current = null;
      indSeries.current = null;
      volSeries.current = null;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 340,
      layout: {
        background: { type: ColorType.Solid, color: "#060610" },
        textColor: "#94a3b8",
      },
      grid:       { vertLines: { color: "#1c1c38" }, horzLines: { color: "#1c1c38" } },
      crosshair:  { mode: 1 },
      rightPriceScale: { borderColor: "#1c1c38" },
      timeScale:  { borderColor: "#1c1c38", timeVisible: true, secondsVisible: false },
    });
    chartApi.current = chart;

    // Candlestick series
    const cs = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    csSeries.current = cs;
    cs.setData(candles.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close } as LWCandle)));

    // Mon indicateur (ligne dorée)
    const ind = chart.addLineSeries({
      color: "#f0c84a",
      lineWidth: 2,
      title: "Mon Indicateur",
    });
    indSeries.current = ind;
    ind.setData(computeMyIndicator(candles));

    // Volume histogram
    const vol = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volSeries.current = vol;
    vol.setData(candles.map(c => ({ time: c.time as Time, value: c.volume, color: volColor(c) })));

    chart.timeScale().fitContent();

    const obs = new ResizeObserver(() => {
      if (chartRef.current && chartApi.current) {
        chartApi.current.applyOptions({ width: chartRef.current.clientWidth });
      }
    });
    obs.observe(chartRef.current);

    return () => {
      obs.disconnect();
      if (chartApi.current) { chartApi.current.remove(); chartApi.current = null; }
    };
  }, [candles, loading, error]);

  return (
    <div style={{ background: "#10101e", border: "1px solid #1c1c38", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Mon Indicateur — {label}
          </h3>
          <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
            Indicateur privé · {cfg.label} · {candles.length} bougies · Yahoo Finance
          </p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {INTERVALS.map((iv, i) => (
            <button key={iv.label} onClick={() => setIntervalIdx(i)} style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
              background: intervalIdx === i ? "rgba(212,175,55,0.12)" : "transparent",
              border: `1px solid ${intervalIdx === i ? "rgba(212,175,55,0.3)" : "#1c1c38"}`,
              color: intervalIdx === i ? "#f0c84a" : "#475569",
            }}>{iv.label}</button>
          ))}
        </div>
      </div>

      {loading && <div className="skeleton" style={{ height: 340 }} />}
      {error   && (
        <div style={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
          Données indisponibles
        </div>
      )}
      {!loading && !error && <div ref={chartRef} style={{ height: 340 }} />}

      <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 3, background: "#22c55e", borderRadius: 2, display: "inline-block" }} />Hausse
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 3, background: "#ef4444", borderRadius: 2, display: "inline-block" }} />Baisse
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 3, background: "#f0c84a", borderRadius: 2, display: "inline-block" }} />Mon Indicateur
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#334155" }}>🔒 Privé · Local uniquement</span>
      </div>
    </div>
  );
}
