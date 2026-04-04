// ─── Macro Analysis Data ────────────────────────────────────────────────────
// Static dataset — April 2026 readings
// Sources: central bank websites, Eurostat, BLS, ONS, Statistics Bureau Japan,
//          S&P Global PMI, Trading Economics, World Bank

export type Signal = "bullish" | "bearish" | "neutral";
export type Stance = "hawkish" | "neutral" | "dovish";

export interface Indicator {
  value: number;
  prev: number;
  date: string;       // "Mar 2026"
  unit: string;       // "%", "pts", "B USD", etc.
  signal: Signal;
  label: string;
  description: string;
}

export interface CurrencyMacro {
  code: string;
  name: string;
  country: string;
  flag: string;
  centralBank: string;
  cbCode: string;
  tvSymbol: string;     // TradingView symbol for the pair vs USD or main pair
  currentRate: number;
  prevRate: number;
  rateDate: string;
  rateTarget: string;   // "2%" or "stable prices"
  nextMeeting: string;
  stance: Stance;
  stanceNote: string;
  themes: string[];     // 3 key macro themes
  indicators: {
    cpi: Indicator;
    gdp: Indicator;
    pmiManufacturing: Indicator;
    pmiServices: Indicator;
    unemployment: Indicator;
    tradeBalance: Indicator;
    retailSales: Indicator;
    confidence: Indicator;
    wageGrowth: Indicator;
    currentAccount: Indicator;
  };
}

export type AssetClass = "forex" | "commodity" | "crypto";

const I = (
  label: string, value: number, prev: number, unit: string,
  signal: Signal, date: string, description: string
): Indicator => ({ label, value, prev, unit, signal, date, description });

// ── G8 FOREX ─────────────────────────────────────────────────────────────────

export const USD: CurrencyMacro = {
  code: "USD", name: "Dollar Américain", country: "États-Unis",
  flag: "🇺🇸", centralBank: "Federal Reserve", cbCode: "FED",
  tvSymbol: "FX:EURUSD",
  currentRate: 4.50, prevRate: 4.75, rateDate: "Jan 2026",
  rateTarget: "2%", nextMeeting: "7 mai 2026",
  stance: "neutral",
  stanceNote: "La Fed maintient une posture attentiste. L'inflation reste au-dessus de la cible, le marché du travail reste solide. Deux baisses envisagées en 2026.",
  themes: [
    "🔥 Marché de l'emploi résilient — NFP solide malgré le ralentissement",
    "📊 Désinflation progressive — CPI proche de la cible Fed à 2.8%",
    "⚖️ Attente avant nouvelles baisses — dépendance aux données (data-dependent)",
  ],
  indicators: {
    cpi:               I("IPC (CPI)",               2.8,  3.1,  "%",    "neutral", "Fév 2026", "Inflation annuelle. Cible Fed = 2%. En baisse mais encore au-dessus."),
    gdp:               I("PIB (Croissance)",         2.3,  3.1,  "% QoQ ann.", "bullish",  "Q4 2025", "Croissance annualisée du PIB réel. Économie résiliente malgré les taux élevés."),
    pmiManufacturing:  I("PMI Manufacturier",       49.8, 49.0, "pts",  "neutral", "Mar 2026", "S&P Global. Seuil 50 = expansion. En territoire de contraction légère."),
    pmiServices:       I("PMI Services",            54.4, 52.9, "pts",  "bullish",  "Mar 2026", "Sector services dominant (70% du PIB). En forte expansion."),
    unemployment:      I("Chômage",                  4.2,  4.1,  "%",    "neutral", "Mar 2026", "Taux de chômage U-3. Plein emploi autour de 4%. Légère hausse."),
    tradeBalance:      I("Balance Commerciale",    -122.3,-88.2, "B USD", "bearish", "Fév 2026", "Déficit commercial mensuel. Pression baissière sur le dollar à long terme."),
    retailSales:       I("Ventes au Détail",          0.2,  0.9,  "% MoM", "neutral", "Fév 2026", "Consommation ménages. Moteur principal de l'économie US."),
    confidence:        I("Confiance Conso. (Conf.)", 98.3, 105.6,"pts",  "bearish", "Mar 2026", "Conference Board. Dégradation notable liée à l'incertitude commerciale."),
    wageGrowth:        I("Salaires Horaires",         4.0,  4.1,  "% YoY", "neutral", "Mar 2026", "Average Hourly Earnings. Pression inflationniste via coûts salariaux."),
    currentAccount:    I("Compte Courant",          -310.9,-272.1,"B USD", "bearish", "Q4 2025", "Déficit CA annualisé. Besoin de financement extérieur élevé."),
  },
};

