export function parseExcelDate(val: unknown): Date {
  if (val instanceof Date && !isNaN(val.getTime())) return val;

  if (typeof val === "number") {
    const d = new Date((new Date(1899, 11, 30)).getTime() + val * 86400000);
    if (d.getFullYear() > 1900 && d.getFullYear() < 2100) return d;
  }

  if (typeof val === "string") {
    const monthMap: Record<string, string> = {
      jan: "jan", feb: "feb", mar: "mar", apr: "apr",
      mei: "may", jun: "jun", jul: "jul", ags: "aug", agu: "aug",
      sep: "sep", okt: "oct", nov: "nov", des: "dec",
    };
    let normalized = val.trim();
    for (const [idEn, en] of Object.entries(monthMap)) {
      normalized = normalized.replace(new RegExp(`\\b${idEn}\\b`, "gi"), en);
    }
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) return parsed;

    // fallback: DD-MM-YYYY or YYYY-MM-DD
    const d = new Date(normalized.replace(/(\d{2})[-/](\d{2})[-/](\d{4})/, "$3-$2-$1"));
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

export function parseExcelTransmisi(val: unknown): string {
  const raw = (val ?? "").toString().trim();
  if (raw === "M/T") return "Manual";
  if (raw === "A/T") return "Automatic";
  return raw || "Automatic";
}

export function parseExcelTahun(val: unknown): number {
  if (typeof val === "number") {
    if (val > 1900 && val < 2100) return val;
    return parseExcelDate(val).getFullYear();
  }
  if (typeof val === "string") {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 1900 && n < 2100) return n;
    return parseExcelDate(val).getFullYear();
  }
  return new Date().getFullYear();
}

export function parseExcelNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export function parseExcelCurrency(val: unknown): number {
  if (typeof val === "number") {
    return val < 1000 ? val * 1000000 : val;
  }
  if (typeof val === "string") {
    const cleanStr = val.replace(/[^0-9]/g, "");
    const parsed = parseInt(cleanStr, 10);
    if (isNaN(parsed)) return 0;
    return parsed < 1000 ? parsed * 1000000 : parsed;
  }
  return 0;
}