import type { AIDebateOpinion, Candle, Direction, HorizonMinutes } from "@/types/analysis";

export interface SignalResult {
  direction: Direction;
  confidence: number;
  reasons: string[];
  predictedPrice: number;
  predictedMinPrice: number;
  predictedMaxPrice: number;
  aiDebate: AIDebateOpinion[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calculateEma(values: number[], period: number) {
  if (values.length < period) {
    return values[values.length - 1] ?? 0;
  }

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((acc, value) => acc + value, 0) / period;

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
  }

  return ema;
}

function calculateRsi(closes: number[], period = 14) {
  if (closes.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let index = closes.length - period; index < closes.length; index += 1) {
    const diff = closes[index] - closes[index - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calculateVolatility(closes: number[], lookback = 20) {
  if (closes.length < 3) {
    return 0.01;
  }

  const start = Math.max(1, closes.length - lookback);
  const returns: number[] = [];

  for (let index = start; index < closes.length; index += 1) {
    const prev = closes[index - 1];
    const curr = closes[index];
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }

  if (returns.length === 0) {
    return 0.01;
  }

  const avgAbs = returns.reduce((acc, value) => acc + Math.abs(value), 0) / returns.length;
  return clamp(avgAbs, 0.002, 0.2);
}

function scoreToDirection(score: number): Direction {
  if (score > 6) {
    return "up";
  }
  if (score < -6) {
    return "down";
  }
  return "sideways";
}

function buildAIDebate(
  trendScore: number,
  rsiScore: number,
  momentumScore: number,
  volumeScore: number,
): AIDebateOpinion[] {
  const aiConfigs = [
    {
      aiName: "AI TrendMaster",
      style: "Fokus tren EMA",
      weights: { trend: 0.6, rsi: 0.15, momentum: 0.15, volume: 0.1 },
    },
    {
      aiName: "AI MomentumScout",
      style: "Fokus momentum jangka pendek",
      weights: { trend: 0.25, rsi: 0.15, momentum: 0.45, volume: 0.15 },
    },
    {
      aiName: "AI VolumeGuard",
      style: "Fokus konfirmasi volume + RSI",
      weights: { trend: 0.2, rsi: 0.35, momentum: 0.15, volume: 0.3 },
    },
  ] as const;

  return aiConfigs.map((config) => {
    const aiScore =
      trendScore * config.weights.trend +
      rsiScore * config.weights.rsi +
      momentumScore * config.weights.momentum +
      volumeScore * config.weights.volume;
    const direction = scoreToDirection(aiScore);
    const confidence = clamp(Math.round(Math.abs(aiScore) * 4.8 + 35), 30, 95);
    const argument =
      direction === "up"
        ? "Probabilitas naik lebih kuat karena kombinasi indikator mendukung buyer."
        : direction === "down"
          ? "Tekanan turun masih dominan, buyer belum cukup kuat membalikkan arah."
          : "Sinyal campuran, market cenderung konsolidasi sementara.";

    return {
      aiName: config.aiName,
      style: config.style,
      direction,
      confidence,
      argument,
    };
  });
}

export function buildSignal(candles: Candle[], horizon: HorizonMinutes): SignalResult {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const latestClose = closes[closes.length - 1] ?? 0;
  const prevClose = closes[closes.length - 2] ?? latestClose;
  const latestVolume = volumes[volumes.length - 1] ?? 0;

  const emaFast = calculateEma(closes, 9);
  const emaSlow = calculateEma(closes, 21);
  const rsi = calculateRsi(closes);
  const momentum = prevClose > 0 ? ((latestClose - prevClose) / prevClose) * 100 : 0;
  const avgVolume =
    volumes.length > 0 ? volumes.reduce((acc, value) => acc + value, 0) / volumes.length : 0;
  const volumeRatio = avgVolume > 0 ? latestVolume / avgVolume : 1;

  const trendScore = clamp(((emaFast - emaSlow) / (emaSlow || 1)) * 350, -35, 35);
  const rsiScore = clamp((rsi - 50) * 0.9, -25, 25);
  const momentumScore = clamp(momentum * 6, -20, 20);
  const volumeScore = clamp((volumeRatio - 1) * 12, -10, 12);
  const horizonWeight = 1 + horizon / 120;

  const rawScore =
    trendScore * 0.42 + rsiScore * 0.24 + momentumScore * 0.2 + volumeScore * 0.14;
  const score = rawScore * horizonWeight;

  const direction = scoreToDirection(score);

  const confidenceBase = clamp(Math.abs(score) * 4.2, 25, 95);
  const agreementBoost =
    Math.sign(trendScore) === Math.sign(momentumScore) && Math.sign(momentumScore) === Math.sign(rsiScore)
      ? 8
      : 0;
  const confidence = clamp(Math.round(confidenceBase + agreementBoost), 25, 99);
  const volatility = calculateVolatility(closes);
  const movePctRaw = (score / 100) * (horizon / 5) * 0.9;
  const movePct = clamp(movePctRaw, -0.35, 0.35);
  const predictedPrice = Math.max(latestClose * (1 + movePct), 0.00000001);
  const rangePct = clamp(
    volatility * (horizon / 5) * (1 + (100 - confidence) / 100),
    0.01,
    0.6,
  );
  const predictedMinPrice = Math.max(predictedPrice * (1 - rangePct), 0.00000001);
  const predictedMaxPrice = Math.max(predictedPrice * (1 + rangePct), predictedPrice);
  const aiDebate = buildAIDebate(trendScore, rsiScore, momentumScore, volumeScore);

  const reasons: string[] = [];
  reasons.push(
    emaFast >= emaSlow
      ? "EMA cepat berada di atas EMA lambat (trend short-term menguat)."
      : "EMA cepat berada di bawah EMA lambat (trend short-term melemah).",
  );
  reasons.push(
    rsi >= 60
      ? "RSI berada di zona bullish."
      : rsi <= 40
        ? "RSI berada di zona bearish."
        : "RSI berada di area netral.",
  );
  reasons.push(
    volumeRatio >= 1.1
      ? "Volume terbaru lebih tinggi dari rata-rata."
      : "Volume terbaru belum mengkonfirmasi pergerakan kuat.",
  );
  reasons.push(
    `Estimasi target ${horizon} menit: ${(movePct * 100).toFixed(2)}% dari harga terakhir.`,
  );

  return {
    direction,
    confidence,
    reasons,
    predictedPrice,
    predictedMinPrice,
    predictedMaxPrice,
    aiDebate,
  };
}
