import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Jakarta");

export function formatDate(
  date: Date | string | null,
  formatStr = "DD/MM/YYYY"
): string {
  if (!date) return "-";
  return dayjs(date).tz("Asia/Jakarta").format(formatStr);
}

export function formatDateTime(
  date: Date | string | null,
  formatStr = "DD/MM/YYYY HH:mm"
): string {
  if (!date) return "-";
  return dayjs(date).tz("Asia/Jakarta").format(formatStr);
}

export function parseToWibDate(dateStr: string | Date): Date {
  return dayjs.tz(dateStr, "Asia/Jakarta").startOf("day").toDate();
}

export function parseToWibDateTime(dateStr: string | Date): Date {
  return dayjs.tz(dateStr, "Asia/Jakarta").toDate();
}