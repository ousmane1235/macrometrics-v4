export const dynamic = "force-dynamic";
import { G8_PAIRS, type G8Pair } from "@/lib/g8-pairs";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface MonthStat {
  month: string;
  avg: number;
  median: number;
  positive: number;  // % of years positive
  best: number;
  worst: number;
  count: number;
}

interface SeasonalityResult {
  pair: string;
  group: string;
  stats: MonthStat[];
  yearlyData: { year: number; returns: (number | null)[] }[];
}

async function fetchYearlyReturns(pair: G8Pair): Promise<{ year: number; returns: (number | null)[] }[]> {
  // Fetch 10 years of monthly data from Yahoo Finance
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair.yf)}?interval=1mo&range=10y`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.yahoo.com/" },
    next: { revalidate: 86400 }, // daily cache
  });
  if (!res.ok) return [];
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) return [];

  const timestamps: number[] = result.timestamps ?? result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const opens:  (number | null)[] = result.indicators?.quote?.[0]?.open  ?? [];

  // Group by year
  const byYear: Record<number, (number | null)[]> = {};
  for (let i = 0; i < timestamps.length; i++) {
    const d = new Date(timestamps[i] * 1000);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed
    const open  = opens[i]  ?? null;
    const close = closes[i] ?? null;
    const ret = (open && close && open > 0) ? ((close - open) / open) * 100 : null;

    if (!byYear[year]) byYear[year] = Array(12).fill(null);
    byYear[year][month] = ret !== null ? parseFloat(ret.toFixed(4)) : null;
  }

  return Object.entries(byYear)
    .map(([y, rets]) => ({ year: parseInt(y), returns: rets }))
    .sort((a, b) => b.year - a.year);
}

function computeStats(yearlyData: { year: number; returns: (number | null)[] }[]): MonthStat[] {
  return MONTHS.map((month, i) => {
    const vals = yearlyData.map((y) => y.returns[i]).filter((v): v is number => v !== null);
    if (vals.length === 0) return { month, avg: 0, median: 0, positive: 50, best: 0, worst: 0, count: 0 };
    const sorted = [...vals].sort((a, b) => a - b);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const positive = (vals.filter((v) => v > 0).length / vals.length) * 100;
    return {
      month,
      avg: parseFloat(avg.toFixed(3)),
      median: parseFloat(median.toFixed(3)),
      positive: parseFloat(positive.toFixed(1)),
      best: parseFloat(Math.max(...vals).toFixed(3)),
      worst: parseFloat(Math.min(...vals).toFixed(3)),
      count: vals.length,
    };
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pairLabel = searchParams.get("pair");

  // If specific pair requested
  if (pairLabel) {
    const pair = G8_PAIRS.find((p) => p.label === pairLabel);
    if (!pair) return Response.json({ error: "Pair not found" }, { status: 404 });
    const yearlyData = await fetchYearlyReturns(pair);
    const stats = computeStats(yearlyData);
    return Response.json({ pair: pair.label, group: pair.group, stats, yearlyData });
  }

  // Return all pairs (lightweight — stats only, no yearlyData)
  const results = await Promise.allSettled(G8_PAIRS.map((p) => fetchYearlyReturns(p)));
  const all: SeasonalityResult[] = G8_PAIRS.map((p, i) => {
    const r = results[i];
    const yearlyData = r.status === "fulfilled" ? r.value : [];
    const stats = computeStats(yearlyData);
    return { pair: p.label, group: p.group, stats, yearlyData: yearlyData.slice(0, 10) };
  });

  return Response.json(all);
}
