import { useMemo, useState } from "react";
import { checklistItems, type MarketTrend } from "@/data/marketData";
import { ADOBE_IMAGE_NEGATIVE_SUFFIX, ADOBE_VIDEO_NEGATIVE_SUFFIX, ADOBE_SUBMISSION_REMINDERS } from "@/lib/adobeStockCompliance";
import { toast } from "sonner";
import {
  generateStockPrompts,
  getClaudeMarketAnalysis,
  hasClaudeKey,
  type StockImagePrompt,
} from "@/lib/claude";
import {
  generateAIKeywords,
  generateGeminiStockPrompts,
  getAIMarketAnalysis,
  hasAnyApiKey,
  getGeminiErrorUserMessage,
  classifyGeminiError,
} from "@/lib/gemini";
import { getPromptEvolutionHint } from "@/lib/promptEvolution";

type OutputType = "image" | "video" | "both" | "greenscreen";
type CompetitionStrategy = "low" | "medium" | "avoid-high";

const OUTPUT_TYPE_OPTIONS: { value: OutputType; label: string }[] = [
  { value: "image", label: "📷 صور" },
  { value: "video", label: "🎬 فيديو" },
  { value: "both", label: "⚡ كلاهما" },
  { value: "greenscreen", label: "🟢 Green Screen" },
];

// Enhanced trends for 2026 with more categories
const TRENDS_2026 = [
  "AI Visuals",
  "Minimalism",
  "Clean Backgrounds",
  "Loop Animation",
  "UI Elements",
  "Particle Systems",
  "Holographic",
  "Biophilic Design",
  "Flat Lay",
  "Isometric 3D",
  "Dark Mode Aesthetic",
  "Social Media Assets",
  "Neon Cyberpunk",
  "Sustainable Living",
  "Mental Health",
  "Remote Work",
  "Digital Nomad",
  "Smart Home",
  "Electric Vehicles",
  "Space Tourism",
  "Quantum Computing",
  "AR/VR Experiences",
  "NFT Art",
  "Metaverse",
  "Biohacking",
  "Urban Farming",
  "Circular Economy",
  "Digital Wellness",
  "AI Ethics",
  "Climate Tech"
];

const MARKET_CATEGORY_TO_UI_CATEGORY: Record<string, string> = {
  AI: "Technology & AI",
  Sustainability: "Sustainability & Green Energy",
  Work: "Business & Finance",
  Wellness: "Health & Wellness",
  Diversity: "Fashion & Lifestyle",
  Design: "Abstract Backgrounds",
  Nature: "Nature & Environment",
  Food: "Food & Beverage",
  Technology: "Technology & AI",
  Science: "Science & Innovation",
};

function mapMarketCategoryToUIPreset(category: string) {
  return MARKET_CATEGORY_TO_UI_CATEGORY[category] ?? "Abstract Backgrounds";
}

function defaultCompetitionFromTrend(trend: MarketTrend): CompetitionStrategy {
  // "gold" = high demand + low competition => "low" strategy.
  if (trend.demand === "high" && trend.competition === "low") return "low";
  if (trend.competition === "medium") return "medium";
  return "avoid-high";
}

function computeSmartTrends(topic: string, marketCategory: string): string[] {
  const t = topic.toLowerCase();
  const base = ["Clean Backgrounds", "UI Elements"];

  const addIf = (cond: boolean, val: string) => (cond ? [...base, val] : base);

  let chosen = base;
  if (t.includes("ai") || marketCategory === "AI" || t.includes("machine") || t.includes("learning")) {
    chosen = addIf(true, "AI Visuals");
    chosen = chosen.includes("Holographic") ? chosen : [...chosen, "Holographic"];
  }
  if (marketCategory === "Sustainability" || t.includes("sustain")) {
    chosen = addIf(true, "Biophilic Design");
    chosen = chosen.includes("Minimalism") ? chosen : [...chosen, "Minimalism"];
  }
  if (marketCategory === "Work" || t.includes("remote")) {
    chosen = chosen.includes("Dark Mode Aesthetic") ? chosen : [...chosen, "Dark Mode Aesthetic"];
    chosen = chosen.includes("Loop Animation") ? chosen : [...chosen, "Loop Animation"];
  }
  if (marketCategory === "Design") {
    chosen = chosen.includes("Minimalism") ? chosen : [...chosen, "Minimalism"];
    chosen = chosen.includes("Isometric 3D") ? chosen : [...chosen, "Isometric 3D"];
  }
  if (marketCategory === "Nature") {
    chosen = chosen.includes("Biophilic Design") ? chosen : [...chosen, "Biophilic Design"];
  }
  if (marketCategory === "Food") {
    chosen = chosen.includes("Flat Lay") ? chosen : [...chosen, "Flat Lay"];
  }
  if (marketCategory === "Science") {
    chosen = chosen.includes("Particle Systems") ? chosen : [...chosen, "Particle Systems"];
  }

  // Ensure uniqueness and limit.
  return Array.from(new Set(chosen)).slice(0, 4);
}

