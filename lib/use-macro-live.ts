"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Fenêtres de publication des annonces (heure ET = UTC-5)
 * Polling 15s dans ces fenêtres, 60s sinon.
 */
const RELEASE_WINDOWS: { hStart: number; mStart: number; hEnd: number; mEnd: number; label: string }[] = [
  { hStart: 8,  mStart: 25, hEnd: 8,  mEnd: 50,  label: "BLS (CPI/NFP/PPI/Retail/GDP)" },
  { hStart: 9,  mStart: 55, hEnd: 10, mEnd: 20,  label: "ISM PMI" },
  { hStart: 13, mStart: 55, hEnd: 14, mEnd: 20,  label: "FOMC / ECB Decision" },
];

function inReleaseWindow(): { active: boolean; label: string } {
  const now = new Date();
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const etH  = (utcH - 5 + 24) % 24;
  const total = etH * 60 + utcM;
  for (const w of RELEASE_WINDOWS) {
    if (total >= w.hStart * 60 + w.mStart && total <= w.hEnd * 60 + w.mEnd)
      return { active: true, label: w.label };
  }
  return { active: false, label: "" };
}

export interface MacroLiveState {
  data:          Record<string, unknown> | null;
  loading:       boolean;
  error:         boolean;
  errorMsg:      string;
  lastUpdate:    Date | null;
  nextRefreshIn: number;
  refreshing:    boolean;
  inWindow:      boolean;
  windowLabel:   string;
  dataSource:    "Trading Economics" | "IMF/BLS/ECB" | null;
  apiKeyMissing: boolean;
  refresh:       () => void;
}

export function useMacroLive(): MacroLiveState {
  const [data,          setData]          = useState<Record<string, unknown> | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(false);
  const [errorMsg,      setErrorMsg]      = useState("");
  const [lastUpdate,    setLastUpdate]    = useState<Date | null>(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState(60);
  const [inWindow,      setInWindow]      = useState(false);
  const [windowLabel,   setWindowLabel]   = useState("");
  const [dataSource,    setDataSource]    = useState<"Trading Economics" | "IMF/BLS/ECB" | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);

    try {
      const t = Date.now();

      // 1️⃣ Essayer Trading Economics en priorité
      const teRes = await fetch(`/api/macro-te?t=${t}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (teRes.ok) {
        const teJson = await teRes.json();

        if (teJson?.data && Object.keys(teJson.data).length > 0) {
          // Vérifier qu'on a bien des données (pas juste des objets vides)
          const hasValues = Object.values(teJson.data as Record<string, Record<string, unknown>>)
            .some(v => Object.keys(v).length > 0);

          if (hasValues) {
            setData(teJson.data);
            setDataSource("Trading Economics");
            setApiKeyMissing(teJson.apiKey?.includes("guest") ?? false);
            setError(false);
            setErrorMsg("");
            setLastUpdate(new Date());
            return;
          }
        }
        // TE a répondu mais sans données (guest limité) → fallback IMF
        setApiKeyMissing(true);
      }

      // 2️⃣ Fallback : IMF/BLS/ECB
      const imfRes = await fetch(`/api/macro-live?t=${t}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!imfRes.ok) throw new Error(`IMF API ${imfRes.status}`);
      const imfJson = await imfRes.json();

      if (imfJson?.data) {
        setData(imfJson.data);
        setDataSource("IMF/BLS/ECB");
        setError(false);
        setErrorMsg("");
        setLastUpdate(new Date());
      } else {
        throw new Error("Aucune donnée reçue");
      }

    } catch (e) {
      setError(true);
      setErrorMsg(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const scheduleNext = useCallback(() => {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const { active, label } = inReleaseWindow();
    setInWindow(active);
    setWindowLabel(label);

    const intervalSec = active ? 15 : 60;
    setNextRefreshIn(intervalSec);

    countdownRef.current = setInterval(() => {
      setNextRefreshIn(prev => Math.max(0, prev - 1));
    }, 1000);

    timerRef.current = setTimeout(() => {
      fetchData();
      scheduleNext();
    }, intervalSec * 1000);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
    scheduleNext();
    return () => {
      if (timerRef.current)     clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchData, scheduleNext]);

  const refresh = useCallback(() => {
    if (timerRef.current)     clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    fetchData(true).then(() => scheduleNext());
  }, [fetchData, scheduleNext]);

  return { data, loading, error, errorMsg, lastUpdate, nextRefreshIn, refreshing, inWindow, windowLabel, dataSource, apiKeyMissing, refresh };
}