export const EUR: CurrencyMacro = {
  code: "EUR", name: "Euro", country: "Zone Euro",
  flag: "🇪🇺", centralBank: "Banque Centrale Européenne", cbCode: "BCE",
  tvSymbol: "FX:EURUSD",
  currentRate: 2.50, prevRate: 2.75, rateDate: "Mar 2026",
  rateTarget: "2%", nextMeeting: "17 avr 2026",
  stance: "dovish",
  stanceNote: "La BCE a repris son cycle de baisses en mars. L'inflation revient à la cible, la croissance reste faible. Nouvelle baisse probable en juin 2026.",
  themes: [
    "📉 Croissance atone — Allemagne en quasi-récession, Italie fragile",
    "✅ Inflation à la cible — IPC proche de 2%, BCE en mode baisse",
    "🏭 Industrie sinistrée — PMI Mfg sous 50 depuis 2 ans, crise compétitivité",
  ],
  indicators: {
    cpi:               I("IPC (IPCH)",               2.2,  2.5,  "%",    "neutral", "Mar 2026", "Inflation harmonisée zone euro. Proche cible BCE 2%. En baisse continue."),
    gdp:               I("PIB (Croissance)",          0.9,  0.7,  "% YoY", "neutral", "Q4 2025", "Croissance annuelle zone euro. Très faible, risque de récession en Allemagne."),
    pmiManufacturing:  I("PMI Manufacturier",       48.6, 47.6, "pts",  "neutral", "Mar 2026", "En contraction depuis 2 ans. Légère amélioration mais toujours < 50."),
    pmiServices:       I("PMI Services",            50.4, 50.6, "pts",  "neutral", "Mar 2026", "Juste au-dessus de l'expansion. Services soutient l'économie zone euro."),
    unemployment:      I("Chômage",                  6.1,  6.2,  "%",    "bullish",  "Fév 2026", "Taux chômage zone euro. Au plus bas historique. Marché travail solide."),
    tradeBalance:      I("Balance Commerciale",     17.4, 15.2, "B EUR", "bullish",  "Jan 2026", "Excédent commercial mensuel. Revenu positif, soutien structurel à l'euro."),
    retailSales:       I("Ventes au Détail",          0.5, -0.1, "% MoM", "bullish",  "Jan 2026", "Légère reprise de la consommation. Impacté par la baisse des taux BCE."),
    confidence:        I("Confiance Conso. (CE)",   -13.8,-15.5,"pts",   "neutral", "Mar 2026", "Commission Européenne. Toujours négatif mais en amélioration."),
    wageGrowth:        I("Salaires Négociés",         5.6,  4.5,  "% YoY", "bearish", "Q4 2025", "Salaires négociés BCE. Encore élevés — risque de persistance inflationniste."),
    currentAccount:    I("Compte Courant",           45.2, 38.7, "B EUR", "bullish",  "Jan 2026", "Excédent CA. Soutien structurel à l'euro, amélioration notable."),
  },
};

