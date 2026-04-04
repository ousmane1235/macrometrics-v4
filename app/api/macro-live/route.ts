export const dynamic = "force-dynamic";

/**
 * Macro Live API
 * Sources (toutes gratuites, sans clé API) :
 *  - IMF DataMapper API  → PIB, CPI, Chômage, Compte courant (annuel, WEO)
 *  - ECB Statistical Data Warehouse → Taux BCE, CPI zone euro (mensuel)
 *  - World Bank Open Data → Indicateurs complémentaires (annuel)
 *  - BLS Public API      → CPI US mensuel (sans clé, limité à 25 req/j)
 */

// ── IMF DataMapper ──────────────────────────────────────────────────────────
const IMF = "https://www.imf.org/external/datamapper/api/v1";

// Codes pays IMF
const IMF_CODES: Record<string, string> = {
  USD: "USA", EUR: "XM", GBP: "GBR", JPY: "JPN",
  CHF: "CHE", CAD: "CAN", AUD: "AUS", NZD: "NZL",
};

type ImfValues = Record<string, Record<string, number>>;

async function imfFetch(indicator: string): Promise<ImfValues> {
  const codes = Object.values(IMF_CODES).join("/");
  try {
    const res = await fetch(`${IMF}/${indicator}/${codes}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return {};
    const json = await res.json();
    return (json?.values?.[indicator] ?? {}) as ImfValues;
  } catch {
    return {};
  }
}

/** Retourne la valeur la plus récente disponible (année préférée: 2025 > 2024 > 2023) */
function latestIMF(
  data: ImfValues,
  imfCode: string,
): { value: number; year: string } | null {
  const c = data[imfCode] ?? {};
  for (const yr of ["2025", "2024", "2023"]) {
    if (c[yr] != null && !isNaN(Number(c[yr]))) {
      return { value: Math.round(Number(c[yr]) * 100) / 100, year: yr };
    }
  }
  return null;
}

// ── ECB Statistical Data Warehouse ─────────────────────────────────────────
const ECB = "https://data-api.ecb.europa.eu/service/data";

async function ecbFetch(path: string): Promise<number | null> {
  try {
    const res = await fetch(`${ECB}/${path}?lastNObservations=2&format=jsondata`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // SDMX-JSON structure
    const obs = json?.dataSets?.[0]?.series?.["0:0:0:0:0:0"]?.observations
             ?? json?.dataSets?.[0]?.series?.["0:0:0:0:0:0:0"]?.observations;
    if (!obs) return null;
    const keys = Object.keys(obs).sort((a, b) => Number(b) - Number(a));
    const val = obs[keys[0]]?.[0];
    return val != null ? Math.round(Number(val) * 100) / 100 : null;
  } catch {
    return null;
  }
}

// ── BLS (US Bureau of Labor Statistics) ─────────────────────────────────────
async function blsCPI(): Promise<{ value: number; date: string } | null> {
  try {
    // BLS public API - sans clé (25 req/jour max)
    const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/CUSR0000SA0", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesid: ["CUSR0000SA0"], startyear: "2024", endyear: "2026" }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const series = json?.Results?.series?.[0]?.data ?? [];
    if (!series.length) return null;
    // Calculer le % change YoY sur les 2 derniers points correspondants
    const sorted = series.sort((a: { year: string; period: string }, b: { year: string; period: string }) => {
      if (a.year !== b.year) return Number(b.year) - Number(a.year);
      return Number(b.period.replace("M", "")) - Number(a.period.replace("M", ""));
    });
    if (sorted.length < 13) return null;
    const latest = Number(sorted[0].value);
    const yearAgo = Number(sorted[12].value);
    const pct = ((latest - yearAgo) / yearAgo) * 100;
    const month = sorted[0].periodName;
    const year = sorted[0].year;
    return { value: Math.round(pct * 10) / 10, date: `${month} ${year}` };
  } catch {
    return null;
  }
}

// ── World Bank (PIB trimestriel — fallback) ─────────────────────────────────
const WB_CODES: Record<string, string> = {
  USD: "US", EUR: "XC", GBP: "GB", JPY: "JP",
  CHF: "CH", CAD: "CA", AUD: "AU", NZD: "NZ",
};

async function wbFetch(
  country: string,
  indicator: string,
): Promise<{ value: number; year: string } | null> {
  try {
    const url = `https://api.worldbank.org/v2/country/${country}/indicator/${indicator}?format=json&mrv=3&per_page=3`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const rows = json?.[1] ?? [];
    const row = rows.find((r: { value: number | null }) => r.value != null);
    if (!row) return null;
    return {
      value: Math.round(Number(row.value) * 100) / 100,
      year: String(row.date),
    };
  } catch {
    return null;
  }
}

// ── Taux officiels banques centrales (avril 2026) ────────────────────────────
// Source: sites officiels banques centrales, mis à jour manuellement
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

// ── PMI officiels (S&P Global / Judo Bank — pas d'API gratuite) ─────────────
// Source: S&P Global flash PMI releases — mars 2026
const PMI_STATIC: Record<string, { mfg: number; svc: number; mfgPrev: number; svcPrev: number; date: string }> = {
  USD: { mfg: 49.8, svc: 54.4, mfgPrev: 49.0, svcPrev: 52.9, date: "Mar 2026" },
  EUR: { mfg: 48.6, svc: 50.4, mfgPrev: 47.6, svcPrev: 50.6, date: "Mar 2026" },
  GBP: { mfg: 44.9, svc: 53.0, mfgPrev: 46.9, svcPrev: 51.0, date: "Mar 2026" },
  JPY: { mfg: 48.3, svc: 53.7, mfgPrev: 49.0, svcPrev: 53.5, date: "Mar 2026" },
  CHF: { mfg: 48.5, svc: 51.0, mfgPrev: 49.0, svcPrev: 50.8, date: "Mar 2026" },
  CAD: { mfg: 46.3, svc: 50.9, mfgPrev: 47.8, svcPrev: 50.6, date: "Mar 2026" },
  AUD: { mfg: 54.0, svc: 51.2, mfgPrev: 50.4, svcPrev: 50.8, date: "Mar 2026" },
  NZD: { mfg: 50.2, svc: 49.8, mfgPrev: 49.4, svcPrev: 48.0, date: "Mar 2026" },
};

// ── Salaires (pas d'API gratuite internationale) ─────────────────────────────
const WAGES_STATIC: Record<string, { value: number; prev: number; date: string; unit: string }> = {
  USD: { value: 4.0, prev: 4.1, date: "Mar 2026", unit: "% YoY" },
  EUR: { value: 5.6, prev: 4.5, date: "Q4 2025", unit: "% YoY" },
  GBP: { value: 5.8, prev: 6.0, date: "Jan 2026", unit: "% YoY" },
  JPY: { value: 5.5, prev: 5.3, date: "Mar 2026", unit: "% YoY" },
  CHF: { value: 1.8, prev: 1.5, date: "2025", unit: "% YoY" },
  CAD: { value: 4.5, prev: 4.8, date: "Fév 2026", unit: "% YoY" },
  AUD: { value: 3.4, prev: 3.7, date: "Q4 2025", unit: "% YoY" },
  NZD: { value: 3.1, prev: 3.3, date: "Q4 2025", unit: "% YoY" },
};

// ── Ventes au détail (BLS = US uniquement, reste statique) ──────────────────
const RETAIL_STATIC: Record<string, { value: number; prev: number; date: string; unit: string }> = {
  USD: { value: 0.2, prev: 0.9, date: "Fév 2026", unit: "% MoM" },
  EUR: { value: 0.5, prev: -0.1, date: "Jan 2026", unit: "% MoM" },
  GBP: { value: -0.3, prev: 0.7, date: "Fév 2026", unit: "% MoM" },
  JPY: { value: 3.9, prev: 3.7, date: "Fév 2026", unit: "% YoY" },
  CHF: { value: 0.8, prev: 0.3, date: "Jan 2026", unit: "% YoY" },
  CAD: { value: -0.6, prev: 0.2, date: "Jan 2026", unit: "% MoM" },
  AUD: { value: 0.2, prev: 0.3, date: "Jan 2026", unit: "% MoM" },
  NZD: { value: -0.1, prev: -0.3, date: "Q4 2025", unit: "% QoQ" },
};

// ── Confiance consommateur (statique) ────────────────────────────────────────
const CONFIDENCE_STATIC: Record<string, { value: number; prev: number; date: string; label: string }> = {
  USD: { value: 98.3,  prev: 105.6, date: "Mar 2026", label: "Conference Board" },
  EUR: { value: -13.8, prev: -15.5, date: "Mar 2026", label: "Commission EU" },
  GBP: { value: -19,   prev: -20,   date: "Mar 2026", label: "GfK" },
  JPY: { value: 35.1,  prev: 34.4,  date: "Mar 2026", label: "Cabinet Office" },
  CHF: { value: -34.9, prev: -38.2, date: "Mar 2026", label: "SECO" },
  CAD: { value: 44.2,  prev: 47.8,  date: "Mar 2026", label: "Nanos" },
  AUD: { value: 95.9,  prev: 92.1,  date: "Mar 2026", label: "Westpac" },
  NZD: { value: 97.5,  prev: 93.6,  date: "Mar 2026", label: "ANZ" },
};

// ── HANDLER ──────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // Fetch IMF data pour tous les pays en parallèle
    const [imfCPI, imfGDP, imfUnem, imfCA] = await Promise.all([
      imfFetch("PCPIPCH"),   // CPI % change annual
      imfFetch("NGDP_RPCH"), // PIB réel % change annual
      imfFetch("LUR"),       // Taux de chômage
      imfFetch("BCA_NGDPDZ"), // Compte courant % PIB
    ]);

    // BLS CPI US (mensuel, plus précis)
    const usCpiMonthly = await blsCPI();

    // ECB taux de dépôt (mensuel, live)
    const ecbRate = await ecbFetch("FM/M.U2.EUR.RT0.BB.1A.UK");

    // Build result par devise
    const result: Record<string, {
      rate:       { rate: number; prev: number; date: string; next: string };
      cpi:        { value: number; prev?: number; date: string; unit: string; source: string };
      gdp:        { value: number; date: string; unit: string; source: string };
      unemployment: { value: number; date: string; unit: string; source: string };
      currentAccount: { value: number; date: string; unit: string; source: string };
      pmiMfg:     { value: number; prev: number; date: string };
      pmiSvc:     { value: number; prev: number; date: string };
      wages:      { value: number; prev: number; date: string; unit: string };
      retail:     { value: number; prev: number; date: string; unit: string };
      confidence: { value: number; prev: number; date: string; label: string };
    }> = {};

    for (const code of Object.keys(IMF_CODES)) {
      const imfCode = IMF_CODES[code];
      const wbCode  = WB_CODES[code];

      // CPI: BLS pour USD (mensuel), IMF pour les autres (annuel)
      let cpi: { value: number; prev?: number; date: string; unit: string; source: string };
      if (code === "USD" && usCpiMonthly) {
        cpi = {
          value: usCpiMonthly.value,
          date: usCpiMonthly.date,
          unit: "% YoY",
          source: "BLS",
        };
      } else {
        const v = latestIMF(imfCPI, imfCode);
        // Chercher aussi la valeur précédente (année d'avant)
        const prevYr = String(Number(v?.year ?? 2025) - 1);
        const prevVal = imfCPI[imfCode]?.[prevYr];
        cpi = v
          ? { value: v.value, prev: prevVal != null ? Math.round(Number(prevVal) * 100) / 100 : undefined, date: v.year, unit: "% (annuel)", source: "IMF WEO" }
          : { value: 0, date: "N/A", unit: "%", source: "N/A" };
      }

      // PIB: IMF
      const gdpIMF = latestIMF(imfGDP, imfCode);
      let gdp: { value: number; date: string; unit: string; source: string };
      if (gdpIMF) {
        gdp = { value: gdpIMF.value, date: gdpIMF.year, unit: "% réel", source: "IMF WEO" };
      } else {
        // Fallback World Bank
        const wb = await wbFetch(wbCode, "NY.GDP.MKTP.KD.ZG");
        gdp = wb
          ? { value: wb.value, date: wb.year, unit: "% réel", source: "World Bank" }
          : { value: 0, date: "N/A", unit: "% réel", source: "N/A" };
      }

      // Chômage: IMF
      const unemIMF = latestIMF(imfUnem, imfCode);
      let unemployment: { value: number; date: string; unit: string; source: string };
      if (unemIMF) {
        unemployment = { value: unemIMF.value, date: unemIMF.year, unit: "%", source: "IMF WEO" };
      } else {
        const wb = await wbFetch(wbCode, "SL.UEM.TOTL.ZS");
        unemployment = wb
          ? { value: wb.value, date: wb.year, unit: "%", source: "World Bank" }
          : { value: 0, date: "N/A", unit: "%", source: "N/A" };
      }

      // Compte courant: IMF (% PIB)
      const caIMF = latestIMF(imfCA, imfCode);
      const currentAccount: { value: number; date: string; unit: string; source: string } = caIMF
        ? { value: caIMF.value, date: caIMF.year, unit: "% PIB", source: "IMF WEO" }
        : { value: 0, date: "N/A", unit: "% PIB", source: "N/A" };

      // Taux BCE live si disponible
      const cbRate = { ...CB_RATES[code] };
      if (code === "EUR" && ecbRate !== null) {
        cbRate.rate = ecbRate;
        cbRate.date = "ECB live";
      }

      result[code] = {
        rate:           cbRate,
        cpi,
        gdp,
        unemployment,
        currentAccount,
        pmiMfg:     { value: PMI_STATIC[code].mfg, prev: PMI_STATIC[code].mfgPrev, date: PMI_STATIC[code].date },
        pmiSvc:     { value: PMI_STATIC[code].svc, prev: PMI_STATIC[code].svcPrev, date: PMI_STATIC[code].date },
        wages:      WAGES_STATIC[code],
        retail:     RETAIL_STATIC[code],
        confidence: CONFIDENCE_STATIC[code],
      };
    }

    return Response.json({
      data: result,
      sources: {
        cpi_usd: "BLS (mensuel réel)",
        cpi_other: "IMF World Economic Outlook (annuel)",
        gdp: "IMF World Economic Outlook (annuel)",
        unemployment: "IMF World Economic Outlook (annuel)",
        current_account: "IMF World Economic Outlook (% PIB)",
        ecb_rate: ecbRate !== null ? "ECB SDW (live)" : "Statique",
        other_rates: "Sources officielles banques centrales",
        pmi: "S&P Global Flash PMI (statique — pas d'API gratuite)",
        wages: "Banques centrales / organismes statistiques (statique)",
      },
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("macro-live error:", err);
    return Response.json({ data: {}, error: String(err) }, { status: 500 });
  }
}
