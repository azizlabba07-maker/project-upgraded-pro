type PortfolioEntry = {
  category?: string;
  status?: "pending" | "approved" | "rejected" | "selling";
  keywords?: string;
};

const PORTFOLIO_STORAGE_KEY = "portfolio_entries_v1";

function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 1);
}

function loadPortfolioEntries(): PortfolioEntry[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPromptEvolutionHint(category?: string): string {
  const entries = loadPortfolioEntries();
  if (entries.length === 0) return "";

  const scope = category
    ? entries.filter((e) => (e.category || "").toLowerCase().includes(category.toLowerCase()))
    : entries;
  if (scope.length === 0) return "";

  const positive = new Map<string, number>();
  const negative = new Map<string, number>();

  for (const entry of scope) {
    const kws = parseKeywords(entry.keywords);
    const isPositive = entry.status === "selling" || entry.status === "approved";
    const isNegative = entry.status === "rejected";
    for (const kw of kws) {
      if (isPositive) positive.set(kw, (positive.get(kw) || 0) + 1);
      if (isNegative) negative.set(kw, (negative.get(kw) || 0) + 1);
    }
  }

  const topPositive = [...positive.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([kw]) => kw);
  const topNegative = [...negative.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([kw]) => kw);

  if (topPositive.length === 0 && topNegative.length === 0) return "";

  const positiveHint = topPositive.length > 0 ? `Prioritize keywords: ${topPositive.join(", ")}.` : "";
  const negativeHint = topNegative.length > 0 ? `Avoid weak/rejected patterns: ${topNegative.join(", ")}.` : "";
  return [positiveHint, negativeHint].filter(Boolean).join(" ");
}