export const GBP: CurrencyMacro = {
  code: "GBP", name: "Livre Sterling", country: "Royaume-Uni",
  flag: "🇬🇧", centralBank: "Bank of England", cbCode: "BOE",
  tvSymbol: "FX:GBPUSD",
  currentRate: 4.50, prevRate: 4.75, rateDate: "Fév 2026",
  rateTarget: "2%", nextMeeting: "8 mai 2026",
  stance: "neutral",
  stanceNote: "La BOE procède à des baisses graduelles. Inflation services persistante freine l'assouplissement. Vote du MPC divisé (5-4). Baisse prudente attendue en mai.",
  themes: [
    "🔥 Inflation services collante — +5.1% YoY, frein aux baisses de taux BOE",
    "📉 PMI Manufacturing effondré — pire performer G8, impact Brexit durable",
    "💷 Résilience relative — économie UK tient mieux que prévu, soutien GBP",
  ],
  indicators: {
    cpi:               I("IPC",                      2.8,  3.0,  "%",    "neutral", "Fév 2026", "CPI annuel UK. Cible BOE 2%. Inflation services encore élevée à 5.1%."),
    gdp:               I("PIB (Croissance)",          1.4,  0.9,  "% YoY", "bullish",  "Q4 2025", "Croissance annuelle UK. Reprise modérée, meilleure que les attentes."),
    pmiManufacturing:  I("PMI Manufacturier",       44.9, 46.9, "pts",  "bearish", "Mar 2026", "Forte contraction. Pire résultat G8. Impact Brexit + coûts énergie."),
    pmiServices:       I("PMI Services",            53.0, 51.0, "pts",  "bullish",  "Mar 2026", "Secteur services UK solide. Finance Londres + tourisme = soutien majeur."),
    unemployment:      I("Chômage",                  4.5,  4.4,  "%",    "neutral", "Jan 2026", "Taux chômage UK. En légère hausse. Marché travail commence à se détendre."),
    tradeBalance:      I("Balance Commerciale",      -2.3, -1.8, "B GBP", "bearish", "Jan 2026", "Déficit commercial mensuel UK. Pression structurelle sur la livre."),
    retailSales:       I("Ventes au Détail",         -0.3,  0.7, "% MoM", "bearish", "Fév 2026", "Baisse mensuelle des ventes. Consommateur UK sous pression financière."),
    confidence:        I("GfK Confiance Conso.",     -19, -20,  "pts",   "neutral", "Mar 2026", "GfK Consumer Confidence. Toujours très négatif malgré légère hausse."),
    wageGrowth:        I("Salaires (Priv. Sector)",   5.8,  6.0,  "% YoY", "bearish", "Jan 2026", "Salaires secteur privé. Très élevés — principale source d'inflation services."),
    currentAccount:    I("Compte Courant",           -21.3,-18.9,"B GBP", "bearish", "Q3 2025", "Déficit CA persistant UK. Dépendance financement externe depuis décennies."),
  },
};

export const JPY: CurrencyMacro = {
  code: "JPY", name: "Yen Japonais", country: "Japon",
  flag: "🇯🇵", centralBank: "Bank of Japan", cbCode: "BOJ",
  tvSymbol: "FX:USDJPY",
  currentRate: 0.50, prevRate: 0.25, rateDate: "Jan 2026",
  rateTarget: "Stable prices ~2%", nextMeeting: "1 mai 2026",
  stance: "hawkish",
  stanceNote: "La BOJ est dans un cycle de hausses inédit depuis des décennies. Inflation dépasse la cible, salaires en forte hausse. Prochaine hausse attendue en Q2 2026.",
  themes: [
    "🚀 Sortie de la déflation — inflation durable au-dessus de 2%, normalisation BOJ",
    "💴 Yen sous-évalué — forte accumulation de positions short JPY à dénouer",
    "📊 Croissance fragile — PIB volatile, consommation intérieure hésitante",
  ],
  indicators: {
    cpi:               I("IPC (Natl CPI)",            3.7,  4.0,  "%",    "bearish", "Fév 2026", "Inflation annuelle Japon. Au-dessus cible BOJ 2%. Pression sur BOJ de monter."),
    gdp:               I("PIB (Croissance)",           1.2,  0.1,  "% YoY", "neutral", "Q3 2025", "PIB annuel Japon. Volatile, reprise en cours après contraction Q2 2025."),
    pmiManufacturing:  I("PMI Manufacturier",        48.3, 49.0, "pts",  "bearish", "Mar 2026", "Jibun Bank PMI. Contraction légère, industrie impactée par yen faible."),
    pmiServices:       I("PMI Services",             53.7, 53.5, "pts",  "bullish",  "Mar 2026", "Secteur services japonais en expansion solide. Tourisme record en 2026."),
    unemployment:      I("Chômage",                   2.5,  2.4,  "%",    "bullish",  "Jan 2026", "Quasi-plein emploi Japon. Marché travail très tendu, pression salariale."),
    tradeBalance:      I("Balance Commerciale",      -64.1,-82.3,"B JPY", "neutral", "Fév 2026", "Déficit commercial mensuel. Importations énergie coûteuses en JPY faible."),
    retailSales:       I("Ventes au Détail",           3.9,  3.7,  "% YoY", "bullish",  "Fév 2026", "Consommation japonnaise solide. Hausse nominale soutenue par l'inflation."),
    confidence:        I("Confiance Conso.",          35.1, 34.4, "pts",   "bullish",  "Mar 2026", "Cabinet Office. Amélioration progressive. Hausse salaires = optimisme."),
    wageGrowth:        I("Salaires (Shunto)",          5.5,  5.3,  "% YoY", "bullish",  "Mar 2026", "Négociations Shunto 2026. Hausses salariales importantes = soutien BOJ hawkish."),
    currentAccount:    I("Compte Courant",            25.8, 18.3, "B JPY (T)", "bullish", "Jan 2026", "Excédent CA solide Japon. Revenus d'investissements massifs à l'étranger."),
  },
};

