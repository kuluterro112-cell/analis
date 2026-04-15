import { NextResponse } from "next/server";

interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  price_change_percentage_24h: number | null;
}

interface TopGainerItem {
  id: string;
  symbol: string;
  change24h: number;
}

export async function GET() {
  try {
    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=12&page=1&sparkline=false&price_change_percentage=24h";
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Gagal mengambil data top gainers." }, { status: 500 });
    }

    const markets = (await response.json()) as CoinGeckoMarketItem[];
    const gainers: TopGainerItem[] = markets
      .filter((coin) => typeof coin.price_change_percentage_24h === "number")
      .map((coin) => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        change24h: Number(coin.price_change_percentage_24h ?? 0),
      }))
      .slice(0, 8);

    return NextResponse.json({ gainers });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan saat mengambil top gainers." }, { status: 500 });
  }
}
