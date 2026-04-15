"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AnalysisPanel } from "@/components/AnalysisPanel";
import { HorizonSelector } from "@/components/HorizonSelector";
import { MarketChart } from "@/components/MarketChart";
import {
  HORIZON_OPTIONS,
  type AnalyzeResponse,
  type Candle,
  type ChartType,
  type HorizonMinutes,
} from "@/types/analysis";

const DEFAULT_PAIR = "pepe";

export default function Home() {
  const [pairAddress, setPairAddress] = useState(DEFAULT_PAIR);
  const [horizon, setHorizon] = useState<HorizonMinutes>(HORIZON_OPTIONS[0]);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoLoaded = useRef(false);
  const isFetchingRef = useRef(false);

  const handleAnalyze = useCallback(async (silent = false) => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    if (!silent) {
      setIsLoading(true);
    }
    if (!silent) {
      setError(null);
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairAddress, horizonMinutes: horizon }),
      });

      const data = (await response.json()) as AnalyzeResponse | { error: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Gagal memproses analisa.");
      }

      const result = data as AnalyzeResponse;
      setAnalysis(result);
      setCandles(result.candles);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Terjadi error yang tidak diketahui.";
      setError(message);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, [horizon, pairAddress]);

  useEffect(() => {
    if (hasAutoLoaded.current) {
      return;
    }

    hasAutoLoaded.current = true;
    void handleAnalyze();
  }, [handleAnalyze]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!pairAddress.trim()) {
        return;
      }
      void handleAnalyze(true);
    }, 60_000);

    return () => clearInterval(intervalId);
  }, [handleAnalyze, pairAddress]);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-2xl font-bold">Memecoin Market Analyzer</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Pilih pair/token, tentukan horizon analisa, lalu lihat prediksi arah harga jangka
            pendek.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm outline-none ring-emerald-500/40 placeholder:text-zinc-500 focus:ring-2"
              value={pairAddress}
              onChange={(event) => setPairAddress(event.target.value)}
              placeholder="Masukkan pair atau token (contoh: pepe, bonk, pair address)"
            />
            <button
              type="button"
              onClick={() => void handleAnalyze(false)}
              disabled={isLoading || pairAddress.trim().length === 0}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Menganalisa..." : "Analisa"}
            </button>
          </div>
          <div className="mt-4">
            <HorizonSelector value={horizon} onChange={setHorizon} disabled={isLoading} />
          </div>
          {analysis?.pairLabel ? (
            <p className="mt-3 text-xs text-zinc-500">
              Pair aktif: {analysis.pairLabel} - auto refresh tiap 1 menit
            </p>
          ) : null}
        </section>

        <MarketChart
          candles={candles}
          chartType={chartType}
          onChartTypeChange={setChartType}
        />
        <AnalysisPanel result={analysis} isLoading={isLoading} error={error} />
      </div>
    </main>
  );
}
