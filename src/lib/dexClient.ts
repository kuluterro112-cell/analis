import type { Candle, HorizonMinutes } from "@/types/analysis";

interface DexSearchPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken?: { symbol?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
}

interface DexSearchResponse {
  pairs?: DexSearchPair[];
}

export interface PairMarketData {
  pairLabel: string;
  latestPrice: number;
  candles: Candle[];
}

const DEX_BASE_URL =
  process.env.DEX_API_BASE_URL ?? "https://api.dexscreener.com/latest/dex";
const GECKO_BASE_URL = "https://api.geckoterminal.com/api/v2";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

interface GeckoOhlcvResponse {
  data?: {
    attributes?: {
      ohlcv_list?: [number, number, number, number, number, number][];
    };
  };
}

const CHAIN_TO_GECKO_NETWORK: Record<string, string> = {
  ethereum: "eth",
  bsc: "bsc",
  base: "base",
  arbitrum: "arbitrum",
  polygon: "polygon_pos",
  solana: "solana",
  sui: "sui-network",
  avalanche: "avax",
  optimism: "optimism",
};

function mapGeckoNetwork(chainId: string) {
  return CHAIN_TO_GECKO_NETWORK[chainId.toLowerCase()] ?? null;
}

async function fetchGeckoCandles(pair: DexSearchPair): Promise<Candle[] | null> {
  const network = mapGeckoNetwork(pair.chainId);
  if (!network) {
    return null;
  }

  const url = `${GECKO_BASE_URL}/networks/${network}/pools/${pair.pairAddress}/ohlcv/minute?aggregate=1&limit=100&currency=usd&token=base`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeckoOhlcvResponse;
  const rawCandles = data.data?.attributes?.ohlcv_list;
  if (!rawCandles || rawCandles.length < 2) {
    return null;
  }

  // Gecko mengembalikan urutan terbaru -> terlama, jadi dibalik ke oldest -> newest.
  return [...rawCandles]
    .reverse()
    .map(([timestamp, open, high, low, close, volume]) => ({
      timestamp: timestamp * 1000,
      open,
      high,
      low,
      close,
      volume,
    }))
    .filter(
      (candle) =>
        [candle.open, candle.high, candle.low, candle.close, candle.volume].every((value) =>
          Number.isFinite(value),
        ),
    );
}

function buildSyntheticCandles(
  latestPrice: number,
  horizonMinutes: HorizonMinutes,
  pair: DexSearchPair,
  count = 100,
): Candle[] {
  const now = Date.now();
  const msStep = 60_000;
  const m5 = (pair.priceChange?.m5 ?? 0) / 100;
  const h1 = (pair.priceChange?.h1 ?? 0) / 100;
  const h6 = (pair.priceChange?.h6 ?? 0) / 100;
  const baseDrift = m5 * 0.25 + h1 * 0.1 + h6 * 0.04;
  const volatility = clamp(Math.abs(m5) * 3 + Math.abs(h1) * 0.8 + 0.004, 0.003, 0.12);
  const baseVolume = Math.max(pair.volume?.h1 ?? 0, 1000);
  const horizonBias = horizonMinutes / 30;

  let close = Math.max(latestPrice / (1 + baseDrift * count * 0.4), latestPrice * 0.75);
  const candles: Candle[] = [];

  for (let index = 0; index < count; index += 1) {
    const noise = (pseudoRandom(index * 13.7 + latestPrice) - 0.5) * volatility;
    const drift = baseDrift * (0.8 + horizonBias * 0.3);
    const pctMove = drift + noise;
    const open = close;
    close = Math.max(open * (1 + pctMove), 0.00000001);
    const high = Math.max(open, close) * (1 + Math.abs(noise) * 0.5);
    const low = Math.min(open, close) * (1 - Math.abs(noise) * 0.5);
    const volumeJitter = 0.7 + pseudoRandom(index * 5.3) * 0.6;
    const timestamp = now - (count - index) * msStep;

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: baseVolume * volumeJitter,
    });
  }

  candles[candles.length - 1].close = latestPrice;
  candles[candles.length - 1].high = Math.max(
    candles[candles.length - 1].high,
    latestPrice,
  );
  candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, latestPrice);

  return candles;
}

export async function fetchPairMarketData(
  query: string,
  horizonMinutes: HorizonMinutes,
): Promise<PairMarketData> {
  const url = `${DEX_BASE_URL}/search?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil data dari DEX API.");
  }

  const data = (await response.json()) as DexSearchResponse;
  const pair = data.pairs?.[0];

  if (!pair || !pair.priceUsd) {
    throw new Error("Pair tidak ditemukan di DEX API.");
  }

  const latestPrice = Number(pair.priceUsd);
  if (!Number.isFinite(latestPrice) || latestPrice <= 0) {
    throw new Error("Harga pair tidak valid.");
  }

  const baseSymbol = pair.baseToken?.symbol ?? "UNKNOWN";
  const quoteSymbol = pair.quoteToken?.symbol ?? "USD";
  const pairLabel = `${baseSymbol}/${quoteSymbol} (${pair.chainId}:${pair.dexId})`;
  const realCandles = await fetchGeckoCandles(pair);
  const candles =
    realCandles && realCandles.length > 1
      ? realCandles
      : buildSyntheticCandles(latestPrice, horizonMinutes, pair);
  const normalizedLatestPrice = candles[candles.length - 1]?.close ?? latestPrice;

  return {
    pairLabel,
    latestPrice: normalizedLatestPrice,
    candles,
  };
}
