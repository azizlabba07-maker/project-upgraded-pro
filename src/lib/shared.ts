/**
 * Shared utility functions — eliminates duplication across components.
 */

// ── Clipboard ──
export async function copyTextSafely(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

// ── CSV Export ──
export function exportCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  cellTransform?: (v: string) => string
): void {
  const esc = (v: any) => {
    let s = String(v);
    if (cellTransform) s = cellTransform(s);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header = headers.join(",");
  const body = rows.map((row) => row.map(esc).join(",")).join("\n");
  const csv = [header, body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Date & Time ──
export function formatTimeAr(): string {
  return new Date().toLocaleTimeString("ar-EG");
}

export function formatDateAr(): string {
  return new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "الآن";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

// ── Debounce ──
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── Random helpers ──
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Storage helpers ──
export function getStorageJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorageJSON(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// ── Number formatting ──
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("ar-EG");
}

// ── Season helper ──
export function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "الربيع 🌸";
  if (month >= 5 && month <= 7) return "الصيف ☀️";
  if (month >= 8 && month <= 10) return "الخريف 🍂";
  return "الشتاء ❄️";
}

// ── Prompt history ──
export interface PromptHistoryEntry {
  id: string;
  prompt: string;
  title?: string;
  keywords?: string[];
  category: string;
  type: string;
  engine: "gemini" | "claude" | "openai" | "local";
  timestamp: number;
  favorite: boolean;
}

const PROMPT_HISTORY_KEY = "prompt_history_v2";
const MAX_HISTORY = 500;

export function getPromptHistory(): PromptHistoryEntry[] {
  return getStorageJSON<PromptHistoryEntry[]>(PROMPT_HISTORY_KEY, []);
}

export function addToPromptHistory(entries: Omit<PromptHistoryEntry, "id" | "timestamp" | "favorite">[]): void {
  const history = getPromptHistory();
  const newEntries: PromptHistoryEntry[] = entries.map((e) => ({
    ...e,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    favorite: false,
  }));
  const updated = [...newEntries, ...history].slice(0, MAX_HISTORY);
  setStorageJSON(PROMPT_HISTORY_KEY, updated);
}

export function togglePromptFavorite(id: string): void {
  const history = getPromptHistory();
  const updated = history.map((h) => (h.id === id ? { ...h, favorite: !h.favorite } : h));
  setStorageJSON(PROMPT_HISTORY_KEY, updated);
}

export function deletePromptHistoryEntry(id: string): void {
  const history = getPromptHistory();
  setStorageJSON(PROMPT_HISTORY_KEY, history.filter((h) => h.id !== id));
}

export function clearPromptHistory(): void {
  setStorageJSON(PROMPT_HISTORY_KEY, []);
}