export const CHF: CurrencyMacro = {
  code: "CHF", name: "Franc Suisse", country: "Suisse",
  flag: "🇨🇭", centralBank: "Banque Nationale Suisse", cbCode: "SNB",
  tvSymbol: "FX:USDCHF",
  currentRate: 0.25, prevRate: 0.50, rateDate: "Mar 2026",
  rateTarget: "< 2%", nextMeeting: "19 juin 2026",
  stance: "dovish",
  stanceNote: "La SNB a coupé à 0.25%, taux plancher quasi atteint. Inflation très basse (0.3%), risque de déflation. Taux négatifs possibles si franc trop fort.",
  themes: [
    "💰 Valeur refuge — le CHF s'apprécie en période de stress, surperformance en 2026",
    "📉 Désinflation extrême — inflation à 0.3%, risque deflation pousse SNB à l'action",
    "🔄 Interventions FX — SNB prête à intervenir sur le marché des changes si nécessaire",
  ],
  indicators: {
    cpi:               I("IPC",                       0.3,  0.7,  "%",    "bearish", "Mar 2026", "Inflation très basse. Risque de déflation. Principal enjeu pour la SNB."),
    gdp:               I("PIB (Croissance)",           1.6,  1.4,  "% YoY", "bullish",  "Q4 2025", "Croissance suisse solide pour l'Europe. Secteur pharma/finance porteurs."),
    pmiManufacturing:  I("PMI Manufacturier",        48.5, 49.0, "pts",  "bearish", "Mar 2026", "procure.ch PMI. Légère contraction. Industrie suisse impactée par CHF fort."),
    pmiServices:       I("PMI Services",             51.0, 50.8, "pts",  "neutral", "Mar 2026", "Services suisses stables. Finance et tourisme supportent l'économie."),
    unemployment:      I("Chômage",                   2.9,  2.8,  "%",    "bullish",  "Mar 2026", "L'un des plus faibles du monde. Marché travail suisse très sain."),
    tradeBalance:      I("Balance Commerciale",        3.7,  3.2,  "B CHF", "bullish",  "Fév 2026", "Excédent commercial mensuel. Exportations pharma/chimie très compétitives."),
    retailSales:       I("Ventes au Détail",           0.8,  0.3,  "% YoY", "neutral", "Jan 2026", "Consommation modeste. Inflation basse = pas de poussée nominale des ventes."),
    confidence:        I("Confiance Conso. (SECO)",  -34.9,-38.2,"pts",   "neutral", "Mar 2026", "SECO Consumer Sentiment. Négatif mais en amélioration. Prudence persistante."),
    wageGrowth:        I("Salaires Réels",             1.8,  1.5,  "% YoY", "neutral", "2025",    "Croissance salaires réels suisses. Modérée, cohérente avec faible inflation."),
    currentAccount:    I("Compte Courant",            67.8, 71.2, "B CHF", "bullish",  "Q3 2025", "Excédent CA massif. Structure économique suisse = soutien structurel au CHF."),
  },
};

