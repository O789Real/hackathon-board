import type { EventRec, MineMap } from "../types";

const KEY_MINE = "hb.mine.v3";
const KEY_CUSTOM = "hb.custom.v3";

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return (JSON.parse(raw) as T) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式下会抛，忽略即可 */
  }
}

export const loadMine = (): MineMap => loadJSON<MineMap>(KEY_MINE, {});
export const saveMine = (m: MineMap): void => saveJSON(KEY_MINE, m);
export const loadCustom = (): EventRec[] => loadJSON<EventRec[]>(KEY_CUSTOM, []);
export const saveCustom = (c: EventRec[]): void => saveJSON(KEY_CUSTOM, c);

export interface Backup {
  version: number;
  exportedAt: string;
  mine: MineMap;
  custom: EventRec[];
}

export function makeBackup(mine: MineMap, custom: EventRec[]): Backup {
  return { version: 3, exportedAt: new Date().toISOString(), mine, custom };
}
