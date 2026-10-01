const rtf = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function relativeTime(input: string | number | Date | null | undefined, now = Date.now()) {
  if (input === null || input === undefined) return "—";
  const time = new Date(input).getTime();
  if (Number.isNaN(time)) return "—";
  const seconds = Math.round((time - now) / 1000);
  if (Math.abs(seconds) < 45) return "刚刚";
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), "minute");
}

export function absoluteTime(input: string | number | Date | null | undefined) {
  if (!input) return "—";
  const date = new Date(input);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** ep-1234…cdef — enough to recognise, not enough to use. */
export function maskKey(key: string) {
  if (key.length <= 14) return key;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export function keyTail(key: string) {
  return key.slice(-4);
}