export const CAD: CurrencyMacro = {
  code: "CAD", name: "Dollar Canadien", country: "Canada",
  flag: "🇨🇦", centralBank: "Banque du Canada", cbCode: "BOC",
  tvSymbol: "FX:USDCAD",
  currentRate: 2.75, prevRate: 3.00, rateDate: "Mar 2026",
  rateTarget: "2%", nextMeeting: "16 avr 2026",
  stance: "dovish",
  stanceNote: "La BOC continue son cycle d'assouplissement. Croissance en dessous du potentiel, chômage en hausse. Impacts des tarifs douaniers US = pression baissière sur CAD.",
  themes: [
    "⚠️ Risque tarifaire US — tarifs commerciaux Trump = forte pression récessive sur CAD",
    "📉 Marché immobilier sous pression — surendettement ménages, corrections prix maison",
    "🛢️ Corrélation pétrole — CAD suit WTI, volatilité liée aux décisions OPEC+",
  ],
  indicators: {
    cpi:               I("IPC",                       2.6,  1.9,  "%",    "neutral", "Fév 2026", "Inflation annuelle Canada. Remontée temporaire liée aux tarifs. Cible BOC 2%."),
    gdp:               I("PIB (Croissance)",           1.6,  1.9,  "% YoY", "neutral", "Q4 2025", "Croissance annuelle Canada. En ralentissement. Impact tarifaires US Q1 2026."),
    pmiManufacturing:  I("PMI Manufacturier",        46.3, 47.8, "pts",  "bearish", "Mar 2026", "S&P Global PMI Canada. Forte contraction. Manufactures canadiennes pénalisées."),
    pmiServices:       I("PMI Services",             50.9, 50.6, "pts",  "neutral", "Mar 2026", "Services stables malgré contexte difficile. Économie à deux vitesses."),
    unemployment:      I("Chômage",                   6.7,  6.6,  "%",    "bearish", "Mar 2026", "Taux chômage Canada. En hausse depuis 2024. Signe de ralentissement du marché."),
    tradeBalance:      I("Balance Commerciale",        3.9,  4.2,  "B CAD", "neutral", "Jan 2026", "Excédent commercial. Exportations pétrole + agriculture soutiennent le solde."),
    retailSales:       I("Ventes au Détail",          -0.6,  0.2,  "% MoM", "bearish", "Jan 2026", "Baisse consommation. Ménages canadiens très endettés, sensibles aux taux."),
    confidence:        I("Confiance Conso. (Nanos)",  44.2, 47.8, "pts",   "bearish", "Mar 2026", "Nanos Consumer Confidence. Dégradation nette. Incertitude tarifaire pèse."),
    wageGrowth:        I("Salaires",                   4.5,  4.8,  "% YoY", "neutral", "Fév 2026", "Croissance salariale Canada. Encore élevée mais en décélération progressive."),
    currentAccount:    I("Compte Courant",            -8.2, -5.3, "B CAD", "bearish", "Q4 2025", "Déficit CA Canada. Pression sur le CAD à moyen terme."),
  },
};

export const AUD: CurrencyMacro = {
  code: "AUD", name: "Dollar Australien", country: "Australie",
  flag: "🇦🇺", centralBank: "Reserve Bank of Australia", cbCode: "RBA",
  tvSymbol: "FX:AUDUSD",
  currentRate: 4.10, prevRate: 4.35, rateDate: "Fév 2026",
  rateTarget: "2-3%", nextMeeting: "20 mai 2026",
  stance: "neutral",
  stanceNote: "La RBA a commencé à couper prudemment en février. Inflation en baisse mais marché du travail toujours tendu. Exposition forte à la Chine = risque majeur.",
  themes: [
    "🇨🇳 Proxy Chine — AUD corrélé à la croissance chinoise et aux matières premières",
    "⛏️ Minerais de fer — iron ore = principale export, prix clé pour l'AUD",
    "🏠 Immobilier surchauffé — boom immobilier Sydney/Melbourne, risque bulle",
  ],
  indicators: {
    cpi:               I("IPC",                       2.4,  2.4,  "%",    "bullish",  "Q4 2025", "Inflation Australie. Dans la cible RBA 2-3%. Pas de pression inflationniste."),
    gdp:               I("PIB (Croissance)",           1.3,  0.8,  "% YoY", "neutral", "Q3 2025", "Croissance annuelle Australie. Lente mais positive. Impact taux élevés visible."),
    pmiManufacturing:  I("PMI Manufacturier",        54.0, 50.4, "pts",  "bullish",  "Mar 2026", "Judo Bank PMI. En forte expansion ! Secteur manufacturier australien en forme."),
    pmiServices:       I("PMI Services",             51.2, 50.8, "pts",  "bullish",  "Mar 2026", "Services en expansion légère. Tourisme + services financiers = moteurs."),
    unemployment:      I("Chômage",                   4.1,  4.0,  "%",    "neutral", "Fév 2026", "Taux chômage Australie. Marché travail résilient. Légère hausse vs plancher."),
    tradeBalance:      I("Balance Commerciale",        2.7,  5.1,  "B AUD", "neutral", "Jan 2026", "Excédent commercial. Exportations minerais/charbon/GNL = soutien structurel AUD."),
    retailSales:       I("Ventes au Détail",           0.2,  0.3,  "% MoM", "neutral", "Jan 2026", "Consommation australienne stable. Ménages sous pression des taux hypothécaires."),
    confidence:        I("Confiance Conso. (Westpac)", 95.9,92.1, "pts",   "bullish",  "Mar 2026", "Westpac-Melbourne. Amélioration post-baisse RBA. Seuil 100 = neutre."),
    wageGrowth:        I("WPI (Wage Price Index)",     3.4,  3.7,  "% YoY", "neutral", "Q4 2025", "Wage Price Index Australie. Décélération permet à la RBA de continuer couper."),
    currentAccount:    I("Compte Courant",            14.1, 10.8, "B AUD", "bullish",  "Q4 2025", "Excédent CA Australie. Exportations matières premières = soutien structurel AUD."),
  },
};

