// components/TradingViewChart.tsx
"use client";
import { useEffect, useRef } from "react";

// TV widget types (loaded dynamically from tradingview.com — free, no API key)
declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => { remove?: () => void };
    };
  }
}

// G8 pairs + commodities + indices mapped to TradingView AND Yahoo Finance symbols
export const TV_SYMBOLS: { label: string; tv: string; yf: string }[] = [
  { label: "EUR/USD",    tv: "FX:EURUSD",          yf: "EURUSD=X"  },
  { label: "GBP/USD",   tv: "FX:GBPUSD",          yf: "GBPUSD=X"  },
  { label: "USD/JPY",   tv: "FX:USDJPY",          yf: "JPY=X"     },
  { label: "USD/CHF",   tv: "FX:USDCHF",          yf: "CHF=X"     },
  { label: "USD/CAD",   tv: "FX:USDCAD",          yf: "CAD=X"     },
  { label: "AUD/USD",   tv: "FX:AUDUSD",          yf: "AUDUSD=X"  },
  { label: "NZD/USD",   tv: "FX:NZDUSD",          yf: "NZDUSD=X"  },
  { label: "EUR/GBP",   tv: "FX:EURGBP",          yf: "EURGBP=X"  },
  { label: "EUR/JPY",   tv: "FX:EURJPY",          yf: "EURJPY=X"  },
  { label: "GBP/JPY",   tv: "FX:GBPJPY",          yf: "GBPJPY=X"  },
  { label: "XAU/USD",   tv: "OANDA:XAUUSD",       yf: "GC=F"      },
  { label: "XAG/USD",   tv: "OANDA:XAGUSD",       yf: "SI=F"      },
  { label: "WTI Oil",   tv: "NYMEX:CL1!",         yf: "CL=F"      },
  { label: "S&P 500",   tv: "FOREXCOM:SPXUSD",    yf: "^GSPC"     },
  { label: "Nasdaq 100",tv: "FOREXCOM:NSXUSD",    yf: "^NDX"      },
  { label: "BTC/USD",   tv: "BITSTAMP:BTCUSD",    yf: "BTC-USD"   },
];

interface Props {
  tvSymbol: string;   // e.g. "FX:EURUSD"
  height?: number;
}

// Singleton script loader — only loads tv.js once across all widget instances
let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

function loadTVScript(cb: () => void) {
  if (scriptLoaded) { cb(); return; }
  callbacks.push(cb);
  if (scriptLoading) return;
  scriptLoading = true;
  const s = document.createElement("script");
  s.src = "https://s3.tradingview.com/tv.js";
  s.async = true;
  s.onload = () => {
    scriptLoaded = true;
    callbacks.forEach(fn => fn());
    callbacks.length = 0;
  };
  document.head.appendChild(s);
}

export default function TradingViewChart({ tvSymbol, height = 520 }: Props) {
  const containerId = "tv_advanced_chart";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    loadTVScript(() => {
      if (!window.TradingView || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      containerRef.current.id = containerId;

      new window.TradingView.widget({
        container_id: containerId,
        autosize: true,
        symbol: tvSymbol,
        interval: "D",
        timezone: "Europe/Paris",
        theme: "dark",
        style: "1",
        locale: "fr",
        toolbar_bg: "#10101e",
        enable_publishing: false,
        allow_symbol_change: true,
        hide_side_toolbar: false,
        save_image: false,
        hide_top_toolbar: false,
        studies: [],
        backgroundColor: "#060610",
        gridColor: "#1c1c38",
        withdateranges: true,
      });
    });

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [tvSymbol]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      style={{ width: "100%", height, background: "#060610", borderRadius: 8, overflow: "hidden" }}
    />
  );
}
