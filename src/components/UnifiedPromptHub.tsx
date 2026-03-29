import { useState } from "react";
import PromptGenerator from "@/components/PromptGenerator";
import ImagePromptGenerator from "@/components/ImagePromptGenerator";
import { hasOpenAIKey } from "@/lib/openai";
import { useApp } from "@/contexts/AppContext";

type Engine = "gemini" | "claude" | "openai";

const engineConfig = {
  gemini: {
    label: "Gemini",
    icon: "💎",
    gradient: "from-blue-500 to-cyan-400",
    activeClass: "bg-gradient-to-r from-blue-600/20 to-cyan-500/15 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10",
    desc: "Gemini 2.0 Flash — سريع وذكي مع دعم كامل للصور والفيديو",
  },
  claude: {
    label: "Claude",
    icon: "🟣",
    gradient: "from-amber-500 to-orange-400",
    activeClass: "bg-gradient-to-r from-amber-600/15 to-orange-500/10 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10",
    desc: "Claude 3.5 — إبداعي ومتقن في التفاصيل البصرية",
  },
  openai: {
    label: "OpenAI",
    icon: "🟢",
    gradient: "from-emerald-500 to-green-400",
    activeClass: "bg-gradient-to-r from-emerald-600/15 to-green-500/10 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10",
    desc: "GPT-4o Mini — سريع واقتصادي مع جودة ممتازة",
  },
};