export const NZD: CurrencyMacro = {
  code: "NZD", name: "Dollar Néo-Zélandais", country: "Nouvelle-Zélande",
  flag: "🇳🇿", centralBank: "Reserve Bank of New Zealand", cbCode: "RBNZ",
  tvSymbol: "FX:NZDUSD",
  currentRate: 3.50, prevRate: 4.00, rateDate: "Fév 2026",
  rateTarget: "1-3%", nextMeeting: "28 mai 2026",
  stance: "dovish",
  stanceNote: "La RBNZ a coupé agressivement depuis 2025. Économie en récession en 2024, reprise timide. Cycle d'assouplissement parmi les plus rapides du G8.",
  themes: [
    "🥝 Économie fragilisée — récession 2024, reprise lente, consommateur en difficulté",
    "📉 Assouplissement agressif — RBNZ a coupé de 200bp, taux proches du neutre",
    "🐄 Produits laitiers — Fonterra/dairy exports = indicateur clé pour NZD/trade",
  ],
  indicators: {
    cpi:               I("IPC",                       2.5,  2.2,  "%",    "neutral", "Q4 2025", "Inflation NZ. Dans la cible RBNZ 1-3%. Pas de contrainte inflationniste."),
    gdp:               I("PIB (Croissance)",           0.7,  -0.3, "% YoY", "neutral", "Q3 2025", "PIB annuel NZ. Sortie de récession en 2025. Reprise très progressive."),
    pmiManufacturing:  I("PMI Manufacturier",        50.2, 49.4, "pts",  "neutral", "Mar 2026", "BNZ/BusinessNZ PMI. Tout juste en expansion. Amélioration post-récession."),
    pmiServices:       I("PMI Services",             49.8, 48.0, "pts",  "bearish", "Mar 2026", "Services toujours en légère contraction. Économie NZ pas encore remontée."),
    unemployment:      I("Chômage",                   5.1,  5.4,  "%",    "neutral", "Q4 2025", "Taux chômage NZ. En baisse vs pic. Marché travail se stabilise post-récession."),
    tradeBalance:      I("Balance Commerciale",       -0.4, -0.7, "B NZD", "neutral", "Fév 2026", "Déficit commercial mensuel NZ. Importations > exportations, pression sur NZD."),
    retailSales:       I("Ventes au Détail",          -0.1, -0.3, "% QoQ", "bearish", "Q4 2025", "Consommation NZ faible. Ménages endettés, taux hypothécaires élevés encore."),
    confidence:        I("Confiance Conso. (ANZ)",    97.5, 93.6, "pts",   "bullish",  "Mar 2026", "ANZ Consumer Confidence. Amélioration notable. Seuil 100 = neutre."),
    wageGrowth:        I("LCI (Labour Cost Index)",    3.1,  3.3,  "% YoY", "neutral", "Q4 2025", "Labour Cost Index NZ. Décélération salariale permet à la RBNZ de couper encore."),
    currentAccount:    I("Compte Courant",            -7.3, -8.2, "B NZD", "bearish", "Q3 2025", "Déficit CA NZ. Pression structurelle sur le NZD, besoin financement extérieur."),
  },
};

