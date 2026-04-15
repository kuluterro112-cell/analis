export const HORIZON_OPTIONS = [5, 10, 15, 30] as const;

export type HorizonMinutes = (typeof HORIZON_OPTIONS)[number];

export type Direction = "up" | "down" | "sideways";
export type ChartType = "line" | "candle";

export interface AIDebateOpinion {
  aiName: string;
  style: string;
  direction: Direction;
  confidence: number;
  argument: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AnalyzeRequest {
  pairAddress: string;
  horizonMinutes: HorizonMinutes;
}

export interface AnalyzeResponse {
  direction: Direction;
  confidence: number;
  reasons: string[];
  timestamp: string;
  latestPrice: number;
  predictedPrice: number;
  predictedMinPrice: number;
  predictedMaxPrice: number;
  aiDebate: AIDebateOpinion[];
  pairLabel: string;
  candles: Candle[];
}
