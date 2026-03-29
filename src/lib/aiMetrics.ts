type Engine = "gemini" | "claude" | "openai" | "local";
type Action = "prompts" | "keywords" | "analysis";
type Status = "success" | "failure";

interface MetricCounter {
  success: number;
  failure: number;
}

interface DayMetrics {
  day: string;
  engines: Record<Engine, MetricCounter>;
  actions: Record<Action, MetricCounter>;
  total: MetricCounter;
}

const STORAGE_KEY = "ai_metrics_daily_v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createCounter(): MetricCounter {
  return { success: 0, failure: 0 };
}

function createDayMetrics(day: string): DayMetrics {
  return {
    day,
    engines: {
      gemini: createCounter(),
      claude: createCounter(),
      openai: createCounter(),
      local: createCounter(),
    },
    actions: {
      prompts: createCounter(),
      keywords: createCounter(),
      analysis: createCounter(),
    },
    total: createCounter(),
  };
}

function readAll(): Record<string, DayMetrics> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, DayMetrics>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function trackAiMetric(engine: Engine, action: Action, status: Status) {
  const all = readAll();
  const day = todayKey();
  const row = all[day] || createDayMetrics(day);
  row.engines[engine][status] += 1;
  row.actions[action][status] += 1;
  row.total[status] += 1;
  all[day] = row;
  writeAll(all);
}

export function getTodayAiMetrics(): DayMetrics {
  const all = readAll();
  return all[todayKey()] || createDayMetrics(todayKey());
}

export function calcSuccessRate(counter: MetricCounter): number {
  const total = counter.success + counter.failure;
  if (total === 0) return 0;
  return Math.round((counter.success / total) * 100);
}
