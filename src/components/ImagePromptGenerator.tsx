import { useState } from "react";
import {
  generateStockPrompts,
  generateSEOBundle,
  getClaudeErrorMessage,
  hasClaudeKey,
  StockImagePrompt,
} from "@/lib/claude";
import { toast } from "sonner";

const CATEGORIES = [
  "Technology & AI",
  "Business & Finance",
  "Health & Wellness",
  "Sustainability & Green Energy",
  "Abstract Backgrounds",
  "Seasonal & Holidays",
  "Nature & Environment",
  "Architecture & Spaces",
  "Food & Beverage",
  "Science & Innovation",
  "Fashion & Lifestyle",
  "Travel & Destinations",
  "Random Strategic Mix",
];

const TRENDS_2026 = [
  "AI Visuals", "Minimalism", "Clean Backgrounds", "Loop Animation",
  "UI Elements", "Particle Systems", "Holographic", "Biophilic Design",
  "Flat Lay", "Isometric 3D", "Dark Mode Aesthetic", "Social Media Assets",
];

export default function ImagePromptGenerator() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [outputType, setOutputType] = useState<"image" | "video" | "both" | "greenscreen">("image");
  const [count, setCount] = useState(10);
  const [competition, setCompetition] = useState("medium");
  const [selectedTrends, setSelectedTrends] = useState<string[]>(["AI Visuals", "Clean Backgrounds"]);
  const [prompts, setPrompts] = useState<StockImagePrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [seoLoading, setSeoLoading] = useState<number | null>(null);
  const [expandedSeo, setExpandedSeo] = useState<Record<number, { title: string; description: string; keywords: string[] }>>({});

  const toggleTrend = (t: string) =>
    setSelectedTrends((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleGenerate = async () => {
    if (!hasClaudeKey()) {
      toast.error("أضف مفتاح Claude API من تبويب الإعدادات ⚙️");
      return;
    }
    setLoading(true);
    setPrompts([]);
    try {
      const result = await generateStockPrompts(category, count, outputType, selectedTrends, competition);
      setPrompts(result);
      toast.success(`✅ تم توليد ${result.length} برومبت بنجاح!`);
    } catch (err) {
      toast.error(getClaudeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSEO = async (index: number, promptText: string) => {
    setSeoLoading(index);
    try {
      const bundle = await generateSEOBundle(promptText);
      setExpandedSeo((prev) => ({ ...prev, [index]: bundle }));
      toast.success("✅ تم توليد SEO Bundle!");
    } catch (err) {
      toast.error(getClaudeErrorMessage(err));
    } finally {
      setSeoLoading(null);
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
    const text = prompts.map((p, i) =>
      `[${i + 1}] [${p.type.toUpperCase()}] [${p.category}]\n${p.prompt}${
        p.title ? `\nTitle: ${p.title}` : ""
      }${p.keywords ? `\nKeywords: ${p.keywords.join(", ")}` : ""}`
    ).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success(`تم نسخ ${prompts.length} برومبت!`);
  };

  const exportTxt = () => {
    const text = prompts.map((p, i) =>
      `PROMPT ${i + 1}\nCategory: ${p.category}\nType: ${p.type.toUpperCase()}\nCompetition: ${p.demand}\n\n${p.prompt}${
        expandedSeo[i] ? `\n\nSEO Title: ${expandedSeo[i].title}\nDescription: ${expandedSeo[i].description}\nKeywords: ${expandedSeo[i].keywords.join(", ")}` : ""
      }`
    ).join("\n\n" + "=".repeat(60) + "\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompts-${category.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم التصدير!");
  };

  const typeOptions: { value: string; label: string }[] = [
    { value: "image", label: "📷 صور" },
    { value: "video", label: "🎬 فيديو" },
    { value: "both", label: "⚡ كلاهما" },
    { value: "greenscreen", label: "🟢 Green Screen" },
  ];

  const countOptions = [3, 5, 10, 15, 20, 30];

  const selectClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full mb-3";

  const typeTag = (type: string) => {
    if (type === "video") return "border-cyber-blue text-cyber-blue bg-cyber-blue/10";
    if (type === "green_screen") return "border-cyber-yellow text-cyber-yellow bg-cyber-yellow/10";
    return "border-primary text-primary bg-primary/10";
  };

  const typeLabel = (type: string) => {
    if (type === "video") return "🎬 VIDEO";
    if (type === "green_screen") return "🟢 GREEN SCREEN";
    return "📷 IMAGE";
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Settings panel */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow space-y-4">
          <h3 className="text-base font-semibold text-primary text-glow font-mono">
            ✦ إعدادات مولد البرومبتات (Claude AI)
          </h3>

          {/* Category */}
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">الفئة:</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Output type */}
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">نوع المخرجات:</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOutputType(opt.value as any)}
                  className={`py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
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

          {/* Count */}
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">عدد البرومبتات:</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {countOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`w-10 h-9 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
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

          {/* Competition */}
          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">استراتيجية المنافسة:</label>
            <select value={competition} onChange={(e) => setCompetition(e.target.value)} className={selectClass}>
              <option value="low">منافسة منخفضة (نيش نادر — أفضل ROI)</option>
              <option value="medium">منخفض-متوسط (طلب ناشئ)</option>
              <option value="avoid-high">تجنب المواضيع المشبعة</option>
            </select>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                جاري التوليد بـ Claude AI...
              </span>
            ) : "✦ توليد برومبتات بالذكاء الاصطناعي"}
          </button>

          {!hasClaudeKey() && (
            <p className="text-destructive font-mono text-[10px] text-center">
              ⚠️ أضف مفتاح Claude API من الإعدادات ⚙️
            </p>
          )}
        </div>

        {/* Right: trends + framework */}
        <div className="space-y-4">
          {/* 2026 Trends */}
          <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
            <h3 className="text-base font-semibold text-primary text-glow mb-3 font-mono">🚀 تراندات 2026</h3>
            <div className="flex flex-wrap gap-2">
              {TRENDS_2026.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTrend(t)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-semibold border transition-all ${
                    selectedTrends.includes(t)
                      ? "bg-accent/20 text-accent border-accent box-glow-gold"
                      : "bg-card text-secondary border-primary/30 hover:border-primary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-secondary font-mono text-[10px] mt-2">
              {selectedTrends.length} تراند محدد
            </p>
          </div>

          {/* Framework info */}
          <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
            <h3 className="text-sm font-semibold text-primary text-glow mb-3 font-mono">📋 صيغة البرومبت</h3>
            <div className="space-y-1.5 text-[11px] font-mono text-secondary">
              {[
                "🎯 Subject — الموضوع الرئيسي",
                "🌍 Environment — البيئة والخلفية",
                "💡 Lighting — إضاءة احترافية محددة",
                "🎥 Camera — زاوية وحركة الكاميرا",
                "⚡ Motion + Duration — للفيديو فقط",
                "🎨 Style — النمط التقني (4K/8K)",
                "💼 Commercial Use — الاستخدام التجاري",
                "📐 Copy Space — موضع مساحة النص",
              ].map((item) => (
                <div key={item} className="flex items-start gap-1.5">
                  <span className="text-primary shrink-0">→</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-primary/20">
              <p className="text-accent font-mono text-[10px] font-semibold">
                🚫 لا بشر · لا أيدي · لا شعارات · لا نصوص
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {prompts.length > 0 && (
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-base font-semibold text-primary text-glow font-mono">
              ✦ البرومبتات ({prompts.length})
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-card border-2 border-primary text-primary px-3 py-1.5 rounded text-xs font-mono font-semibold hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                🔄 توليد جديد
              </button>
              <button
                onClick={copyAll}
                className="bg-card border-2 border-primary text-primary px-3 py-1.5 rounded text-xs font-mono font-semibold hover:bg-primary/10 transition-all"
              >
                📋 نسخ الكل
              </button>
              <button
                onClick={exportTxt}
                className="gradient-primary text-primary-foreground px-4 py-1.5 rounded text-xs font-mono font-semibold box-glow-strong hover:scale-[1.02] transition-all"
              >
                ⬇ تصدير .txt
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {prompts.map((p, i) => (
              <div
                key={i}
                className="bg-background border border-primary/30 rounded-lg p-4 hover:border-primary/60 transition-all"
              >
                {/* Prompt header */}
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
                    <span className="text-primary font-mono text-xs font-bold border border-primary/40 px-2 py-0.5 rounded">
                      #{p.number || i + 1}
                    </span>
                    <span className={`text-[10px] font-mono font-semibold border px-2 py-0.5 rounded ${typeTag(p.type)}`}>
                      {typeLabel(p.type)}
                    </span>
                    <span className="text-[10px] font-mono text-secondary border border-primary/20 px-2 py-0.5 rounded bg-primary/5">
                      {p.category}
                    </span>
                    {p.demand && (
                      <span className="text-[10px] font-mono text-cyber-yellow border border-cyber-yellow/30 px-2 py-0.5 rounded bg-cyber-yellow/5">
                        ↓ {p.demand} competition
                      </span>
                    )}
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

                {/* Prompt text */}
                <p className="text-secondary font-mono text-xs leading-relaxed mb-3 break-words min-w-0">{p.prompt}</p>

                {/* Inline keywords from generation */}
                {p.keywords && p.keywords.length > 0 && (
                  <div className="mb-3">
                    <p className="text-primary font-mono text-[10px] font-semibold mb-1.5">🔑 Keywords:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.keywords.map((kw, ki) => (
                        <span key={ki} className="text-[9px] font-mono bg-primary/5 border border-primary/20 text-secondary px-1.5 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEO bundle section */}
                {expandedSeo[i] ? (
                  <div className="mt-3 bg-accent/5 border border-accent/30 rounded-md p-3 space-y-2">
                    <p className="text-accent font-mono text-[10px] font-semibold">⭐ SEO Bundle:</p>
                    <div className="space-y-1.5 text-[10px] font-mono text-secondary">
                      <div><span className="text-primary font-semibold">Title:</span> {expandedSeo[i].title}</div>
                      <div><span className="text-primary font-semibold">Description:</span> {expandedSeo[i].description}</div>
                      <div>
                        <span className="text-primary font-semibold">All Keywords ({expandedSeo[i].keywords.length}):</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {expandedSeo[i].keywords.map((kw, ki) => (
                            <span key={ki} className="bg-accent/10 border border-accent/20 text-accent px-1.5 py-0.5 rounded text-[9px]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyPrompt(
                        `Title: ${expandedSeo[i].title}\nDescription: ${expandedSeo[i].description}\nKeywords: ${expandedSeo[i].keywords.join(", ")}`
                      )}
                      className="w-full mt-1 bg-accent/10 border border-accent/30 text-accent py-1.5 rounded font-mono text-[10px] font-semibold hover:bg-accent/20 transition-all"
                    >
                      📋 نسخ SEO Bundle
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSEO(i, p.prompt)}
                    disabled={seoLoading !== null}
                    className="w-full mt-1 bg-card border border-accent/30 text-accent py-1.5 rounded font-mono text-[10px] font-semibold hover:bg-accent/10 transition-all disabled:opacity-50"
                  >
                    {seoLoading === i ? "⏳ جاري توليد SEO..." : "⭐ توليد SEO Bundle (Title + Description + Keywords)"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
