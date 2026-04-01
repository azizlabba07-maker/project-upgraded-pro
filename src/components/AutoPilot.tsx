import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { getUnifiedMarketOracle, MarketOracleItem } from "@/lib/gemini";
import { dispatchPromptGeneration } from "@/lib/aiDispatcher";
import { exportCsvFile } from "@/lib/shared";
import { toast } from "sonner";

interface AutoPilotStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  message?: string;
}

export default function AutoPilot() {
  const { hasAnyKey } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AutoPilotStep[]>([
    { id: "oracle", label: "تحليل السوق عبر الأوراكل", status: "pending" },
    { id: "selection", label: "اختيار الفرص الذهبية", status: "pending" },
    { id: "generation", label: "توليد البرومبتات الذكية", status: "pending" },
    { id: "export", label: "تجهيز ملف CSV للرفع", status: "pending" },
  ]);

  const updateStep = (id: string, updates: Partial<AutoPilotStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const runAutoPilot = async () => {
    if (!hasAnyKey()) {
      toast.error("يرجى إضافة مفتاح API أولاً من الإعدادات.");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setSteps(prev => prev.map(s => ({ ...s, status: "pending", message: "" })));

    try {
      // Step 1: Market Oracle
      updateStep("oracle", { status: "running" });
      setProgress(10);
      const opportunities = await getUnifiedMarketOracle();
      updateStep("oracle", { status: "completed", message: `تم العثور على ${opportunities.length} فرصة.` });
      setProgress(30);

      // Step 2: Selection
      updateStep("selection", { status: "running" });
      const goldItems = opportunities
        .filter(item => item.probability >= 75)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5); // Take top 5

      if (goldItems.length === 0) {
        throw new Error("لم يتم العثور على فرص ذهبية عالية الاحتمالية حالياً.");
      }
      updateStep("selection", { status: "completed", message: `تم اختيار ${goldItems.length} نيشات عالية القيمة.` });
      setProgress(50);

      // Step 3: Generation
      updateStep("generation", { status: "running" });
      const allGeneratedPrompts: any[] = [];
      
      for (let i = 0; i < goldItems.length; i++) {
        const item = goldItems[i];
        updateStep("generation", { message: `جاري توليد برومبتات لـ: ${item.topic}...` });
        
        const result = await dispatchPromptGeneration(
          item.category,
          3, // 3 prompts per category
          "both",
          [item.topic],
          item.competition,
          item.topic
        );
        
        allGeneratedPrompts.push(...result.prompts);
        setProgress(50 + ((i + 1) / goldItems.length) * 40);
      }
      updateStep("generation", { status: "completed", message: `تم توليد ${allGeneratedPrompts.length} برومبت بنجاح.` });

      // Step 4: Export
      updateStep("export", { status: "running" });
      const filename = `autopilot-stock-export-${new Date().toISOString().split('T')[0]}.csv`;
      exportCsvFile(
        filename,
        ["Title", "Keywords", "Prompt", "Category", "Type"],
        allGeneratedPrompts.map(p => [
          p.title || "",
          (p.keywords || []).join(", "),
          p.prompt,
          p.category,
          p.type
        ])
      );
      updateStep("export", { status: "completed", message: "تم تحميل ملف CSV جاهز للرفع!" });
      setProgress(100);
      
      toast.success("اكتملت عملية الطيار الآلي بنجاح! 🚀");
    } catch (error: any) {
      console.error("Auto-Pilot Error:", error);
      const currentStep = steps.find(s => s.status === "running")?.id || "oracle";
      updateStep(currentStep, { status: "error", message: error.message });
      toast.error(`فشل الطيار الآلي: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="relative rounded-3xl p-8 overflow-hidden bg-slate-900/50 border border-white/10 group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-50 group-hover:opacity-100 transition-all duration-700" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-5xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/20">
            🤖
          </div>
          <div className="flex-1 text-center md:text-right">
            <h2 className="text-3xl font-bold text-white mb-3">نظام الطيار الآلي (Auto-Pilot)</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              بضغطة زر واحدة، سيقوم النظام بتحليل أحدث التريندات، اكتشاف الفرص الذهبية، 
              وتوليد أفضل البرومبتات وتصديرها مباشرة في ملف CSV متوافق مع Adobe Stock.
            </p>
            <button
              onClick={runAutoPilot}
              disabled={isRunning}
              className={`px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-3 mx-auto md:mr-0 ${
                isRunning 
                ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:scale-105 active:scale-95"
              }`}
            >
              {isRunning ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التنفيذ...
                </>
              ) : (
                <>🚀 تشغيل الطيار الآلي الآن</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Steps List */}
        <div className="md:col-span-2 space-y-3">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                step.status === "running" ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20" :
                step.status === "completed" ? "bg-emerald-500/5 border-emerald-500/20" :
                step.status === "error" ? "bg-red-500/5 border-red-500/20" :
                "bg-white/[0.02] border-white/[0.06] opacity-50"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step.status === "running" ? "bg-blue-500 text-white animate-pulse" :
                step.status === "completed" ? "bg-emerald-500 text-white" :
                step.status === "error" ? "bg-red-500 text-white" :
                "bg-slate-800 text-slate-500"
              }`}>
                {step.status === "completed" ? "✓" : step.status === "error" ? "!" : index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-bold ${isActive(step.status) ? "text-white" : "text-slate-500"}`}>
                    {step.label}
                  </h4>
                  {step.status === "running" && <span className="text-[10px] text-blue-400 animate-pulse">جاري العمل...</span>}
                </div>
                {step.message && (
                  <p className={`text-[11px] mt-1 ${step.status === "error" ? "text-red-400" : "text-slate-500"}`}>
                    {step.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Status Card */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <div className="relative mb-6">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * progress) / 100}
                className="text-blue-500 transition-all duration-500 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{Math.round(progress)}%</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">إتمام</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-mono px-4">
             {isRunning ? "يرجى عدم إغلاق الصفحة أثناء عمل النظام الذكي..." : "نظام الأتمتة جاهز لبدء المهمة القادمة."}
          </p>
        </div>
      </div>
    </div>
  );
}

function isActive(status: string) {
  return status === "running" || status === "completed";
}
