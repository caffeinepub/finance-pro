/**
 * Converts a date string (YYYY-MM-DD or ISO) to DD-MM-YYYY display format.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Returns today's date in IST as YYYY-MM-DD
 */
export function getTodayIST(): string {
  const now = new Date();
  // IST = UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().slice(0, 10);
}

/**
 * Adds N days to a YYYY-MM-DD string, returns YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
