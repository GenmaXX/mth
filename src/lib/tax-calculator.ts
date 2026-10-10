export interface TaxBreakdown {
  dpp: number;
  ppn: number;
  pph: number;
  total: number;
}

export function calculatePpn(dpp: number, rate = 0.11): number {
  return Math.round(dpp * rate);
}

export function calculatePph23(dpp: number, rate = 0.02): number {
  return Math.round(dpp * rate);
}

export function calculateDppNilaiLain(
  grossAmount: number,
  percentage: number = 10
): number {
  return Math.round(grossAmount * (percentage / 100));
}

export function calculateInvoiceTax(
  grossAmount: number,
  dppPercentage: number = 10
): TaxBreakdown {
  const dpp = calculateDppNilaiLain(grossAmount, dppPercentage);
  const ppn = calculatePpn(dpp);
  const pph = calculatePph23(dpp);
  const total = dpp + ppn;
  return { dpp, ppn, pph, total };
}

export function formatRupiah(amount: number | { toString(): string }): string {
  const num = typeof amount === "number" ? amount : Number(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}