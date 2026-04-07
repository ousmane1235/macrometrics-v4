export const dynamic = "force-dynamic";
import { type NextRequest } from "next/server";

interface Candle {
  time: number;   // Unix seconds (lightweight-charts format)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Module-level cache: key = "symbol|interval|range", value = { data, ts }
const CACHE = new Map<string, { data: Candle[]; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes — fine for ≤3 users

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Referer: "https://finance.yahoo.com/",
};

async function fetchCandles(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: YF_HEADERS, cache: "no-store" });
  if (!res.ok) return [];

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const timestamps: number[] = result.timestamps ?? result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const opens:   (number | null)[] = quote.open   ?? [];
  const highs:   (number | null)[] = quote.high   ?? [];
  const lows:    (number | null)[] = quote.low    ?? [];
  const closes:  (number | null)[] = quote.close  ?? [];
  const volumes: (number | null)[] = quote.volume ?? [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({
      time: timestamps[i],
      open: parseFloat(o.toFixed(6)),
      high: parseFloat(h.toFixed(6)),
      low:  parseFloat(l.toFixed(6)),
      close: parseFloat(c.toFixed(6)),
      volume: volumes[i] ?? 0,
    });
  }
  return candles;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol   = searchParams.get("symbol")   ?? "EURUSD=X";
  const interval = searchParams.get("interval") ?? "1d";
  const range    = searchParams.get("range")    ?? "6mo";

  const VALID_INTERVALS = ["1d","1wk","1mo"];
  const VALID_RANGES    = ["1mo","3mo","6mo","1y","2y","5y","10y"];
  const safeInterval = VALID_INTERVALS.includes(interval) ? interval : "1d";
  const safeRange    = VALID_RANGES.includes(range)       ? range    : "6mo";

  const cacheKey = `${symbol}|${safeInterval}|${safeRange}`;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    return Response.json(hit.data, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const data = await fetchCandles(symbol, safeInterval, safeRange);
    CACHE.set(cacheKey, { data, ts: Date.now() });
    return Response.json(data, { headers: { "X-Cache": "MISS", "X-Count": String(data.length) } });
  } catch {
    const stale = CACHE.get(cacheKey);
    if (stale) return Response.json(stale.data, { headers: { "X-Cache": "STALE" } });
    return Response.json([], { status: 500 });
  }
}
