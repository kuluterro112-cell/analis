import { NextResponse } from "next/server";

import { fetchPairMarketData } from "@/lib/dexClient";
import { buildSignal } from "@/lib/signalEngine";
import { HORIZON_OPTIONS, type AnalyzeRequest, type HorizonMinutes } from "@/types/analysis";

function isValidHorizon(value: number): value is HorizonMinutes {
  return HORIZON_OPTIONS.includes(value as HorizonMinutes);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnalyzeRequest>;
    const pairAddress = body.pairAddress?.trim();
    const horizonMinutes = Number(body.horizonMinutes);

    if (!pairAddress) {
      return NextResponse.json({ error: "Pair/token wajib diisi." }, { status: 400 });
    }

    if (!isValidHorizon(horizonMinutes)) {
      return NextResponse.json({ error: "Horizon menit tidak valid." }, { status: 400 });
    }

    const marketData = await fetchPairMarketData(pairAddress, horizonMinutes);
    const signal = buildSignal(marketData.candles, horizonMinutes);

    return NextResponse.json({
      direction: signal.direction,
      confidence: signal.confidence,
      reasons: signal.reasons,
      timestamp: new Date().toISOString(),
      latestPrice: marketData.latestPrice,
      predictedPrice: signal.predictedPrice,
      predictedMinPrice: signal.predictedMinPrice,
      predictedMaxPrice: signal.predictedMaxPrice,
      aiDebate: signal.aiDebate,
      pairLabel: marketData.pairLabel,
      candles: marketData.candles,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat memproses analisa.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
