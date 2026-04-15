import type { AnalyzeResponse } from "@/types/analysis";
import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";

interface AnalysisPanelProps {
  result: AnalyzeResponse | null;
  isLoading: boolean;
  error: string | null;
}

function getDirectionMeta(direction: AnalyzeResponse["direction"]) {
  if (direction === "up") {
    return { label: "Naik", color: "text-emerald-400" };
  }
  if (direction === "down") {
    return { label: "Turun", color: "text-rose-400" };
  }
  return { label: "Sideways", color: "text-amber-300" };
}

function formatDirection(direction: AnalyzeResponse["direction"]) {
  if (direction === "up") {
    return "Naik";
  }
  if (direction === "down") {
    return "Turun";
  }
  return "Sideways";
}

export function AnalysisPanel({ result, isLoading, error }: AnalysisPanelProps) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
        <p className="text-sm text-zinc-300">Menganalisa data market...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-rose-800 bg-rose-950/40 p-4">
        <p className="text-sm text-rose-200">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
        <p className="text-sm text-zinc-400">
          Pilih horizon waktu lalu klik Analisa untuk lihat proyeksi arah harga.
        </p>
      </section>
    );
  }

  const directionMeta = getDirectionMeta(result.direction);

  return (
    <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">Hasil Analisa</p>
        <p className="text-xs text-zinc-500">
          {new Date(result.timestamp).toLocaleTimeString("id-ID")}
        </p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Arah harga</span>
        <span className={`text-lg font-bold ${directionMeta.color}`}>
          {directionMeta.label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Confidence</span>
        <span className="text-lg font-semibold text-sky-300">
          {result.confidence}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Harga terakhir</span>
        <div className="text-right">
          <p className="font-medium text-zinc-100">{formatUsd(result.latestPrice)}</p>
          <p className="text-xs text-zinc-400">{formatIdr(usdToIdr(result.latestPrice))}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Harga perkiraan</span>
        <div className="text-right">
          <p className="font-medium text-zinc-100">
            {formatUsd(result.latestPrice)} -&gt; {formatUsd(result.predictedPrice)}
          </p>
          <p className="text-xs text-zinc-400">
            {formatIdr(usdToIdr(result.latestPrice))} -&gt;{" "}
            {formatIdr(usdToIdr(result.predictedPrice))}
          </p>
        </div>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <p className="text-xs text-zinc-400">Min prediksi</p>
          <p className="font-medium text-zinc-100">{formatUsd(result.predictedMinPrice)}</p>
          <p className="text-xs text-zinc-500">{formatIdr(usdToIdr(result.predictedMinPrice))}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <p className="text-xs text-zinc-400">Max prediksi</p>
          <p className="font-medium text-zinc-100">{formatUsd(result.predictedMaxPrice)}</p>
          <p className="text-xs text-zinc-500">{formatIdr(usdToIdr(result.predictedMaxPrice))}</p>
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm text-zinc-300">Alasan sinyal:</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-zinc-300">Debat 3 AI:</p>
        {result.aiDebate.map((opinion) => (
          <div
            key={opinion.aiName}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-zinc-100">{opinion.aiName}</p>
              <p className="text-xs text-zinc-400">{opinion.style}</p>
            </div>
            <p className="mt-1 text-sm text-zinc-300">
              Putusan: <span className="font-semibold">{formatDirection(opinion.direction)}</span>{" "}
              ({opinion.confidence}%)
            </p>
            <p className="mt-1 text-xs text-zinc-400">{opinion.argument}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Disclaimer: ini sinyal probabilistik jangka pendek, bukan kepastian.
      </p>
    </section>
  );
}
