export const DAY = 86_400_000;

export function endOf(date: string): Date | null {
  const d = new Date(`${date}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(date?: string | null): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}.${m}.${day}`;
}

export function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function daysLeft(date?: string | null): number | null {
  const e = date ? endOf(date) : null;
  if (!e) return null;
  return Math.floor((e.getTime() - Date.now()) / DAY);
}

export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 倒计时展示文案：返回文本 + 强调等级 */
export function deadlineText(dl: string | null | undefined, fallback: string): { text: string; tone: "" | "soon" | "due" } {
  if (!dl) return { text: fallback || "常年", tone: "" };
  const d = daysLeft(dl);
  if (d === null) return { text: fmtDate(dl), tone: "" };
  if (d < 0) return { text: "已截止", tone: "" };
  if (d === 0) return { text: "今天截止", tone: "soon" };
  if (d <= 7) return { text: `剩 ${d} 天`, tone: "soon" };
  if (d <= 30) return { text: `剩 ${d} 天`, tone: "due" };
  return { text: `剩 ${d} 天`, tone: "" };
}
