import { useState, useEffect } from "react";
import { analyzeCompetitorSpyImage, hasAnyApiKey, classifyGeminiError, getGeminiErrorUserMessage, type TopSellerAnalysis } from "@/lib/gemini";
import { toast } from "sonner";

export default function CompetitorSpy() {
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState<TopSellerAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("عذراً، حجم الصورة يجب أن لا يتجاوز 4 ميجابايت");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Ignore text input fields
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    };
    
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, []);

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!hasAnyApiKey()) {
      toast.error("أضف مفتاح Gemini API من الإعدادات ⚙️");
      return;
    }
    if (!selectedFile || !imagePreview) {
      toast.error("ارفع صورة العمل المنافس أولاً.");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const result = await analyzeCompetitorSpyImage(selectedFile, imagePreview, notes);
      setAnalysis(result);
      toast.success("✅ تمت عملية التجسس والتطوير بنجاح!");
    } catch (error) {
      const errType = classifyGeminiError(error);
      toast.error(getGeminiErrorUserMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ البرومبت المطور!");
    } catch {
      toast.error("تعذر النسخ.");
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 scanline-animation pointer-events-none" />
        <h3 className="text-base font-semibold text-primary text-glow mb-2 font-mono relative z-10">
          🕵️ جاسوس كبار البائعين البصري
        </h3>
        <p className="text-secondary font-mono text-[11px] mb-4 relative z-10">
          ارفع لقطة شاشة لعمل منافس ناجح. سنقوم باكتشاف الخلطة السرية، الكلمات المفتاحية المخفية، وابتكار 3 أفكار مطورة (Blue Ocean) لقتله في السوق.
        </p>

        <div className="space-y-4 relative z-10">
          {!imagePreview ? (
            <label 
              className="border-2 border-dashed border-primary/50 hover:border-primary bg-primary/5 flex flex-col items-center justify-center p-8 rounded-lg cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              tabIndex={0}
              onKeyDown={(e) => { if(e.key === "Enter" || e.key === " ") e.currentTarget.click(); }}
            >
              <span className="text-primary text-3xl mb-3 group-hover:scale-110 transition-transform">🎯📸</span>
              <span className="text-primary font-mono text-xs font-semibold">ارفع صورة المنافس أو الصقها هنا (Ctrl+V)</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          ) : (
            <div className="relative rounded-lg overflow-hidden border border-primary/30 bg-background/50 p-2">
              <button onClick={clearImage} className="absolute top-4 left-4 bg-destructive/80 text-white rounded-full p-2 py-1 text-[10px] hover:bg-destructive hover:scale-110 transition-all z-10 shadow-lg" title="إزالة الصورة">
                🗑️ إزالة
              </button>
              <img src={imagePreview} alt="Competitor preview" className="max-h-64 object-contain mx-auto rounded" />
            </div>
          )}

          <div>
            <label className="text-primary text-xs font-semibold font-mono block mb-1.5">ملاحظاتك (اختياري):</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: الإضاءة زرقاء، النمط 사이بربانك..."
              className="bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedFile}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? "⏳ جاري التجسس واستخراج السحر..." : "🕵️ بدء التجسس والتطوير"}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="space-y-5 animate-fade-in">
          {/* Secret Sauce */}
          <div className="bg-card border-2 border-accent rounded-lg p-5 box-glow-gold">
            <h3 className="text-sm font-semibold text-accent text-glow-gold mb-3 font-mono">🧪 الخلطة السرية لنجاح هذا العمل</h3>
            <p className="text-secondary font-arabic text-sm leading-relaxed">{analysis.secretSauce}</p>
          </div>

          {/* Hidden Keywords */}
          <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
            <h3 className="text-sm font-semibold text-primary text-glow mb-3 font-mono">🔑 الكلمات المفتاحية الخفية (Hidden Keywords)</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.hiddenKeywords.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 text-xs font-mono bg-primary/10 border border-primary/30 text-primary rounded-md">
                  {kw}
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(analysis.hiddenKeywords.join(", "));
                toast.success("تم نسخ الكلمات المفتاحية!");
              }}
              className="mt-4 px-3 py-1.5 text-xs font-mono font-semibold bg-card border border-primary/40 text-primary rounded hover:bg-primary/10 transition-colors"
            >
              📋 نسخ الكلمات
            </button>
          </div>

          {/* Smart Evolutions */}
          <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
            <h3 className="text-sm font-semibold text-primary text-glow mb-4 font-mono">🚀 التطوير الذكي (أفكار مطوّرة لقتل المنافسة)</h3>
            <div className="space-y-4">
              {analysis.smartEvolutions.map((evo, i) => (
                <div key={i} className="bg-background/50 border border-primary/20 rounded-md p-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-primary font-bold text-sm font-arabic">{evo.title}</h4>
                    <button
                      onClick={() => copyPrompt(evo.prompt)}
                      className="px-3 py-1 text-[10px] font-mono font-semibold bg-primary text-primary-foreground rounded hover:scale-105 transition-all shadow-glow"
                    >
                      📋 نسخ البرومبت
                    </button>
                  </div>
                  <p className="text-secondary text-xs font-arabic mb-3">{evo.concept}</p>
                  <div className="bg-card/40 border border-primary/10 rounded p-2.5 text-[10px] font-mono text-secondary break-words">
                    <span className="text-primary font-semibold mr-1">PROMPT:</span>
                    {evo.prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