// ── MATIÈRES PREMIÈRES ────────────────────────────────────────────────────────

export interface CommodityMacro {
  code: string;
  name: string;
  flag: string;
  category: string;
  tvSymbol: string;
  currentPrice: number;
  priceUnit: string;
  drivers: { label: string; value: string; signal: Signal; desc: string }[];
  keyFactors: string[];
  correlations: { asset: string; correlation: string; note: string }[];
  outlook: string;
  outlineSignal: Signal;
}

export const GOLD: CommodityMacro = {
  code: "XAU", name: "Or (Gold)", flag: "🥇",
  category: "Métal Précieux", tvSymbol: "OANDA:XAUUSD",
  currentPrice: 3120, priceUnit: "USD/oz",
  drivers: [
    { label: "Taux Réels US (TIPS)", value: "+1.8%",  signal: "bearish",  desc: "Taux réels élevés = coût d'opportunité de l'or élevé" },
    { label: "DXY (Dollar Index)",   value: "99.8",   signal: "bullish",  desc: "Dollar faible = or bon marché pour acheteurs étrangers" },
    { label: "Achats Banques Cent.", value: "+1037T",  signal: "bullish",  desc: "Chine, Inde, Pologne — diversification massive hors dollar" },
    { label: "ETF Holdings",         value: "+124T",   signal: "bullish",  desc: "Retour des flux sur les ETF or après 2 ans de sorties" },
    { label: "Inflation Attendue",   value: "2.4%",   signal: "bullish",  desc: "L'or protège contre la hausse des prix à long terme" },
    { label: "Risk Off (VIX)",       value: "24.8",   signal: "bullish",  desc: "Volatilité élevée = demande de refuge vers l'or" },
  ],
  keyFactors: [
    "🏦 Banques centrales acheteurs massifs — dédollarisation accélérée en 2025-26",
    "📊 Corrélation inverse taux réels — les baisses Fed = carburant pour l'or",
    "⚔️ Géopolitique — tensions US/Chine + guerres = prime de risque soutenue",
  ],
  correlations: [
    { asset: "USD (DXY)",   correlation: "-0.78", note: "Corrélation inverse forte — dollar faible → or monte" },
    { asset: "US Taux 10Y", correlation: "-0.65", note: "Taux hausse → or baisse (coût d'opportunité)" },
    { asset: "VIX",         correlation: "+0.42", note: "Corrélation modérée avec la peur" },
    { asset: "S&P 500",     correlation: "+0.15", note: "Corrélation faible — or = diversification" },
  ],
  outlook: "Haussier structurel. Achats banques centrales + désinflation Fed + tensions géopolitiques = contexte favorable. Cible analystes: $3,500-4,000/oz.",
  outlineSignal: "bullish",
};

export const WTI: CommodityMacro = {
  code: "WTI", name: "Pétrole WTI", flag: "🛢️",
  category: "Énergie", tvSymbol: "TVC:USOIL",
  currentPrice: 71.5, priceUnit: "USD/barrel",
  drivers: [
    { label: "Production OPEC+",     value: "40.1 Mb/j", signal: "neutral", desc: "OPEC+ maintient les coupes de production pour soutenir les prix" },
    { label: "Inventaires US (EIA)", value: "+4.2 Mb",  signal: "bearish",  desc: "Hausse des stocks US = signal d'offre excédentaire" },
    { label: "Demande Chine",        value: "+2.3%",    signal: "bullish",  desc: "Reprise de la demande chinoise = soutien aux prix" },
    { label: "PMI Global",           value: "50.8 pts", signal: "bullish",  desc: "PMI > 50 = expansion économique = plus de demande d'énergie" },
    { label: "USD (DXY)",            value: "99.8",     signal: "bullish",  desc: "Dollar faible = pétrole moins cher = demande mondiale soutenue" },
    { label: "Spare Capacity OPEC",  value: "5.8 Mb/j", signal: "bearish",  desc: "Forte capacité de réserve OPEC = plafond sur les prix" },
  ],
  keyFactors: [
    "🛢️ OPEC+ contrôle l'offre — réunions clés à surveiller pour évolution prix",
    "🇨🇳 Demande Chine = driver principal — reprise économique chinoise = carburant WTI",
    "📊 Corrélation CAD/NOK — CAD fortement corrélé au prix du pétrole",
  ],
  correlations: [
    { asset: "CAD/USD",   correlation: "+0.72", note: "CAD corrélé positivement au WTI" },
    { asset: "NOK/USD",   correlation: "+0.68", note: "Couronne norvégienne suit le pétrole" },
    { asset: "USD (DXY)", correlation: "-0.55", note: "Dollar faible = pétrole plus cher" },
    { asset: "S&P 500",   correlation: "+0.45", note: "Croissance éco = plus de demande pétrole" },
  ],
  outlook: "Neutre à court terme. OPEC+ soutient les prix mais demande US ralentit. Risque baissier si recession US. Zone de support: $65-70/bbl.",
  outlineSignal: "neutral",
};

