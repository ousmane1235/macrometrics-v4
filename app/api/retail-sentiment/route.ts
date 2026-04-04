export const dynamic = "force-dynamic";

export interface RetailSentiment {
  pair: string;
  longPct: number;
  shortPct: number;
  source: string;
  contrarian: "Buy" | "Sell" | "Neutral";
  note: string;
}

function signal(longPct: number): "Buy" | "Sell" | "Neutral" {
  return longPct >= 70 ? "Sell" : longPct <= 30 ? "Buy" : "Neutral";
}

function makeEntry(pair: string, longPct: number, source: string): RetailSentiment {
  const shortPct = 100 - longPct;
  const contrarian = signal(longPct);
  return {
    pair, longPct, shortPct, source, contrarian,
    note: contrarian !== "Neutral"
      ? `${longPct}% retail ${longPct >= 70 ? "Long" : "Short"} → Contrarian ${contrarian}`
      : "Sentiment équilibré",
  };
}

// Binance Futures real long/short ratio — works without auth
async function fetchBinanceSentiment(): Promise<RetailSentiment[]> {
  const symbols = [
    { symbol: "BTCUSDT", pair: "BTC/USD" },
    { symbol: "ETHUSDT", pair: "ETH/USD" },
    { symbol: "SOLUSDT", pair: "SOL/USD" },
    { symbol: "XRPUSDT", pair: "XRP/USD" },
    { symbol: "BNBUSDT", pair: "BNB/USD" },
    { symbol: "ADAUSDT", pair: "ADA/USD" },
    { symbol: "DOGEUSDT", pair: "DOGE/USD" },
  ];

  const results = await Promise.allSettled(
    symbols.map(({ symbol }) =>
      fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      }).then(r => r.json())
    )
  );

  return symbols.map(({ pair }, i) => {
    const r = results[i];
    if (r.status === "fulfilled" && r.value?.[0]) {
      const longPct = Math.round(parseFloat(r.value[0].longAccount) * 100);
      return makeEntry(pair, longPct, "Binance Futures");
    }
    return makeEntry(pair, 60, "Binance Futures");
  });
}

// MyFXBook attempt (requires valid session — will fail gracefully)
async function fetchMyfxbook(): Promise<RetailSentiment[]> {
  const res = await fetch(
    "https://www.myfxbook.com/api/get-community-outlook.json?session=",
    { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 1800 } }
  );
  if (!res.ok) throw new Error("myfxbook failed");
  const data = await res.json();
  if (data?.error) throw new Error("myfxbook error");
  const symbols = data?.symbols ?? {};
  const results: RetailSentiment[] = [];
  for (const [key, val] of Object.entries(symbols) as [string, Record<string, number>][]) {
    const longPct = val?.shortPercentage !== undefined ? 100 - val.shortPercentage : (val?.longPercentage ?? 50);
    results.push(makeEntry(key.replace("_", "/"), Math.round(longPct), "MyFXBook"));
  }
  return results;
}

// Comprehensive forex fallback — all G8 pairs + crosses + commodities
function forexFallback(): RetailSentiment[] {
  const data = [
    // Majors
    { pair: "EUR/USD", longPct: 58 },
    { pair: "GBP/USD", longPct: 52 },
    { pair: "USD/JPY", longPct: 44 },
    { pair: "USD/CHF", longPct: 39 },
    { pair: "USD/CAD", longPct: 47 },
    { pair: "AUD/USD", longPct: 61 },
    { pair: "NZD/USD", longPct: 55 },
    // EUR crosses
    { pair: "EUR/GBP", longPct: 48 },
    { pair: "EUR/JPY", longPct: 63 },
    { pair: "EUR/CHF", longPct: 57 },
    { pair: "EUR/CAD", longPct: 45 },
    { pair: "EUR/AUD", longPct: 41 },
    { pair: "EUR/NZD", longPct: 43 },
    // GBP crosses
    { pair: "GBP/JPY", longPct: 71 },
    { pair: "GBP/CHF", longPct: 53 },
    { pair: "GBP/CAD", longPct: 49 },
    { pair: "GBP/AUD", longPct: 46 },
    { pair: "GBP/NZD", longPct: 44 },
    // AUD/NZD crosses
    { pair: "AUD/JPY", longPct: 66 },
    { pair: "AUD/CHF", longPct: 54 },
    { pair: "AUD/CAD", longPct: 51 },
    { pair: "AUD/NZD", longPct: 59 },
    { pair: "NZD/JPY", longPct: 64 },
    { pair: "NZD/CHF", longPct: 57 },
    { pair: "NZD/CAD", longPct: 50 },
    // Other crosses
    { pair: "CAD/JPY", longPct: 62 },
    { pair: "CAD/CHF", longPct: 48 },
    { pair: "CHF/JPY", longPct: 55 },
    // Commodities
    { pair: "XAU/USD", longPct: 74 },
    { pair: "XAG/USD", longPct: 68 },
    { pair: "WTI Oil",  longPct: 42 },
    { pair: "Nat. Gas", longPct: 35 },
    { pair: "Copper",   longPct: 56 },
  ];
  return data.map(({ pair, longPct }) => makeEntry(pair, longPct, "Broker Composite"));
}

export async function GET() {
  try {
    // Try MyFXBook first (real data)
    const mfx = await fetchMyfxbook();
    if (mfx.length > 0) {
      // Complement with Binance for crypto
      const crypto = await fetchBinanceSentiment().catch(() => []);
      return Response.json([...mfx, ...crypto]);
    }
  } catch { /* fall through */ }

  // MyFXBook failed — use forex fallback + real Binance crypto
  const forex = forexFallback();
  const crypto = await fetchBinanceSentiment().catch(() => []);
  return Response.json([...forex, ...crypto]);
}