function pickLocalKeywordsFallback(count: number): string[] {
  const fallback = [
    "abstract",
    "commercial use",
    "royalty free",
    "technology",
    "innovation",
    "design",
    "minimal",
    "clean background",
    "vector",
    "3d",
    "cinematic",
    "studio",
    "modern",
    "digital",
    "creative",
    "marketing",
    "template",
  ];
  return fallback.slice(0, count);
}

function mapTrendCategoryToGeminiCategory(category: string): string {
  const map: Record<string, string> = {
    AI: "Technology",
    Technology: "Technology",
    Science: "Science",
    Sustainability: "Sustainability",
    Work: "Business",
    Business: "Business",
    Wellness: "Medical",
    Diversity: "Fashion",
    Design: "Abstract Concepts",
    Nature: "Nature",
    Food: "Food",
  };
  return map[category] || "Business";
}

function localGeneratePrompts(params: {
  trend: MarketTrend;
  uiCategory: string;
  outputType: OutputType;
  competition: CompetitionStrategy;
  count: number;
  selectedTrends: string[];
  keywords: string[];
}): StockImagePrompt[] {
  const { trend, uiCategory, outputType, competition, count, selectedTrends, keywords } = params;

  const lighting = "studio lighting, soft diffused, high clarity, sRGB";
  const style = selectedTrends.length ? `style hints: ${selectedTrends.join(", ")}` : "premium commercial style";

  const subjectBase = `Abstract ${trend.topic} concept`;
  const environmentBase =
    trend.category === "Nature"
      ? "natural environment, clean nature textures"
      : trend.category === "Food"
        ? "food studio setup, minimal props, fresh editorial look"
        : trend.category === "Sustainability"
          ? "eco-friendly studio background, green tones, modern sustainability vibe"
          : trend.category === "AI" || trend.category === "Technology"
            ? "futuristic tech studio background, clean digital atmosphere"
            : "modern studio background, clean commercial composition";

  const compCopySpace = "copy space on right side, negative space for overlays";

  const duration = "20 seconds";
  const camera = "slow pan + smooth tracking";
  const motion = competition === "avoid-high" ? "normal speed" : "subtle cinematic motion";

  const toType = (i: number): StockImagePrompt["type"] => {
    if (outputType === "image") return "image";
    if (outputType === "video") return "video";
    if (outputType === "greenscreen") return "green_screen";
    // both
    return i % 2 === 0 ? "image" : "video";
  };

  const toDemand: StockImagePrompt["demand"] = trend.demand === "high" ? "medium" : trend.demand === "medium" ? "medium" : "low";

  const slicedKeywords = keywords.length ? keywords : pickLocalKeywordsFallback(49);

  return Array.from({ length: count }, (_, idx) => {
    const number = idx + 1;
    const type = toType(idx);

    const promptCore = `${subjectBase} (${uiCategory}), ${environmentBase}, ${lighting}. ${compCopySpace}. ${style}.`;

    const prompt =
      type === "video"
        ? `${promptCore} Camera: ${camera}. Motion: ${motion}. Duration: ${duration}. Cinematic 4K look. ${ADOBE_VIDEO_NEGATIVE_SUFFIX}`
        : type === "green_screen"
          ? `${subjectBase} isolated on pure green background (#00B140), studio lighting, smooth edges, ${compCopySpace}. ${style}. ${ADOBE_IMAGE_NEGATIVE_SUFFIX}`
          : `${promptCore} Ultra clean studio shot, sharp focus, 4K, ${ADOBE_IMAGE_NEGATIVE_SUFFIX}`;

    // For local generation: title derived from prompt type + topic.
    const title = `${uiCategory} - ${trend.topic}`.slice(0, 70);

    const kwChunk = slicedKeywords.slice(idx * 5, idx * 5 + 10);
    return {
      number,
      category: uiCategory,
      type,
      demand: toDemand,
      prompt,
      title,
      keywords: kwChunk.length ? kwChunk : slicedKeywords.slice(0, 10),
    };
  });
}