// ── CRYPTO ───────────────────────────────────────────────────────────────────

export interface CryptoMacro {
  code: string;
  name: string;
  flag: string;
  tvSymbol: string;
  currentPrice: number;
  drivers: { label: string; value: string; signal: Signal; desc: string }[];
  onchain: { label: string; value: string; signal: Signal }[];
  keyFactors: string[];
  correlations: { asset: string; correlation: string; note: string }[];
  outlook: string;
  outlineSignal: Signal;
}

export const BTC: CryptoMacro = {
  code: "BTC", name: "Bitcoin", flag: "₿",
  tvSymbol: "BITSTAMP:BTCUSD",
  currentPrice: 83500,
  drivers: [
    { label: "Politique Fed",        value: "Attentiste", signal: "neutral", desc: "Fed en pause = ni tailwind ni headwind pour BTC à court terme" },
    { label: "ETF BTC Flux",         value: "+$1.2B/sem", signal: "bullish",  desc: "Entrées nettes dans ETF Bitcoin US = demande institutionnelle forte" },
    { label: "Halving Cycle",        value: "12 mois",   signal: "bullish",  desc: "Post-halving avril 2024 — historiquement haussier 12-18 mois après" },
    { label: "Liquidité M2 Global",  value: "+4.2%",     signal: "bullish",  desc: "Expansion monétaire mondiale = contexte favorable aux actifs risqués" },
    { label: "Sentiment (F&G)",      value: "9 — Peur",  signal: "neutral", desc: "Peur extrême = potentiel opportunité d'achat contrarian" },
    { label: "Corrélation S&P 500",  value: "+0.72",     signal: "bearish",  desc: "BTC évolue comme actif risqué, vulnérable aux corrections equity" },
  ],
  onchain: [
    { label: "Hash Rate",          value: "820 EH/s",  signal: "bullish"  },
    { label: "Active Addresses",   value: "921K/jour", signal: "neutral" },
    { label: "Exchange Reserves",  value: "-12%",      signal: "bullish"  },
    { label: "Long-Term Holders",  value: "76.4%",     signal: "bullish"  },
    { label: "Funding Rate",       value: "-0.01%",    signal: "neutral" },
    { label: "NVT Ratio",          value: "65",        signal: "neutral" },
  ],
  keyFactors: [
    "🏦 ETF institutionnels — BlackRock, Fidelity = demande institutionnelle structurelle",
    "📊 Corrélation Nasdaq — BTC suit les marchés risqués, vulnérable si récession",
    "₿ Halving 2024 — supply shock historiquement = bull run 12-18 mois post-halving",
  ],
  correlations: [
    { asset: "Nasdaq 100",  correlation: "+0.72", note: "Actif risqué = suit les tech stocks" },
    { asset: "DXY",         correlation: "-0.58", note: "Dollar faible = BTC monte" },
    { asset: "Gold",        correlation: "+0.38", note: "Corrélation modérée — tous deux = inflation hedge" },
    { asset: "ETH",         correlation: "+0.91", note: "Corrélation très forte avec l'écosystème crypto" },
  ],
  outlook: "Neutre à court terme (peur extrême + correction -20%). Haussier moyen terme (ETF, halving, baisse Fed). Zone support: $75-80K.",
  outlineSignal: "neutral",
};

// ── REGISTRY ─────────────────────────────────────────────────────────────────

export const FOREX_CURRENCIES = [USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD];
export const COMMODITIES = [GOLD, WTI];
export const CRYPTOS = [BTC];

export const ALL_CODES = {
  USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD,
};
