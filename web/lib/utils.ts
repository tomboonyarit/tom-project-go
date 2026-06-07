/**
 * Format satang (smallest unit) to Thai Baht display string.
 * e.g., 10000 → "฿100.00", 15050 → "฿150.50", 0 → "฿0.00"
 */
export function formatBaht(satang: number): string {
  const baht = satang / 100;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(baht);
}

/**
 * Parse a Thai Baht display string back to satang.
 * e.g., "฿100.00" → 10000, "150.50" → 15050
 */
export function parseBahtToSatang(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = value.replace(/[฿,]/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert baht (decimal) to satang
 */
export function bahtToSatang(baht: number): number {
  return Math.round(baht * 100);
}

/**
 * Format a date string or Date to Thai display
 */
export function formatThaiDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a time string or Date to Thai time display
 */
export function formatThaiTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function todayISO(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

/**
 * Get current month as YYYY-MM
 */
export function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
