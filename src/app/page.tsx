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

const DEFAULT_PAIR = "bitcoin";
const LARGE_CAP_COINS = ["bitcoin", "ethereum", "bnb", "solana", "xrp", "cardano"] as const;
const MEME_COINS = ["dogecoin", "shiba-inu", "pepe", "bonk", "floki", "wif"] as const;
type CoinCategory = "largeCap" | "meme" | "topGainers";

interface TopGainerItem {
  id: string;
  symbol: string;
  change24h: number;
}

export default function Home() {
  const [pairAddress, setPairAddress] = useState(DEFAULT_PAIR);
  const [coinCategory, setCoinCategory] = useState<CoinCategory>("largeCap");
  const [topGainers, setTopGainers] = useState<TopGainerItem[]>([]);
  const [isLoadingGainers, setIsLoadingGainers] = useState(false);
  const [horizon, setHorizon] = useState<HorizonMinutes>(HORIZON_OPTIONS[0]);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartType, setChartType] = useState<ChartType>("line");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoLoaded = useRef(false);
  const isFetchingRef = useRef(false);

  const handleAnalyze = useCallback(async (silent = false, pairOverride?: string) => {
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
      const activePair = pairOverride?.trim() || pairAddress.trim();
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairAddress: activePair, horizonMinutes: horizon }),
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

  async function handleCoinPick(coin: string) {
    setPairAddress(coin);
    await handleAnalyze(false, coin);
  }

  const loadTopGainers = useCallback(async () => {
    setIsLoadingGainers(true);
    try {
      const response = await fetch("/api/top-gainers");
      const data = (await response.json()) as
        | { gainers: TopGainerItem[] }
        | { error: string };
      if (!response.ok) {
        throw new Error("error" in data ? data.error : "Gagal load top gainers.");
      }
      setTopGainers("gainers" in data ? data.gainers : []);
    } catch {
      setTopGainers([]);
    } finally {
      setIsLoadingGainers(false);
    }
  }, []);

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

  useEffect(() => {
    if (coinCategory === "topGainers" && topGainers.length === 0) {
      void loadTopGainers();
    }
  }, [coinCategory, loadTopGainers, topGainers.length]);

  const visibleCoins =
    coinCategory === "meme"
      ? MEME_COINS
      : coinCategory === "largeCap"
        ? LARGE_CAP_COINS
        : topGainers.map((coin) => coin.id);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-2xl font-bold">Crypto Market Analyzer</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Bisa analisa memecoin dan coin besar (BTC, ETH, BNB, SOL, dll) dengan prediksi arah
            harga jangka pendek.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCoinCategory("meme")}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                coinCategory === "meme"
                  ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              Memecoin
            </button>
            <button
              type="button"
              onClick={() => setCoinCategory("largeCap")}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                coinCategory === "largeCap"
                  ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              Crypto Gede
            </button>
            <button
              type="button"
              onClick={() => setCoinCategory("topGainers")}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                coinCategory === "topGainers"
                  ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              Top Gainers
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {visibleCoins.map((coin) => (
              <button
                key={coin}
                type="button"
                onClick={() => void handleCoinPick(coin)}
                disabled={isLoading}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  pairAddress === coin
                    ? "border-sky-500 bg-sky-500/20 text-sky-200"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {coinCategory === "topGainers"
                  ? `${topGainers.find((item) => item.id === coin)?.symbol ?? coin.toUpperCase()} (${(
                      topGainers.find((item) => item.id === coin)?.change24h ?? 0
                    ).toFixed(1)}%)`
                  : coin.toUpperCase()}
              </button>
            ))}
            {coinCategory === "topGainers" && isLoadingGainers ? (
              <p className="text-xs text-zinc-400">Mengambil data top gainers...</p>
            ) : null}
            {coinCategory === "topGainers" && !isLoadingGainers && visibleCoins.length === 0 ? (
              <p className="text-xs text-zinc-400">Top gainers belum tersedia, coba lagi nanti.</p>
            ) : null}
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
