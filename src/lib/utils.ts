import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function formatAed(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
  }).format(num);
}

// 1 USD = 3.6725 AED
export const USD_AED_RATE = parseFloat(process.env.NEXT_PUBLIC_USD_AED_RATE || "3.6725");
export const FEE_BPS = 15; // 0.15%

export function usdToAed(usd: number): number {
  return usd * USD_AED_RATE;
}

export function aedToUsd(aed: number): number {
  return aed / USD_AED_RATE;
}

/**
 * Calculate total AED the user pays (including 15bps fee on top)
 * e.g. $10 → 36.725 AED base → + 0.15% = 36.725 + 0.055 = 36.78 AED
 */
export function usdToAedWithFee(usd: number): {
  baseAed: number;
  fee: number;
  totalAed: number;
  rate: number;
  feeBps: number;
} {
  const baseAed = usd * USD_AED_RATE;
  const fee = baseAed * (FEE_BPS / 10000);
  return {
    baseAed,
    fee,
    totalAed: baseAed + fee,
    rate: USD_AED_RATE,
    feeBps: FEE_BPS,
  };
}

/**
 * Convert AED paid (including fee) back to net USD
 */
export function aedToUsdNet(aedPaid: number): {
  grossAed: number;
  fee: number;
  netAed: number;
  netUsd: number;
  rate: number;
} {
  // aedPaid = baseAed * (1 + feeBps/10000)
  const netAed = aedPaid / (1 + FEE_BPS / 10000);
  const fee = aedPaid - netAed;
  const netUsd = netAed / USD_AED_RATE;
  return {
    grossAed: aedPaid,
    fee,
    netAed,
    netUsd,
    rate: USD_AED_RATE,
  };
}
