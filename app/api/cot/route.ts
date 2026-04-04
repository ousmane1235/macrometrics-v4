export const dynamic = "force-dynamic";

export interface COTWeek {
  weekDate: string;
  nonCommLong: number;
  nonCommShort: number;
  nonCommNet: number;
  commLong: number;
  commShort: number;
  commNet: number;
  openInterest: number;
  changeLong: number;
  changeShort: number;
  changeNet: number;
}

export interface COTInstrument {
  name: string;
  category: string;
  code: string;
  latest: COTWeek;
  history: COTWeek[];  // up to 2 years
  sentiment: "Bullish" | "Bearish" | "Neutral";
  extremeLevel: number; // 0-100, percentile vs 2yr range
}

// CFTC public API — Socrata endpoint, filtered by exact market_and_exchange_names
const COT_INSTRUMENTS = [
  { name: "EUR/USD",    market: "EURO FX - CHICAGO MERCANTILE EXCHANGE",                        category: "Forex" },
  { name: "GBP/USD",   market: "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE",                  category: "Forex" },
  { name: "JPY/USD",   market: "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE",                   category: "Forex" },
  { name: "CHF/USD",   market: "SWISS FRANC - CHICAGO MERCANTILE EXCHANGE",                    category: "Forex" },
  { name: "CAD/USD",   market: "CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE",                category: "Forex" },
  { name: "AUD/USD",   market: "AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE",              category: "Forex" },
  { name: "NZD/USD",   market: "NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE",                      category: "Forex" },
  { name: "Gold",      market: "GOLD - COMMODITY EXCHANGE INC.",                               category: "Commodities" },
  { name: "Silver",    market: "SILVER - COMMODITY EXCHANGE INC.",                             category: "Commodities" },
  { name: "Crude Oil", market: "CRUDE OIL, LIGHT SWEET-WTI - ICE FUTURES EUROPE",             category: "Commodities" },
  { name: "S&P 500",   market: "MICRO E-MINI S&P 500 INDEX - CHICAGO MERCANTILE EXCHANGE",    category: "Indices" },
  { name: "Nasdaq 100",market: "MICRO E-MINI NASDAQ-100 INDEX - CHICAGO MERCANTILE EXCHANGE", category: "Indices" },
  { name: "Bitcoin",   market: "BITCOIN - CHICAGO MERCANTILE EXCHANGE",                        category: "Crypto" },
];

// Two-year cutoff date
function twoYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d.toISOString().split("T")[0];
}

type RawRow = Record<string, string>;

async function fetchInstrumentHistory(market: string): Promise<COTWeek[]> {
  const cutoff = twoYearsAgo();
  const url = [
    "https://publicreporting.cftc.gov/resource/jun7-fc8e.json",
    `?market_and_exchange_names=${encodeURIComponent(market)}`,
    `&$where=report_date_as_yyyy_mm_dd>='${cutoff}'`,
    "&$order=report_date_as_yyyy_mm_dd DESC",
    "&$limit=110",
  ].join("");

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 }, // 1hr cache (data updates once/week)
  });

  if (!res.ok) return [];
  const rows: RawRow[] = await res.json();

  return rows.map((r) => {
    const ncLong  = parseInt(r["noncomm_positions_long_all"]  ?? "0");
    const ncShort = parseInt(r["noncomm_positions_short_all"] ?? "0");
    const cLong   = parseInt(r["comm_positions_long_all"]     ?? "0");
    const cShort  = parseInt(r["comm_positions_short_all"]    ?? "0");
    const oi      = parseInt(r["open_interest_all"]           ?? "0");
    const chgL    = parseInt(r["change_in_noncomm_long_all"]  ?? "0");
    const chgS    = parseInt(r["change_in_noncomm_short_all"] ?? "0");
    return {
      weekDate:    r["report_date_as_yyyy_mm_dd"] ?? "",
      nonCommLong:  ncLong,
      nonCommShort: ncShort,
      nonCommNet:   ncLong - ncShort,
      commLong:     cLong,
      commShort:    cShort,
      commNet:      cLong - cShort,
      openInterest: oi,
      changeLong:   chgL,
      changeShort:  chgS,
      changeNet:    chgL - chgS,
    };
  });
}

function computeExtreme(history: COTWeek[]): number {
  if (history.length < 2) return 50;
  const nets = history.map((h) => h.nonCommNet);
  const current = nets[0];
  const min = Math.min(...nets);
  const max = Math.max(...nets);
  if (max === min) return 50;
  return Math.round(((current - min) / (max - min)) * 100);
}

export async function GET() {
  const results = await Promise.allSettled(
    COT_INSTRUMENTS.map((inst) => fetchInstrumentHistory(inst.market))
  );

  const data: COTInstrument[] = COT_INSTRUMENTS.map((inst, i) => {
    const r = results[i];
    const history: COTWeek[] = r.status === "fulfilled" ? r.value : [];
    const latest = history[0] ?? {
      weekDate: "", nonCommLong: 0, nonCommShort: 0, nonCommNet: 0,
      commLong: 0, commShort: 0, commNet: 0, openInterest: 0,
      changeLong: 0, changeShort: 0, changeNet: 0,
    };
    const extreme = computeExtreme(history);
    const net = latest.nonCommNet;
    const sentiment: "Bullish" | "Bearish" | "Neutral" =
      net > 0 ? "Bullish" : net < 0 ? "Bearish" : "Neutral";

    return {
      name: inst.name,
      category: inst.category,
      code: inst.market,
      latest,
      history: history.slice(0, 104), // max 2 years
      sentiment,
      extremeLevel: extreme,
    };
  });

  return Response.json(data);
}