export default function UnifiedPromptHub() {
  const [engine, setEngine] = useState<Engine>("gemini");
  const { hasApiKey } = useApp();

  return (
    <div className="animate-fade-in space-y-5">
      {/* Engine Selector Card */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                🤖 مولد موحد (Gemini + Claude + OpenAI)
              </h2>
              <p className="text-[11px] text-slate-500 mt-1">
                جميع ميزات المولدين في خانة واحدة مع تبديل داخلي للمحرك.
              </p>
            </div>
          </div>

          {/* Engine Toggle */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(engineConfig) as Engine[]).map((eng) => {
              const config = engineConfig[eng];
              const isActive = engine === eng;
              const isAvailable = eng === "gemini"
                ? hasApiKey("gemini")
                : eng === "claude"
                ? hasApiKey("claude")
                : hasOpenAIKey();

              return (
                <button
                  key={eng}
                  onClick={() => setEngine(eng)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    isActive
                      ? config.activeClass
                      : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:bg-white/[0.04] hover:text-slate-300 hover:border-white/[0.12]"
                  }`}
                >
                  <span className={`text-base ${isActive ? "scale-110" : ""} transition-transform`}>
                    {config.icon}
                  </span>
                  <span>{config.label}</span>
                  {!isAvailable && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                      🔑
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-current opacity-60" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Engine Description */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600">
            <span className="text-sm">{engineConfig[engine].icon}</span>
            <span>{engineConfig[engine].desc}</span>
          </div>
        </div>
      </div>

      {/* Prompt Generator based on selected engine */}
      {engine === "gemini" && <PromptGenerator />}
      {engine === "claude" && <ImagePromptGenerator />}
      {engine === "openai" && <OpenAIPromptView />}
    </div>
  );
}

// ── OpenAI Prompt Generator View ──
import { generateOpenAIStockPrompts, type OpenAIStockPrompt } from "@/lib/openai";
import { toast } from "sonner";
import { copyTextSafely, exportCsvFile } from "@/lib/shared";

const CATEGORIES = [
  "Nature", "Technology", "Food", "Business", "Science",
  "Travel", "Architecture", "Sports", "Fashion", "Abstract Concepts",
  "Sustainability", "Cooking",
];

const TREND_TAGS = [
  "AI Visuals", "Clean Backgrounds", "Minimalism", "Loop Animation",
  "Holographic", "Particle Systems", "UI Elements", "Biophilic Design",
];

function OpenAIPromptView() {
  const [category, setCategory] = useState("Nature");
  const [count, setCount] = useState(5);
  const [outputType, setOutputType] = useState<"image" | "video" | "both">("both");
  const [competition, setCompetition] = useState("medium");
  const [selectedTrends, setSelectedTrends] = useState<string[]>(["AI Visuals"]);
  const [topicHint, setTopicHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OpenAIStockPrompt[]>([]);

  const toggleTrend = (tag: string) => {
    setSelectedTrends((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = async () => {
    if (!hasOpenAIKey()) {
      toast.error("أضف مفتاح OpenAI API أولاً من الإعدادات ⚙️");
      return;
    }
    setLoading(true);
    try {
      const res = await generateOpenAIStockPrompts(
        category, count, outputType, selectedTrends, competition, topicHint || undefined
      );
      setResults(res);
      toast.success(`✅ تم توليد ${res.length} برومبت عبر OpenAI`);
    } catch (err: any) {
      toast.error(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    const ok = await copyTextSafely(text);
    if (ok) toast.success("تم النسخ!");
  };

  const handleExport = () => {
    if (results.length === 0) return;
    exportCsvFile(
      `openai_prompts_${Date.now()}.csv`,
      ["#", "Category", "Type", "Title", "Prompt", "Keywords"],
      results.map((r) => [
        String(r.number), r.category, r.type,
        r.title || "", r.prompt, (r.keywords || []).join(", ")
      ])
    );
    toast.success("📥 تم التصدير!");
  };

  return (
    <div className="space-y-5">
      {/* Config Card */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 relative overflow-hidden">
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h3 className="text-base font-bold text-emerald-400 mb-1 flex items-center gap-2">
            🟢 مولد برومبتات OpenAI (محسّن)
          </h3>
          <p className="text-[10px] text-slate-500 mb-5">
            وضع متقدم مثل Claude • التزام صارم بقانونية Adobe • صور وفيديو وكلمات مفتاحية
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">اختر الفئة:</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2.5 rounded-xl">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">عناوين متعددة (اختياري):</label>
              <input
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                placeholder="اكتب عنواناً ثم اضغط +"
                className="w-full bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2.5 rounded-xl placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">عدد البرومبتات:</label>
              <select value={count} onChange={(e) => setCount(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2.5 rounded-xl">
                {[1, 3, 5, 8, 10].map((n) => <option key={n} value={n}>{n} برومبتات</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">نوع المخرجات:</label>
              <div className="flex gap-1.5">
                {(["image", "video", "both"] as const).map((t) => (
                  <button key={t} onClick={() => setOutputType(t)}
                    className={`flex-1 text-[11px] py-2 rounded-xl border transition-all ${outputType === t ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-slate-300"}`}>
                    {t === "image" ? "📷 صور" : t === "video" ? "🎬 فيديو" : "⚡ تلقائي"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1.5">المنافسة:</label>
              <select value={competition} onChange={(e) => setCompetition(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] text-xs text-white px-3 py-2.5 rounded-xl">
                <option value="low">منخفضة (نيتش)</option>
                <option value="medium">متوسطة</option>
                <option value="avoid-high">تجنب العالية</option>
              </select>
            </div>
          </div>

          {/* Trend Tags */}
          <div className="mb-5">
            <label className="text-[11px] text-emerald-400 block mb-1.5">تراندات 2026:</label>
            <div className="flex flex-wrap gap-1.5">
              {TREND_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTrend(tag)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                    selectedTrends.includes(tag)
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.02] border-white/[0.06] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold text-sm hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/20"
          >
            {loading ? "⏳ جاري التوليد عبر OpenAI..." : "🚀 توليد برومبتات OpenAI"}
          </button>
        </div>
      </div>

      {/* Prompt Format (sidebar info) */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">📋 صيغة البرومبت</h4>
        <div className="space-y-1.5 text-[11px] text-slate-500">
          <p>🎯 Subject - الموضوع الرئيسي</p>
          <p>🌍 Environment - البيئة والخلفية</p>
          <p>💡 Professional Lighting - إضاءة احترافية</p>
          <p>📸 Camera Movement - حركة الكاميرا</p>
          <p>⚡ Motion Speed - سرعة الحركة</p>
          <p>⏱️ Duration - مدة المشهد</p>
          <p>🎨 Technical Style - النمط الفني</p>
          <p>📈 Commercial Appeal - جاذبية تجارية</p>
          <p>🚫 Negative Constraints - قيود سلبية</p>
        </div>
        <div className="mt-3 text-[9px] text-emerald-400 font-mono">
          4K (3840×2160) | 24-30fps | 15-30s ⚡
        </div>
        <div className="mt-1 text-[9px] text-slate-600">
          📂 الفئات: 16 فئة متاحة
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              ✅ {results.length} برومبت تم توليده
            </h3>
            <div className="flex gap-2">
              <button onClick={() => handleCopy(results.map(r => r.prompt).join("\n\n---\n\n"))}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 hover:text-white transition-all">
                📋 نسخ الكل
              </button>
              <button onClick={handleExport}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white text-xs font-semibold hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                📥 تصدير CSV
              </button>
            </div>
          </div>

          {results.map((res, i) => (
            <div key={i} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold">
                    #{res.number}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500">
                    {res.type === "video" ? "🎬 فيديو" : "📷 صورة"}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(res.prompt)}
                  className="text-[9px] px-2 py-1 rounded-lg bg-white/[0.06] text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  📋 نسخ
                </button>
              </div>
              {res.title && (
                <p className="text-xs font-semibold text-emerald-400 mb-1.5">📌 {res.title}</p>
              )}
              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-4">{res.prompt}</p>
              {res.keywords && res.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {res.keywords.slice(0, 10).map((kw, ki) => (
                    <span key={ki} className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-500 px-1.5 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                  {res.keywords.length > 10 && <span className="text-[9px] text-slate-600">+{res.keywords.length - 10}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
