import { useState } from "react";
import { generateGeminiStockPrompts, hasAnyApiKey } from "@/lib/gemini";
import { generateStockPrompts, hasClaudeKey } from "@/lib/claude";
import { generateOpenAIStockPrompts, hasOpenAIKey } from "@/lib/openai";
import { toast } from "sonner";
import { copyTextSafely, exportCsvFile } from "@/lib/shared";
import { trackAiMetric } from "@/lib/aiMetrics";

interface BattleResult {
  engine: string;
  prompts: { prompt: string; title?: string; keywords?: string[] }[];
  time: number;
  error?: string;
  score?: number;
}

const CATEGORIES = [
  "Nature", "Technology", "Food", "Cooking", "Abstract Concepts",
  "Sustainability", "Business", "Science", "Travel",
  "Architecture", "Sports", "Fashion",
];

export default function AIBattle() {
  const [category, setCategory] = useState("Nature");
  const [count, setCount] = useState(3);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BattleResult[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  const availableEngines = [
    { id: "gemini", name: "Gemini", icon: "💎", available: hasAnyApiKey(), color: "blue" },
    { id: "claude", name: "Claude", icon: "🟣", available: hasClaudeKey(), color: "amber" },
    { id: "openai", name: "OpenAI", icon: "🟢", available: hasOpenAIKey(), color: "emerald" },
  ];

  const activeEngines = availableEngines.filter((e) => e.available);

  const handleBattle = async () => {
    if (activeEngines.length === 0) {
      toast.error("🔑 أضف مفتاح API واحد على الأقل من الإعدادات");
      return;
    }
    if (activeEngines.length < 2) {
      toast.error("⚔️ المعركة تتطلب محركين على الأقل! أضف مفتاح API آخر من الإعدادات.");
      return;
    }

    setRunning(true);
    setResults([]);
    setWinner(null);

    const promises: Promise<BattleResult>[] = [];

    // Gemini
    if (hasAnyApiKey()) {
      promises.push(
        (async (): Promise<BattleResult> => {
          const start = performance.now();
          try {
            const res = await generateGeminiStockPrompts(category, count, "both", ["AI Visuals"], "medium");
            trackAiMetric("gemini", "prompts", "success");
            return { engine: "Gemini", prompts: res as any, time: Math.round(performance.now() - start) };
          } catch (e: any) {
            trackAiMetric("gemini", "prompts", "failure");
            return { engine: "Gemini", prompts: [], time: Math.round(performance.now() - start), error: e.message };
          }
        })()
      );
    }

    // Claude
    if (hasClaudeKey()) {
      promises.push(
        (async (): Promise<BattleResult> => {
          const start = performance.now();
          try {
            const res = await generateStockPrompts(category, count, "both", ["AI Visuals"], "medium");
            trackAiMetric("claude", "prompts", "success");
            return { engine: "Claude", prompts: res as any, time: Math.round(performance.now() - start) };
          } catch (e: any) {
            trackAiMetric("claude", "prompts", "failure");
            return { engine: "Claude", prompts: [], time: Math.round(performance.now() - start), error: e.message };
          }
        })()
      );
    }

    // OpenAI
    if (hasOpenAIKey()) {
      promises.push(
        (async (): Promise<BattleResult> => {
          const start = performance.now();
          try {
            const res = await generateOpenAIStockPrompts(category, count, "both", ["AI Visuals"], "medium");
            trackAiMetric("openai", "prompts", "success");
            return { engine: "OpenAI", prompts: res as any, time: Math.round(performance.now() - start) };
          } catch (e: any) {
            trackAiMetric("openai", "prompts", "failure");
            return { engine: "OpenAI", prompts: [], time: Math.round(performance.now() - start), error: e.message };
          }
        })()
      );
    }

    const battleResults = await Promise.all(promises);

    // Calculate scores
    const scored = battleResults.map((r) => {
      if (r.error || r.prompts.length === 0) return { ...r, score: 0 };
      const promptQuality = r.prompts.length * 100;
      const speedBonus = Math.max(0, 50 - (r.time / 200));
      const detailBonus = r.prompts.reduce((sum, p) => sum + Math.min(50, (p.prompt?.length || 0) / 5), 0);
      const keywordBonus = r.prompts.reduce((sum, p) => sum + ((p.keywords?.length || 0) * 3), 0);
      return { ...r, score: Math.round(promptQuality + speedBonus + detailBonus + keywordBonus) };
    });

    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    setResults(scored);

    const valid = scored.filter((r) => !r.error && r.prompts.length > 0);
    if (valid.length > 0) {
      setWinner(valid[0].engine);
    }

    setRunning(false);
    toast.success(`⚔️ المعركة انتهت! ${battleResults.length} محركات تم اختبارها.`);
  };

  const handleCopy = async (text: string) => {
    const ok = await copyTextSafely(text);
    if (ok) toast.success("تم النسخ!");
  };

  const handleExportAll = () => {
    const allPrompts = results.flatMap((r) =>
      r.prompts.map((p, i) => [
        r.engine, String(i + 1), p.title || "", p.prompt,
        (p.keywords || []).join(", "), `${(r.time / 1000).toFixed(1)}s`
      ])
    );
    if (allPrompts.length === 0) return;
    exportCsvFile(
      `ai_battle_${Date.now()}.csv`,
      ["Engine", "#", "Title", "Prompt", "Keywords", "Time"],
      allPrompts
    );
    toast.success("📥 تم تصدير نتائج المعركة!");
  };

  const engineColors: Record<string, { border: string; bg: string; text: string; glow: string; ring: string }> = {
    Gemini: { border: "border-blue-500/20", bg: "bg-blue-500/[0.04]", text: "text-blue-400", glow: "shadow-blue-500/10", ring: "ring-blue-500/30" },
    Claude: { border: "border-amber-500/20", bg: "bg-amber-500/[0.04]", text: "text-amber-400", glow: "shadow-amber-500/10", ring: "ring-amber-500/30" },
    OpenAI: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", text: "text-emerald-400", glow: "shadow-emerald-500/10", ring: "ring-emerald-500/30" },
  };

  const engineIcons: Record<string, string> = { Gemini: "💎", Claude: "🟣", OpenAI: "🟢" };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Config */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">⚔️ مقارنة المحركات (AI Battle)</h2>
          <p className="text-[11px] text-slate-500 mb-5">شغّل نفس الطلب على جميع محركات AI بالتوازي وقارن النتائج جنباً إلى جنب</p>

          {/* Available engines indicator */}
          <div className="flex flex-wrap gap-2 mb-5">
            {availableEngines.map((eng) => (
              <div key={eng.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] ${
                eng.available
                  ? `bg-${eng.color}-500/5 border-${eng.color}-500/20 text-${eng.color}-400`
                  : "bg-white/[0.02] border-white/[0.06] text-slate-600 opacity-50"
              }`}>
                <span>{eng.icon}</span>
                <span className="font-semibold">{eng.name}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${eng.available ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                  {eng.available ? "✓ جاهز" : "✗ غير مفعل"}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">الفئة</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2.5 rounded-xl">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">عدد البرومبتات</label>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2.5 rounded-xl">
                {[1, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleBattle}
                disabled={running || activeEngines.length < 2}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
              >
                {running ? "⏳ جاري المقارنة..." : `⚔️ ابدأ المعركة! (${activeEngines.length} محركات)`}
              </button>
            </div>
          </div>

          {/* Running animation */}
          {running && (
            <div className="flex items-center justify-center gap-6 py-6">
              {activeEngines.map((eng) => (
                <div key={eng.id} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center animate-pulse">
                    <span className="text-2xl">{eng.icon}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{eng.name}</span>
                  <div className="h-1 w-12 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Export all button */}
          <div className="flex justify-end">
            <button onClick={handleExportAll}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold hover:scale-105 transition-all shadow-lg shadow-purple-500/20">
              📥 تصدير كل النتائج CSV
            </button>
          </div>

          {/* Score Summary Bar */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
            <h3 className="text-xs font-semibold text-slate-300 mb-3">📊 ملخص النتائج</h3>
            <div className="space-y-2">
              {results.map((r) => {
                const colors = engineColors[r.engine] || engineColors.Gemini;
                const maxScore = Math.max(...results.map((x) => x.score || 1));
                const pct = Math.round(((r.score || 0) / maxScore) * 100);
                return (
                  <div key={r.engine} className="flex items-center gap-3">
                    <span className="text-base w-6 shrink-0 text-center">{engineIcons[r.engine]}</span>
                    <span className={`text-xs font-semibold w-16 ${colors.text}`}>{r.engine}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          r.engine === winner ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-slate-600 to-slate-500"
                        }`}
                        style={{ width: `${r.error ? 0 : pct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold w-14 text-right ${winner === r.engine ? "text-amber-400" : "text-slate-500"}`}>
                      {r.error ? "❌" : r.score} pt
                    </span>
                    {winner === r.engine && <span className="text-xs animate-pulse">👑</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Cards */}
          <div className={`grid grid-cols-1 ${results.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-4`}>
            {results.map((result) => {
              const colors = engineColors[result.engine] || engineColors.Gemini;
              const isWinner = winner === result.engine;

              return (
                <div
                  key={result.engine}
                  className={`rounded-2xl border p-5 transition-all ${colors.border} ${colors.bg} ${isWinner ? `shadow-xl ${colors.glow} ring-1 ring-offset-0 ${colors.ring}` : ""}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{engineIcons[result.engine]}</span>
                      <h3 className={`text-sm font-bold ${colors.text}`}>{result.engine}</h3>
                      {isWinner && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold animate-pulse">
                          👑 الفائز
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ⏱ {(result.time / 1000).toFixed(1)}s • {result.prompts.length} نتيجة
                    </div>
                  </div>

                  {result.error ? (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                      ❌ {result.error}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {result.prompts.map((p, i) => (
                        <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 group">
                          <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">{p.prompt}</p>
                          {p.title && <p className="text-[10px] text-blue-400 mt-1.5 font-semibold">📌 {p.title}</p>}
                          {p.keywords && p.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {p.keywords.slice(0, 6).map((kw, ki) => (
                                <span key={ki} className="text-[8px] bg-white/[0.04] text-slate-600 px-1 py-0.5 rounded">{kw}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCopy(p.prompt)} className="text-[9px] px-2 py-1 rounded-lg bg-white/[0.06] text-slate-500 hover:text-white transition-colors">
                              📋 نسخ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
