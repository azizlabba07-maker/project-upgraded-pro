import { useState } from "react";
import { analyzeStoreScreenshot, hasAnyApiKey, classifyGeminiError, getGeminiErrorUserMessage } from "@/lib/gemini";
import { toast } from "sonner";
import CompetitorSpy from "@/components/CompetitorSpy";

export default function StoreAnalyzer() {
  const [extraNotes, setExtraNotes] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error("عذراً، حجم الصورة يجب أن لا يتجاوز 4 ميجابايت");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setAnalysis("");
  };

  const handleAnalyze = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (!selectedFile || !imagePreview) {
      toast.error("ارفع لقطة شاشة للمتجر أو للعمل المرفوض أولاً");
      return;
    }

    setLoading(true);
    setAnalysis("");
    try {
      const result = await analyzeStoreScreenshot(selectedFile, imagePreview, extraNotes);
      setAnalysis(result);
      toast.success("✅ تم التحليل البصري بنجاح!");
    } catch (error) {
      const errType = classifyGeminiError(error);
      toast.error(getGeminiErrorUserMessage(error));
      if (errType === "quota" || errType === "rate_limit") return;
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full";
  const labelClass = "text-primary text-xs font-semibold font-mono block mb-1.5";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
        <h3 className="text-base font-semibold text-accent text-glow-gold mb-2 font-mono">
          👁️ محلل المتجر والمبيعات (Vision AI)
        </h3>
        <p className="text-secondary font-mono text-[11px] mb-4">
          ارفع لقطة شاشة (Screenshot) لبطاقة عمل مرفوض أو صفحة مبيعات المتجر الخاصة بك. سيقوم الذكاء الاصطناعي "برؤية" المشكلة واقتراح الحلول.
        </p>

        <div className="space-y-4">
          {!imagePreview ? (
            <label className="border-2 border-dashed border-accent/50 hover:border-accent bg-accent/5 flex flex-col items-center justify-center p-8 rounded-lg cursor-pointer transition-all group">
              <span className="text-accent text-3xl mb-3 group-hover:scale-110 transition-transform">📸📸</span>
              <span className="text-accent font-mono text-xs font-semibold">اضغط لرفع لقطة الشاشة</span>
              <span className="text-secondary font-mono text-[10px] mt-1">(صورة لعمل أو عدة أعمال، أو إحصائيات)</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-accent/30 bg-background/50 p-2">
              <button onClick={clearImage} className="absolute top-4 left-4 bg-destructive/80 text-white rounded-full p-2 py-1 text-[10px] hover:bg-destructive hover:scale-110 transition-all z-10 shadow-lg" title="إزالة الصورة">
                🗑️ إزالة
              </button>
              <img src={imagePreview} alt="Screenshot preview" className="max-h-64 object-contain mx-auto rounded" />
            </div>
          )}

          <div>
            <label className={labelClass}>ملاحظات إضافية أو سؤال محدد يخص الصورة (اختياري):</label>
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="مثال: هذا التصميم تم رفضه بسبب الجودة التقنية، هل يمكنك اكتشاف الخلل البصري؟"
              className={`${inputClass} min-h-[60px]`}
              rows={2}
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedFile}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {loading ? "⏳ جاري فحص الصورة واستخراج الأسباب..." : "👁️ ابدأ التحليل البصري لحل المشكلة"}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow animate-fade-in">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">
            📋 تقرير الذكاء الاصطناعي
          </h3>
          <div className="text-secondary font-arabic text-sm leading-relaxed whitespace-pre-wrap">
            {analysis}
          </div>
        </div>
      )}

      {!hasAnyApiKey() && (
        <p className="text-destructive font-mono text-xs text-center">
          ⚠️ أضف مفتاح Gemini API من الإعدادات ⚙️ لاستخدام المحلل البصري
        </p>
      )}

      {/* Competitor Spy — Collapsible */}
      <details className="group">
        <summary className="cursor-pointer bg-primary/5 border-2 border-primary rounded-lg p-4 box-glow flex items-center justify-between hover:bg-primary/10 transition-all list-none">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕵️</span>
            <div>
              <h3 className="text-base font-semibold text-primary font-mono">جاسوس كبار البائعين البصري (Competitor Spy AI)</h3>
              <p className="text-secondary font-mono text-[10px] mt-0.5">الآن بالذكاء الاصطناعي البصري: ارفع صورة لأجل استخراج برومبت أفضل منها!</p>
            </div>
          </div>
          <span className="text-primary text-sm font-mono group-open:rotate-90 transition-transform duration-200">▶</span>
        </summary>
        <div className="mt-3">
          <CompetitorSpy />
        </div>
      </details>
    </div>
  );
}
