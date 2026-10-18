const AVA: ReadonlyArray<readonly [string, string]> = [
  ["#4d3a66", "#d3c2ef"],
  ["#33506a", "#aed3ef"],
  ["#2f5c46", "#a8e3c4"],
  ["#63502f", "#ecd3a2"],
  ["#63383f", "#f0b8c0"],
  ["#4f3a66", "#d3bcf0"],
  ["#2f5a56", "#a8e0d8"],
  ["#5c4638", "#e8c8b2"],
  ["#3a4868", "#b6c8ef"],
  ["#5f5433", "#e8daa8"],
  ["#4a3a66", "#c4b8ef"],
  ["#33545f", "#a8d4e4"],
];

/** 按名称算一个稳定的头像配色（同一个来源永远同色） */
export function avatarColor(host: string): { bg: string; fg: string } {
  let x = 0;
  for (let i = 0; i < host.length; i++) x = (x * 31 + host.charCodeAt(i)) >>> 0;
  const [bg, fg] = AVA[x % AVA.length];
  return { bg, fg };
}

/** 无 logo 时的首字：英文取首字母，中文取首字 */
export function monogram(host: string): string {
  const s = (host ?? "").trim();
  if (!s) return "?";
  return /^[A-Za-z]/.test(s) ? s[0].toUpperCase() : s[0];
}
