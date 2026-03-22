import { useState } from "react";
import { checklistItems } from "@/data/marketData";
import { generateAIKeywords, getTopKeywordsForDomain, hasAnyApiKey } from "@/lib/gemini";
import { generateClaudeKeywords, hasClaudeKey } from "@/lib/claude";
import { toast } from "sonner";

export default function ToolsSection() {
  // ── Profit Calculator ──
  const [imageCount, setImageCount]     = useState(100);
  const [pricePerImage, setPricePerImage] = useState(5);
  const [convRate, setConvRate]         = useState(2);
  const [profitResult, setProfitResult] = useState<{
    monthly: number; yearly: number; perDownload: number; breakEven: number;
  } | null>(null);

  // ── Keywords ──
  const [keywordTopic, setKeywordTopic] = useState("");
  const [keywordCount, setKeywordCount] = useState(25);
  const [engine, setEngine]             = useState<"claude" | "gemini">("claude");
  const [keywords, setKeywords]         = useState<string[]>([]);
  const [loadingKw, setLoadingKw]       = useState(false);

  // ── Top Keywords per Domain ──
  const [domainTopic, setDomainTopic] = useState("");
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [loadingTop, setLoadingTop] = useState(false);

  // ── Checklist ──
  const [checked, setChecked] = useState<boolean[]>(new Array(checklistItems.length).fill(false));

  // ── Title Generator ──
  const [titleDesc, setTitleDesc]       = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);

  const calculateProfit = () => {
    const monthly   = imageCount * pricePerImage * (convRate / 100);
    const yearly    = monthly * 12;
    const perDownload = pricePerImage;
    const breakEven = imageCount > 0 ? Math.ceil(100 / convRate) : 0;
    setProfitResult({ monthly, yearly, perDownload, breakEven });
  };

  const handleKeywords = async () => {
    const topic = keywordTopic.trim() || "AI technology";
    setLoadingKw(true);
    setKeywords([]);
    try {
      let result: string[];
      if (engine === "claude" && hasClaudeKey()) {
        result = await generateClaudeKeywords(topic, keywordCount);
        toast.success("✅ تم التوليد بـ Claude AI!");
      } else {
        result = await generateAIKeywords(topic, keywordCount);
        toast.success("✅ تم التوليد بـ Gemini AI!");
      }
      setKeywords(result);
    } catch {
      const fallback = [
        "background", "concept", "design", "illustration", "vector", "abstract", "modern",
        "professional", "business", "technology", "innovation", "digital", "creative",
        "contemporary", "minimalist", "3D", "realistic", "stock photo", "commercial",
        "marketing", "advertising", "template", "web", "artistic", "style",
      ];
      setKeywords(fallback.slice(0, keywordCount));
      toast.error("تم استخدام المولد المحلي كبديل");
    } finally {
      setLoadingKw(false);
    }
  };

  const handleTopKeywords = async () => {
    const topic = domainTopic.trim() || "technology";
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    setLoadingTop(true);
    setTopKeywords([]);
    try {
      const result = await getTopKeywordsForDomain(topic, 50);
      setTopKeywords(result);
      toast.success(`✅ تم اكتشاف ${result.length} كلمة شائعة في مجال "${topic}"!`);
    } catch {
      toast.error("تعذر التحميل. تحقق من مفتاح API.");
    } finally {
      setLoadingTop(false);
    }
  };

  const copyAllKeywords = () => {
    navigator.clipboard.writeText(keywords.join(", "));
    toast.success("تم نسخ جميع الكلمات!");
  };

  const copyKeywordLines = () => {
    navigator.clipboard.writeText(keywords.join("\n"));
    toast.success("تم النسخ (سطر لكل كلمة)!");
  };

  const toggleCheck = (i: number) => {
    setChecked((prev) => { const n = [...prev]; n[i] = !n[i]; return n; });
  };

  const resetChecklist = () => setChecked(new Array(checklistItems.length).fill(false));

  const checkedCount = checked.filter(Boolean).length;
  const percentage = Math.round((checkedCount / checklistItems.length) * 100);
  const isReady = percentage === 100;

  // Quick title generator (local, no API needed)
  const generateTitles = () => {
    if (!titleDesc.trim()) { toast.error("أدخل وصفاً للصورة"); return; }
    const prefixes = ["Professional", "Modern", "Abstract", "Creative", "Minimal", "Dynamic"];
    const suffixes = ["Background", "Concept", "Design", "Illustration", "Vector", "Template"];
    const titles = Array.from({ length: 5 }, () => {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const s = suffixes[Math.floor(Math.random() * suffixes.length)];
      return `${p} ${titleDesc} ${s}`;
    });
    setGeneratedTitles(titles);
  };

  const inputClass  = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full mb-3";
  const selectClass = inputClass;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ── Profit Calculator (upgraded) ── */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">💰 حاسبة الأرباح المتقدمة</h3>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">عدد الصور في المحفظة:</label>
          <input type="number" value={imageCount} onChange={(e) => setImageCount(Number(e.target.value))} min={1} className={inputClass} />

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">سعر البيع المتوقع للصورة ($):</label>
          <input type="number" value={pricePerImage} onChange={(e) => setPricePerImage(Number(e.target.value))} min={0.1} step={0.1} className={inputClass} />

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">معدل التحويل المتوقع (%):</label>
          <input type="number" value={convRate} onChange={(e) => setConvRate(Number(e.target.value))} min={0.1} max={100} step={0.1} className={inputClass} />

          <button onClick={calculateProfit} className="w-full gradient-primary text-primary-foreground py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all">
            🧮 احسب الأرباح
          </button>

          {profitResult && (
            <div className="mt-4 bg-primary/5 border-2 border-primary rounded-lg p-4 space-y-2">
              {[
                { label: "الربح الشهري المتوقع", value: `$${profitResult.monthly.toFixed(2)}`, highlight: true },
                { label: "الربح السنوي المتوقع",  value: `$${profitResult.yearly.toFixed(2)}`, highlight: true },
                { label: "سعر كل تحميل",          value: `$${profitResult.perDownload.toFixed(2)}`, highlight: false },
                { label: "تحميل لاسترداد التكلفة", value: `${profitResult.breakEven} تحميل`, highlight: false },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between font-mono text-xs ${row.highlight ? "text-primary font-semibold" : "text-secondary"}`}>
                  <span>{row.label}:</span>
                  <span className={row.highlight ? "text-accent" : ""}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Keyword Generator (Claude + Gemini) ── */}
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">🔑 مولد الكلمات المفتاحية</h3>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">محرك الذكاء الاصطناعي:</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setEngine("claude")}
              className={`flex-1 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                engine === "claude"
                  ? "bg-accent/20 text-accent border-accent box-glow-gold"
                  : "bg-card text-secondary border-primary/40 hover:border-primary"
              }`}
            >
              ✦ Claude {!hasClaudeKey() && "(بدون مفتاح)"}
            </button>
            <button
              onClick={() => setEngine("gemini")}
              className={`flex-1 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                engine === "gemini"
                  ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                  : "bg-card text-secondary border-primary/40 hover:border-primary"
              }`}
            >
              🔮 Gemini
            </button>
          </div>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">الموضوع:</label>
          <input
            type="text"
            value={keywordTopic}
            onChange={(e) => setKeywordTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleKeywords()}
            placeholder="مثال: AI technology, sustainability..."
            className={inputClass}
          />

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">عدد الكلمات:</label>
          <select value={keywordCount} onChange={(e) => setKeywordCount(Number(e.target.value))} className={selectClass}>
            <option value={25}>25 كلمة</option>
            <option value={49}>49 كلمة (الحد الأقصى لـ Adobe Stock)</option>
          </select>

          <button onClick={handleKeywords} disabled={loadingKw} className="w-full gradient-primary text-primary-foreground py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50">
            {loadingKw ? "⏳ جاري التوليد..." : "🔍 توليد الكلمات المفتاحية"}
          </button>

          {keywords.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-primary font-mono text-[10px] font-semibold">{keywords.length} كلمة مفتاحية</p>
                <div className="flex gap-2">
                  <button onClick={copyAllKeywords} className="text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all">نسخ (فاصلة)</button>
                  <button onClick={copyKeywordLines} className="text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all">نسخ (أسطر)</button>
                </div>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <span
                      key={i}
                      onClick={() => { navigator.clipboard.writeText(kw); toast.success(`نسخ: ${kw}`); }}
                      className="text-[10px] font-mono bg-primary/10 border border-primary/20 text-secondary px-2 py-0.5 rounded cursor-pointer hover:bg-primary/20 hover:text-primary transition-all"
                      title="اضغط للنسخ"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── اكتشاف الكلمات المفتاحية الشائعة لكل مجال ── */}
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <h3 className="text-base font-semibold text-accent text-glow-gold mb-4 font-mono">
          🔎 اكتشاف الكلمات الأكثر استعمالاً في كل مجال
        </h3>
        <p className="text-secondary font-mono text-[11px] mb-3">
          أدخل المجال أو الموضوع لاكتشاف أكثر الكلمات بحثاً على Adobe Stock (مثل: Cooking, Technology, Nature...)
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">المجال:</label>
            <input
              type="text"
              value={domainTopic}
              onChange={(e) => setDomainTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTopKeywords()}
              placeholder="Cooking, Food, Technology, Nature..."
              className={inputClass}
            />
          </div>
          <button
            onClick={handleTopKeywords}
            disabled={loadingTop}
            className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loadingTop ? "⏳ جاري الاكتشاف..." : "🔍 اكتشف الكلمات الشائعة"}
          </button>
        </div>
        {topKeywords.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-primary font-mono text-[10px] font-semibold">{topKeywords.length} كلمة الأكثر بحثاً</p>
              <button
                onClick={() => { navigator.clipboard.writeText(topKeywords.join(", ")); toast.success("تم النسخ!"); }}
                className="text-[10px] px-2 py-1 border border-accent/40 text-accent rounded font-mono hover:bg-accent/10 transition-all"
              >
                نسخ الكل
              </button>
            </div>
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {topKeywords.map((kw, i) => (
                  <span
                    key={i}
                    onClick={() => { navigator.clipboard.writeText(kw); toast.success(`نسخ: ${kw}`); }}
                    className="text-[10px] font-mono bg-accent/10 border border-accent/20 text-accent px-2 py-0.5 rounded cursor-pointer hover:bg-accent/20 transition-all"
                    title="اضغط للنسخ"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Title Generator ── */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">✍️ مولد العناوين السريع</h3>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={titleDesc}
            onChange={(e) => setTitleDesc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateTitles()}
            placeholder="صف محتوى الصورة بالإنجليزية... مثال: neural network"
            className="flex-1 min-w-[240px] bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong"
          />
          <button onClick={generateTitles} className="gradient-primary text-primary-foreground px-5 py-2.5 rounded-md font-mono text-xs font-semibold box-glow-strong hover:scale-[1.02] transition-all">
            ✨ توليد عناوين
          </button>
        </div>
        {generatedTitles.length > 0 && (
          <div className="mt-4 space-y-2">
            {generatedTitles.map((title, i) => (
              <div key={i} className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                <span className="font-mono text-xs text-secondary flex-1">{title}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(title); toast.success("تم النسخ!"); }}
                  className="shrink-0 text-[10px] px-2 py-1 border border-primary/40 text-primary rounded font-mono hover:bg-primary/10 transition-all"
                >
                  نسخ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pre-Upload Checklist ── */}
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-base font-semibold text-primary text-glow font-mono">✅ قائمة فحص ما قبل الرفع</h3>
          <div className="flex items-center gap-3">
            {isReady && <span className="text-primary text-xs font-mono font-semibold animate-pulse-glow">🚀 جاهز للرفع!</span>}
            <button onClick={resetChecklist} className="text-[10px] px-3 py-1.5 border border-destructive/40 text-destructive rounded font-mono hover:bg-destructive/10 transition-all">
              ↺ إعادة تعيين
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] font-mono text-secondary mb-1">
            <span>{checkedCount}/{checklistItems.length} عنصر</span>
            <span className="text-primary font-semibold">{percentage}%</span>
          </div>
          <div className="h-2 bg-primary/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isReady ? "bg-accent" : "bg-primary/70"}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {checklistItems.map((item, i) => (
            <div
              key={i}
              onClick={() => toggleCheck(i)}
              className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all font-mono text-xs ${
                checked[i] ? "bg-primary/5 opacity-50" : "bg-primary/5 hover:bg-primary/10"
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                checked[i] ? "bg-primary border-primary" : "border-primary/50"
              }`}>
                {checked[i] && <span className="text-background text-[8px] font-bold">✓</span>}
              </div>
              <label className={`flex-1 cursor-pointer text-secondary ${checked[i] ? "line-through" : ""}`}>{item}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
