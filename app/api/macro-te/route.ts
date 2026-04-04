export const dynamic = "force-dynamic";

/**
 * Trading Economics API — Données macro réelles pour G8
 *
 * Clé API gratuite : https://tradingeconomics.com/api/auth.aspx
 * Ajouter dans .env.local :  TE_API_KEY=votre_clé_gratuite
 *
 * Sans clé : accès guest (limité mais fonctionnel pour les principales devises)
 */

const TE_BASE = "https://api.tradingeconomics.com";
const TE_KEY  = process.env.TE_API_KEY ?? "guest:guest";

// Noms de pays Trading Economics
const TE_COUNTRIES: Record<string, string> = {
  USD: "united states",
  EUR: "euro area",
  GBP: "united kingdom",
  JPY: "japan",
  CHF: "switzerland",
  CAD: "canada",
  AUD: "australia",
  NZD: "new zealand",
};

// Mapping catégories TE → nos clés d'indicateurs
const CATEGORY_MAP: Record<string, string> = {
  "Inflation Rate":          "cpi",
  "Core Inflation Rate":     "cpiCore",
  "GDP Growth Rate":         "gdp",
  "GDP Annual Growth Rate":  "gdpAnnual",
  "Unemployment Rate":       "unemployment",
  "Manufacturing PMI":       "pmiManufacturing",
  "Services PMI":            "pmiServices",
  "Composite PMI":           "pmiComposite",
  "Balance of Trade":        "tradeBalance",
  "Retail Sales MoM":        "retailSales",
  "Retail Sales":            "retailSales",
  "Retail Sales YoY":        "retailSalesYoY",
  "Consumer Confidence":     "confidence",
  "Wage Growth":             "wageGrowth",
  "Current Account":         "currentAccount",
  "Current Account to GDP":  "currentAccountGDP",
  "Interest Rate":           "rate",
};

// Indicateurs prioritaires à inclure (évite de ramener 200 indicateurs inutiles)
const WANTED = new Set(Object.keys(CATEGORY_MAP));

interface TEIndicator {
  Country:           string;
  Category:          string;
  Title:             string;
  LatestValue:       number;
  LatestValueDate:   string;
  PreviousValue:     number;
  PreviousValueDate: string;
  Unit:              string;
  Frequency:         string;
  URL:               string;
}

export interface NormalizedIndicator {
  value:    number;
  prev:     number;
  date:     string;
  prevDate: string;
  unit:     string;
  freq:     string;
  category: string;
  url:      string;
  source:   "Trading Economics";
}

export type TEResult = Record<string, Record<string, NormalizedIndicator>>;

/** Formate la date ISO TE → "Fév 2026" */
function fmtDate(iso: string): string {
  if (!iso) return "N/A";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  } catch {
    return iso.slice(0, 7);
  }
}

/** Fetch tous les indicateurs pour un groupe de pays (batch) */
async function fetchCountries(codes: string[]): Promise<TEIndicator[]> {
  const countries = codes.map(c => TE_COUNTRIES[c]).join(",");
  const url = `${TE_BASE}/country/indicators/${encodeURIComponent(countries)}?c=${TE_KEY}&f=json`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    console.error(`[macro-te] TE API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const raw = await res.json();
  // TE retourne un tableau directement
  if (!Array.isArray(raw)) {
    console.error("[macro-te] TE API unexpected format", typeof raw);
    return [];
  }
  return raw as TEIndicator[];
}

/** Cherche le nom du pays TE dans nos codes */
function teCountryToCode(teCountry: string): string | null {
  const lower = teCountry.toLowerCase();
  for (const [code, name] of Object.entries(TE_COUNTRIES)) {
    if (lower === name) return code;
  }
  return null;
}

export async function GET() {
  try {
    const codes = Object.keys(TE_COUNTRIES);

    // Fetch en 2 batches pour éviter les URLs trop longues
    const [batch1, batch2] = await Promise.all([
      fetchCountries(codes.slice(0, 4)),  // USD EUR GBP JPY
      fetchCountries(codes.slice(4)),      // CHF CAD AUD NZD
    ]);

    const all = [...batch1, ...batch2];

    if (all.length === 0) {
      return Response.json({
        data: {},
        error: "Trading Economics API n'a retourné aucune donnée. Vérifiez votre clé TE_API_KEY dans .env.local",
        source: "Trading Economics",
        apiKey: TE_KEY === "guest:guest" ? "guest (limité)" : "custom key",
      }, { status: 502 });
    }

    // Organiser par currency code → indicator key → valeur
    const result: TEResult = {};
    for (const code of codes) result[code] = {};

    for (const ind of all) {
      // Trouver le code devise
      const code = teCountryToCode(ind.Country);
      if (!code) continue;

      // Vérifier si c'est un indicateur qu'on veut
      const key = CATEGORY_MAP[ind.Category];
      if (!key || !WANTED.has(ind.Category)) continue;

      // Ne pas écraser si on a déjà une valeur plus précise pour cet indicateur
      if (result[code][key] && result[code][key].freq === "Monthly" && ind.Frequency !== "Monthly") continue;

      result[code][key] = {
        value:    ind.LatestValue,
        prev:     ind.PreviousValue,
        date:     fmtDate(ind.LatestValueDate),
        prevDate: fmtDate(ind.PreviousValueDate),
        unit:     ind.Unit,
        freq:     ind.Frequency,
        category: ind.Category,
        url:      `https://tradingeconomics.com${ind.URL}`,
        source:   "Trading Economics",
      };
    }

    // Stats
    const totalIndicators = Object.values(result).reduce((sum, v) => sum + Object.keys(v).length, 0);

    return Response.json({
      data:   result,
      source: "Trading Economics",
      apiKey: TE_KEY === "guest:guest" ? "guest (données limitées — ajoutez TE_API_KEY dans .env.local)" : "✅ Clé personnalisée",
      fetched_at: new Date().toISOString(),
      total_indicators: totalIndicators,
    });

  } catch (err) {
    console.error("[macro-te] Erreur:", err);
    return Response.json({ data: {}, error: String(err) }, { status: 500 });
  }
}
