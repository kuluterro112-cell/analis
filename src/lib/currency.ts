const DEFAULT_USD_TO_IDR_RATE = 16_000;

export const USD_TO_IDR_RATE = Number(process.env.NEXT_PUBLIC_USD_TO_IDR_RATE ?? DEFAULT_USD_TO_IDR_RATE);

export function usdToIdr(usd: number) {
  return usd * USD_TO_IDR_RATE;
}

export function formatUsd(value: number, maximumFractionDigits = 8) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

export function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
