import { formatIdr, formatUsd, usdToIdr } from "@/lib/currency";
import type { Candle, ChartType } from "@/types/analysis";

interface MarketChartProps {
  candles: Candle[];
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}

function buildPath(candles: Candle[], width: number, height: number) {
  if (candles.length < 2) {
    return "";
  }

  const closes = candles.map((candle) => candle.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  return candles
    .map((candle, index) => {
      const x = (index / (candles.length - 1)) * width;
      const y = height - ((candle.close - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildCandlePoints(candles: Candle[], width: number, height: number) {
  if (candles.length < 2) {
    return [];
  }

  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = max - min || 1;
  const candleWidth = Math.max(4, (width / candles.length) * 0.6);

  return candles.map((candle, index) => {
    const centerX = (index / (candles.length - 1)) * width;
    const openY = height - ((candle.open - min) / range) * height;
    const closeY = height - ((candle.close - min) / range) * height;
    const highY = height - ((candle.high - min) / range) * height;
    const lowY = height - ((candle.low - min) / range) * height;
    const bodyY = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);

    return {
      centerX,
      openY,
      closeY,
      highY,
      lowY,
      bodyY,
      bodyHeight,
      candleWidth,
      isUp: candle.close >= candle.open,
    };
  });
}

export function MarketChart({ candles, chartType, onChartTypeChange }: MarketChartProps) {
  const width = 720;
  const height = 280;
  const path = buildPath(candles, width, height);
  const candlePoints = buildCandlePoints(candles, width, height);
  const latestClose = candles[candles.length - 1]?.close ?? 0;
  const highestHigh = candles.length > 0 ? Math.max(...candles.map((candle) => candle.high)) : 0;
  const lowestLow = candles.length > 0 ? Math.min(...candles.map((candle) => candle.low)) : 0;

  function renderUsdAndIdr(price: number) {
    return `${formatUsd(price)} | ${formatIdr(usdToIdr(price))}`;
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200">Chart Harga</h2>
        <span className="text-xs text-zinc-500">Sumber: DexScreener</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChartTypeChange("line")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            chartType === "line"
              ? "border-emerald-500 bg-emerald-500 text-zinc-950"
              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          Line Chart
        </button>
        <button
          type="button"
          onClick={() => onChartTypeChange("candle")}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            chartType === "candle"
              ? "border-emerald-500 bg-emerald-500 text-zinc-950"
              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          Candle Chart
        </button>
      </div>
      {candles.length > 1 ? (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-72 w-full rounded-md bg-zinc-950"
            role="img"
            aria-label={
              chartType === "line" ? "Chart garis harga penutupan" : "Chart candlestick harga"
            }
          >
            {chartType === "line" ? (
              <>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path d={path} fill="none" stroke="#34d399" strokeWidth="3" />
                <path
                  d={`${path} L ${width} ${height} L 0 ${height} Z`}
                  fill="url(#priceGradient)"
                />
              </>
            ) : (
              candlePoints.map((point) => (
                <g key={`${point.centerX}-${point.openY}`}>
                  <line
                    x1={point.centerX}
                    y1={point.highY}
                    x2={point.centerX}
                    y2={point.lowY}
                    stroke={point.isUp ? "#34d399" : "#fb7185"}
                    strokeWidth="1.4"
                  />
                  <rect
                    x={point.centerX - point.candleWidth / 2}
                    y={point.bodyY}
                    width={point.candleWidth}
                    height={point.bodyHeight}
                    fill={point.isUp ? "#34d399" : "#fb7185"}
                    fillOpacity="0.85"
                    rx="1.2"
                  />
                </g>
              ))
            )}
          </svg>
          <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
            <p>Harga akhir: {renderUsdAndIdr(latestClose)}</p>
            <p>High: {renderUsdAndIdr(highestHigh)}</p>
            <p>Low: {renderUsdAndIdr(lowestLow)}</p>
          </div>
        </>
      ) : (
        <div className="flex h-72 items-center justify-center rounded-md bg-zinc-950 text-sm text-zinc-500">
          Data chart belum tersedia.
        </div>
      )}
    </section>
  );
}