export default function OneClickOpportunity({
  trend,
  onClose,
}: {
  trend: MarketTrend;
  onClose: () => void;
}) {
  const [outputType, setOutputType] = useState<OutputType>("image");
  const [count, setCount] = useState(10);
  const [competition, setCompetition] = useState<CompetitionStrategy>(() => defaultCompetitionFromTrend(trend));
  const [selectedTrends, setSelectedTrends] = useState<string[]>(() => computeSmartTrends(trend.topic, trend.category));

  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<StockImagePrompt[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  const uiCategory = useMemo(() => mapMarketCategoryToUIPreset(trend.category), [trend.category]);

  const localAnalysis = useMemo(() => {
    const isGold = trend.demand === "high" && trend.competition === "low";
    return `ملخص سريع:\n- الطلب: ${trend.demand === "high" ? "مرتفع" : trend.demand === "medium" ? "متوسط" : "منخفض"}\n- المنافسة: ${
      trend.competition === "low" ? "قليلة" : trend.competition === "medium" ? "متوسطة" : "شرسة"
    }\n- الربحية (مؤشر): ${trend.profitability}%\n\nاقتراح جاهز: استخدم إعدادات المخرجات أدناه ثم اضغط "One-Click" للحصول على Prompts جاهزة للإستخدام التجاري مع قيود Adobe العامة (بدون نص/شعارات/أشخاص).${isGold ? "\n⭐ فرصة ذهبية" : ""}`;
  }, [trend]);

  const handleOneClick = async () => {
    setLoading(true);
    setPrompts([]);
    setAnalysis("");

    try {
      // 1) Analysis
      if (hasAnyApiKey()) {
        setAnalysis("جاري تحليل السوق بالذكاء الاصطناعي...");
        setAnalysis(await getAIMarketAnalysis(trend.topic));
      } else if (hasClaudeKey()) {
        setAnalysis(await getClaudeMarketAnalysis(trend.topic));
      } else {
        setAnalysis(localAnalysis);
      }

      // 2) Prompts & keywords
      if (hasClaudeKey()) {
        const generated = await generateStockPrompts(
          uiCategory,
          count,
          outputType,
          selectedTrends,
          competition
        );
        setPrompts(generated);
        toast.success(`تم توليد ${generated.length} برومبت بنقرة واحدة!`);
        return;
      }

      // 2-b) Claude unavailable => Gemini prompts fallback before local fallback.
      if (hasAnyApiKey() && outputType !== "greenscreen") {
        const geminiCategory = mapTrendCategoryToGeminiCategory(trend.category);
        const geminiType = outputType === "both" ? "both" : outputType;
        const evolutionHint = getPromptEvolutionHint(trend.category);
        const generated = await generateGeminiStockPrompts(
          geminiCategory,
          count,
          geminiType,
          selectedTrends,
          competition,
          `${trend.topic}. ${evolutionHint}`.trim()
        );
        const normalized: StockImagePrompt[] = generated.map((p, i) => ({
          number: i + 1,
          category: uiCategory,
          type: p.type,
          demand: p.demand,
          prompt: p.prompt,
          title: p.title,
          keywords: p.keywords,
        }));
        setPrompts(normalized);
        toast.success(`تم توليد ${normalized.length} برومبت عبر Gemini Fallback!`);
        return;
      }

      // 2-c) Last fallback: local generation.
      setKeywordsLoading(true);
      const kw =
        hasAnyApiKey()
          ? await generateAIKeywords(trend.topic, Math.max(20, Math.min(49, count * 5)))
          : pickLocalKeywordsFallback(49);
      setKeywordsLoading(false);

      const generatedLocal = localGeneratePrompts({
        trend,
        uiCategory,
        outputType,
        competition,
        count,
        selectedTrends,
        keywords: kw,
      });
      setPrompts(generatedLocal);
      toast.success(`تم توليد Prompts محلياً (بدون Claude)`);
    } catch (err) {
      setKeywordsLoading(false);
      const geminiType = classifyGeminiError(err);
      toast.error(getGeminiErrorUserMessage(err) || `خطأ (${geminiType}) في التوليد`);
      // Last resort: show local analysis and keep prompts empty.
      setAnalysis(localAnalysis);
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("تم النسخ!");
    } catch {
      toast.error("تعذر النسخ — جرّب Chrome أو تأكد من HTTPS");
    }
  };

  const copyAll = () => {
    const text = prompts
      .map((p, i) => `[${i + 1}] [${p.type.toUpperCase()}] [${p.category}]\n${p.prompt}`)
      .join("\n\n---\n\n");
    try {
      navigator.clipboard.writeText(text);
      toast.success(`تم نسخ ${prompts.length} برومبت!`);
    } catch {
      toast.error("تعذر النسخ إلى الحافظة.");
    }
  };

  const exportTxt = () => {
    const text = prompts
      .map((p, i) => {
        const seo = p.title
          ? `\nTitle: ${p.title}`
          : "";
        const kw = p.keywords?.length
          ? `\nKeywords: ${p.keywords.join(", ")}`
          : "";
        return `PROMPT ${i + 1}\nCategory: ${p.category}\nType: ${p.type.toUpperCase()}\n${seo}${kw}\n\n${p.prompt}`;
      })
      .join("\n\n" + "=".repeat(60) + "\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oneclick-${trend.topic.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم التصدير!");
  };

  return (
    <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold animate-fade-in space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-accent text-glow-gold font-mono">
            ⚡ One-Click Opportunity
          </h3>
          <p className="text-secondary font-mono text-xs">
            الموضوع: <span className="text-primary font-semibold">{trend.topic}</span> | الفئة:{" "}
            <span className="text-primary font-semibold">{trend.category}</span> | الربحية:{" "}
            <span className="text-accent font-semibold">{trend.profitability}%</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="bg-card border border-primary/30 text-secondary px-3 py-1 rounded text-xs font-mono hover:bg-primary/10 transition-all"
        >
          ✖ إغلاق
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-background/20 border border-primary/20 rounded-md p-4 space-y-3">
          <div>
            <label className="block text-primary text-xs font-semibold font-mono mb-1.5">نوع المخرجات:</label>
            <div className="flex flex-wrap gap-2">
              {OUTPUT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOutputType(opt.value)}
                  className={`px-3 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                    outputType === opt.value
                      ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                      : "bg-card text-secondary border-primary/40 hover:border-primary hover:bg-primary/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-primary text-xs font-semibold font-mono mb-1.5">عدد البرومبتات:</label>
            <div className="flex flex-wrap gap-2">
              {[3, 5, 10, 15, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-14 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                    count === n
                      ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                      : "bg-card text-secondary border-primary/40 hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-primary text-xs font-semibold font-mono mb-1.5">استراتيجية المنافسة (Adobe-like):</label>
            <select
              value={competition}
              onChange={(e) => setCompetition(e.target.value as CompetitionStrategy)}
              className="bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full"
            >
              <option value="low">منافسة منخفضة (نيش أفضل ROI)</option>
              <option value="medium">منخفض-متوسط</option>
              <option value="avoid-high">تجنب المواضيع المشبعة</option>
            </select>
          </div>

          <div>
            <label className="block text-primary text-xs font-semibold font-mono mb-1.5">Trends (ذكي-افتراضي):</label>
            <div className="flex flex-wrap gap-2">
              {TRENDS_2026.map((t) => {
                const active = selectedTrends.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setSelectedTrends((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
                      active
                        ? "bg-accent/20 text-accent border-accent box-glow-gold"
                        : "bg-card text-secondary border-primary/30 hover:border-primary"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleOneClick}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "⏳ جاري توليد One-Click..." : "🚀 Analyze + Generate"}
          </button>
          {keywordsLoading && <p className="text-[10px] text-secondary font-mono">جاري توليد كلمات مفتاحية...</p>}
        </div>

        <div className="bg-background/20 border border-primary/20 rounded-md p-4 space-y-3">
          <div>
            <div className="text-primary font-mono text-xs font-semibold mb-1.5">تحليل سريع (مختصر):</div>
            <div className="text-secondary font-mono text-xs leading-relaxed whitespace-pre-wrap bg-card/30 border border-primary/15 rounded-md p-3 min-h-[72px]">
              {analysis || localAnalysis}
            </div>
          </div>

          <div>
            <div className="text-primary font-mono text-xs font-semibold mb-1.5">Compliance Checklist (قبل الرفع):</div>
            <div className="bg-card/30 border border-primary/15 rounded-md p-3 max-h-56 overflow-y-auto">
              <div className="text-accent font-mono text-[10px] font-semibold mb-2">بوابة الرفع (Adobe):</div>
              <div className="text-secondary font-mono text-[10px] space-y-1">
                {ADOBE_SUBMISSION_REMINDERS.map((c, i) => (
                  <div key={`adobe-${i}`} className="flex items-start gap-2">
                    <span className="text-primary shrink-0">✓</span>
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
              <div className="text-secondary font-mono text-[10px] space-y-1 mt-3">
                {checklistItems.slice(0, 8).map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
              <p className="text-secondary font-mono text-[10px] mt-2">
                ملاحظة: هذه تذكير عام فقط—راجِع سياسات Adobe Stock عند التقديم.
              </p>
            </div>
          </div>
        </div>
      </div>

      {prompts.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-primary text-glow font-mono">
              ✦ النتائج ({prompts.length} برومبت)
            </h4>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyAll}
                className="bg-card border border-primary/40 text-primary px-3 py-1.5 rounded text-xs font-mono font-semibold hover:bg-primary/10 transition-all"
              >
                📋 نسخ الكل
              </button>
              <button
                onClick={exportTxt}
                className="gradient-primary text-primary-foreground px-3 py-1.5 rounded text-xs font-mono font-semibold box-glow-strong hover:scale-[1.02] transition-all"
              >
                ⬇ تصدير .txt
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {prompts.map((p, i) => (
              <div
                key={`${p.number}-${i}`}
                className="bg-background border border-primary/30 rounded-lg p-4 hover:border-primary/60 transition-all"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                    <span className="text-primary font-mono text-xs font-bold border border-primary/40 px-2 py-0.5 rounded">
                      #{p.number}
                    </span>
                    <span className="text-[10px] font-mono font-semibold border px-2 py-0.5 rounded bg-primary/10 border-primary/30 text-secondary">
                      {p.type === "green_screen" ? "GREEN SCREEN" : p.type.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono font-semibold border px-2 py-0.5 rounded bg-primary/5 border-primary/20 text-secondary">
                      {p.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void copyPrompt(p.prompt);
                    }}
                    className="relative z-20 shrink-0 cursor-pointer bg-card border border-primary/40 text-primary px-3 py-2 rounded text-[10px] font-mono font-semibold hover:bg-primary/10 hover:box-glow transition-all pointer-events-auto"
                    aria-label="نسخ البرومبت"
                  >
                    📋 نسخ
                  </button>
                </div>

                <p className="text-secondary font-mono text-xs leading-relaxed whitespace-pre-wrap break-words min-w-0">{p.prompt}</p>

                {!!p.keywords?.length && (
                  <div className="mt-3">
                    <div className="text-primary font-mono text-[10px] font-semibold mb-1.5">🔑 Keywords:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.keywords.slice(0, 25).map((kw, ki) => (
                        <span
                          key={ki}
                          className="text-[9px] font-mono bg-primary/5 border border-primary/20 text-secondary px-1.5 py-0.5 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

