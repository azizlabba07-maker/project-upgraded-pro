import { useState } from "react";
import { CURATED_HIGH_DEMAND_VIDEO_THEMES } from "@/data/adobeVideoInspiration";
import { generateAIKeywords, hasAnyApiKey } from "@/lib/gemini";
import { generateClaudeKeywords, hasClaudeKey } from "@/lib/claude";
import { toast } from "sonner";

/**
 * مختبر إلهام قانوني: لا يجلب بيانات من Adobe تلقائياً.
 * - فئات إرشادية علنية
 * - لصق نتائج بحثك اليدوي → توسيع كلمات مفتاحية
 * - دعم محركات متعددة (Gemini/Claude)
 * - حفظ النتائج المفضلة
 */
export default function InspirationLab() {
  const [selectedId, setSelectedId] = useState<string | null>(CURATED_HIGH_DEMAND_VIDEO_THEMES[0]?.id ?? null);
  const [paste, setPaste] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<"gemini" | "claude">("gemini");
  const [savedResults, setSavedResults] = useState<Array<{topic: string, keywords: string[], timestamp: string}>>([]);
  const [customTopic, setCustomTopic] = useState("");

  const selected = CURATED_HIGH_DEMAND_VIDEO_THEMES.find((t) => t.id === selectedId);

  const expandKeywords = async (topic: string) => {
    const t = topic.trim();
    if (!t) {
      toast.error("أدخل موضوعاً أو اختر فئة");
      return;
    }
    setLoading(true);
    setExpanded([]);
    try {
      let out: string[];
      if (engine === "claude" && hasClaudeKey()) {
        out = await generateClaudeKeywords(t, 40);
        toast.success("تم التوسيع بـ Claude");
      } else if (hasAnyApiKey()) {
        out = await generateAIKeywords(t, 40);
        toast.success("تم التوسيع بـ Gemini (مجاني من Google AI Studio)");
      } else {
        out = [
          ...t.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean),
          "b roll",
          "stock footage",
          "4k",
          "commercial",
          "royalty free",
        ].slice(0, 25);
        toast.message("أضف مفتاح Gemini من الإعدادات لتوسيع أذكى", { duration: 4000 });
      }
      setExpanded(out);
    } catch {
      toast.error("تعذر التوسيع. تحقق من المفتاح أو الشبكة.");
    } finally {
      setLoading(false);
    }
  };

  const copyLine = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => toast.success("تم النسخ"));
  };

  return (
    <div className="animate-fade-in space-y-5 max-w-4xl mx-auto">
      <div className="bg-destructive/10 border-2 border-destructive/40 rounded-lg p-4 box-glow">
        <h2 className="text-accent font-mono text-sm font-bold mb-2">⚖️ إشعار قانوني وأخلاقي</h2>
        <p className="text-secondary font-mono text-xs leading-relaxed">
          لا يمكن ربط أي موقع بـ«سرقة» أفكار أو كلمات مفتاحية من فيديوهات Adobe Stock — ذلك يخالف شروط الاستخدام وحقوق الملكية.
          هذه الصفحة تعطيك <strong className="text-primary">إلهاماً من فئات شائعة في سوق الستوك عموماً</strong> وتوسيع كلمات لمواضيع <strong className="text-primary">تختارها أنت</strong> أو تلصقها بعد بحثك اليدوي في Adobe.
        </p>
      </div>

      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-2 font-mono">🔌 المولدات المربوطة لديك</h3>
        <ul className="text-secondary font-mono text-xs space-y-1 list-disc list-inside">
          <li><span className="text-primary">Gemini</span> — طبقة مجانية عبر Google AI Studio (مفتاح API من الإعدادات)</li>
          <li><span className="text-accent">Claude</span> — عبر Proxy أو مفتاح مباشر (اختياري)</li>
          <li><span className="text-secondary">توليد محلي</span> — بدون API عند عدم وجود مفتاح</li>
        </ul>
      </div>

      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
        <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">📌 فئات فيديو شائعة (إرشادية — ليست مبيعات رسمية من Adobe)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {CURATED_HIGH_DEMAND_VIDEO_THEMES.map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => setSelectedId(th.id)}
              className={`text-right p-3 rounded-md border-2 font-mono text-xs transition-all ${
                selectedId === th.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-primary/30 bg-card hover:border-primary/60 text-secondary"
              }`}
            >
              <div className="font-bold text-primary">{th.titleAr}</div>
              <div className="text-[10px] opacity-80 mt-0.5">{th.titleEn}</div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="bg-primary/5 border border-primary/20 rounded-md p-4 space-y-2">
            <p className="text-secondary font-mono text-xs">{selected.why}</p>
            <p className="text-primary font-mono text-[10px] font-semibold">بذور كلمات (إنجليزي):</p>
            <div className="flex flex-wrap gap-1">
              {selected.seedKeywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => copyLine(k)}
                  className="text-[10px] px-2 py-0.5 rounded border border-primary/30 hover:bg-primary/10"
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-secondary font-mono text-[10px]">محرك التوسيع:</span>
              <button
                type="button"
                onClick={() => setEngine("gemini")}
                className={`px-2 py-1 rounded text-[10px] font-mono border ${engine === "gemini" ? "border-primary bg-primary/15" : "border-primary/30"}`}
              >
                Gemini
              </button>
              <button
                type="button"
                onClick={() => setEngine("claude")}
                className={`px-2 py-1 rounded text-[10px] font-mono border ${engine === "claude" ? "border-accent bg-accent/15" : "border-primary/30"}`}
              >
                Claude
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void expandKeywords(`${selected.titleEn}, ${selected.seedKeywords.join(", ")}`)}
                className="gradient-primary text-primary-foreground px-4 py-2 rounded text-xs font-mono font-semibold disabled:opacity-50"
              >
                {loading ? "⏳..." : "✨ توسيع كلمات مفتاحية للفئة"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <h3 className="text-base font-semibold text-accent text-glow-gold mb-2 font-mono">📝 لصق نتائج بحثك اليدوي</h3>
        <p className="text-secondary font-mono text-xs mb-3">
          انسخ من Adobe Stock (بحثك أنت) عناوين أو كلمات تهمك، والصقها هنا — سنوسّعها إلى قائمة كلمات مفتاحية متوافقة مع قواعد Adobe (بدون أسماء فنانين أو علامات).
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder="مثال: slow motion coffee pour, dark background, steam..."
          className="w-full min-h-[100px] bg-card border-2 border-primary text-primary p-3 rounded-md font-mono text-xs"
          dir="ltr"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            disabled={loading}
            onClick={() => void expandKeywords(paste)}
            className="gradient-primary text-primary-foreground px-4 py-2 rounded text-xs font-mono font-semibold disabled:opacity-50"
          >
            توسيع ما لصقته
          </button>
        </div>
      </div>

      {expanded.length > 0 && (
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
            <h4 className="text-primary font-mono text-sm font-semibold">الكلمات الموسّعة ({expanded.length})</h4>
            <button
              type="button"
              onClick={() => copyLine(expanded.join(", "))}
              className="text-xs font-mono border border-primary px-3 py-1 rounded hover:bg-primary/10"
            >
              نسخ الكل (فاصلة)
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {expanded.map((kw, i) => (
              <button
                key={`${kw}-${i}`}
                type="button"
                onClick={() => copyLine(kw)}
                className="text-[10px] font-mono bg-primary/10 border border-primary/25 px-2 py-0.5 rounded hover:bg-primary/20"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-[10px] text-secondary font-mono">
        للمزيد:{" "}
        <a href="https://helpx.adobe.com/stock/contributor/help/generative-ai-content.html" target="_blank" rel="noopener noreferrer" className="text-primary underline">
          إرشادات Adobe Stock للمحتوى المولّد بالذكاء الاصطناعي
        </a>
      </div>
    </div>
  );
}
