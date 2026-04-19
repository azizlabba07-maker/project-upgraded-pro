import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { analyzeImageForStock } from "@/lib/analyze";
import { extractVideoFrame } from "@/lib/videoUtils";
import { exportToCsv } from "@/lib/csvExport";
import { type AnalysisResult, type VideoFile } from "../types";
import { copyTextSafely } from "@/lib/shared";
import { hasAnyApiKey, getUserGeminiApiKeys } from "@/lib/gemini";
import { validateBatchDiversity } from "@/lib/adobeStockCompliance";

// Modular Components
import DropZone from "./DropZone";
import StatsBar from "./StatsBar";
import ApiKeyModal from "./ApiKeyModal";
import ShinyText from "./animations/ShinyText";

/**
 * 🚀 Adobe Stock Batch Processor Pro
 * Optimized for high-concurrency and deep visual analysis.
 */
export default function BatchProcessor() {
  const [videos, setVideos] = useState<VideoFile[]>(() => {
    try {
      const saved = localStorage.getItem("batch_processor_results_v2");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  const [processing, setProcessing] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cancelRef = useRef(false);
  const videosRef = useRef(videos);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  // Stats calculation
  const completedCount = videos.filter(v => v.status === "ready" || v.status === "review" || v.status === "rejected").length;
  const errorCount = videos.filter(v => v.status === "error").length;
  const pendingCount = videos.filter(v => v.frameBase64 && v.status === "pending").length;
  const totalCount = videos.length;
  
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Persist results
  useEffect(() => {
    try {
      localStorage.setItem("batch_processor_results_v2", JSON.stringify(videos));
    } catch {}
  }, [videos]);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newEntries: VideoFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      status: "pending",
    }));

    setVideos(prev => [...prev, ...newEntries]);

    // Extract frames in parallel for performance
    await Promise.allSettled(
      newEntries.map(async (vid) => {
        try {
          // If already has frame, skip
          if (vid.frameBase64) return;

          let data: { base64: string; mimeType: string; thumbnailUrl: string };
          
          if (vid.file.type.startsWith("video/")) {
            data = await extractVideoFrame(vid.file);
          } else {
            // For images, simple read
            data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({
                base64: (reader.result as string).split(",")[1],
                mimeType: vid.file.type,
                thumbnailUrl: reader.result as string
              });
              reader.onerror = reject;
              reader.readAsDataURL(vid.file);
            });
          }

          setVideos(prev => prev.map(v => 
            v.id === vid.id ? { ...v, frameBase64: data.base64, frameMimeType: data.mimeType, thumbnailUrl: data.thumbnailUrl } : v
          ));
        } catch (err) {
          setVideos(prev => prev.map(v => 
            v.id === vid.id ? { ...v, status: "error", error: err instanceof Error ? err.message : "فشل استخراج الصورة" } : v
          ));
        }
      })
    );
  }, []);

  const handleProcess = async () => {
    const toAnalyze = videos.filter(v => v.frameBase64 && v.status === "pending");
    
    if (toAnalyze.length === 0) {
      toast.info("لا توجد ملفات جاهزة للتحليل");
      return;
    }

    setProcessing(true);
    cancelRef.current = false;
    
    const concurrency = Math.max(1, Math.min(getUserGeminiApiKeys().length, 5));
    const queue = [...toAnalyze];
    
    const worker = async () => {
      while (queue.length > 0 && !cancelRef.current) {
        const vid = queue.shift();
        if (!vid) break;

        // Build batch context from already completed results in THIS batch
        const currentResults = videosRef.current.filter(v => v.result).map(v => v.result!);
        const batchContext = currentResults.length > 0 
          ? currentResults.slice(-10).map(r => `- Title: ${r.title}\n  Keywords: ${r.keywords.slice(0, 8).join(", ")}`).join("\n")
          : undefined;

        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: "processing" } : v));

        try {
          const result = await analyzeImageForStock(vid.file, vid.frameBase64!, batchContext);
          setVideos(prev => prev.map(v => 
            v.id === vid.id ? { ...v, status: result.adobeReadinessStatus, result } : v
          ));
        } catch (err) {
          setVideos(prev => prev.map(v => 
            v.id === vid.id ? { ...v, status: "error", error: err instanceof Error ? err.message : "فشل التحليل" } : v
          ));
        }
      }
    };

    await Promise.all(Array(concurrency).fill(null).map(worker));
    
    setProcessing(false);
    if (cancelRef.current) toast.info("تم إيقاف العملية");
    else toast.success("اكتمل التحليل بنجاح ✨");
  };

  const handleReanalyze = useCallback((id: string) => {
    setVideos(prev => prev.map(v => 
      v.id === id ? { ...v, status: "pending", result: undefined, error: undefined } : v
    ));
    toast.info("تمت إعادة تعيين الملف للتحليل");
  }, []);

  const removeVideo = (id: string) => {
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleExport = () => {
    const results = videos.filter(v => v.result).map(v => v.result!);
    if (results.length === 0) {
      toast.error("لا توجد نتائج للتصدير");
      return;
    }

    // فحص التنوع قبل التصدير
    const diversityAssets = results.map(r => ({
      name: r.name || r.title,
      keywords: r.keywords || [],
      title: r.title || "",
    }));

    import("@/lib/adobeStockCompliance").then(({ validateBatchDiversity }) => {
      const diversity = validateBatchDiversity(diversityAssets);
      
      if (!diversity.isAcceptable) {
        const proceed = confirm(
          `⚠️ تحذير تنوع الدفعة:\n\n` +
          `${diversity.recommendation}\n\n` +
          `عدد الأزواج المتشابهة: ${diversity.similarPairs.length}\n` +
          `متوسط التشابه: ${diversity.averageOverlap}%\n\n` +
          `هل تريد المتابعة مع التصدير رغم التحذير؟`
        );
        if (!proceed) {
          toast.info("تم إلغاء التصدير — أعد تحليل الملفات المتشابهة");
          return;
        }
      } else {
        toast.success(`✅ تنوع الدفعة ممتاز (${diversity.averageOverlap}% تشابه متوسط)`);
      }

      exportToCsv(results);
      toast.success("تم تصدير ملف CSV بنجاح 📥");
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Area */}
      <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-lg shadow-blue-500/10">
            <span className="text-xl">🛠️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">معالج الدفعات الذكي</h2>
            <p className="text-[10px] text-slate-500 font-medium">التحليل المتزامن لضمان قبول Adobe Stock</p>
          </div>
        </div>
        
        <button 
          onClick={() => setInfoModalOpen(true)}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all group"
        >
          <span className="text-lg group-hover:rotate-12 transition-transform block">⚙️</span>
        </button>
      </div>

      {/* Main Action Area */}
      <DropZone onFilesSelected={handleFilesSelected} processing={processing} />

      {/* Stats and Results Summary */}
      {totalCount > 0 && (
        <StatsBar 
          results={videos.filter(v => v.result).map(v => v.result!)}
          onExport={handleExport}
          onClear={() => {
            if (confirm("هل تريد مسح كافة النتائج؟")) setVideos([]);
          }}
          onFilterRisk={setRiskFilter}
          riskFilter={riskFilter}
          onAutoFilter={() => {
            const filtered = videos.filter(v => v.status === "ready" || v.status === "review");
            setVideos(filtered);
            toast.success("تمت التصفية التلقائية بنجاح");
          }}
        />
      )}

      {/* Rejected Assets Cleanup — NEW FEATURE */}
      {videos.some(v => v.status === "rejected") && (
        <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/10 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-red-400">تنظيف الملفات المرفوضة</span>
              <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/10">Action Required</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const rejectedFiles = videos.filter(v => v.status === "rejected").map(v => `"${v.name}"`);
                  const command = `rm ${rejectedFiles.join(", ")}`;
                  copyTextSafely(command);
                  toast.success("تم نسخ أمر الحذف! الصقه في PowerShell.");
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold border border-white/5 transition-all"
              >
                📋 نسخ أمر PowerShell
              </button>
              
              <button 
                onClick={() => {
                  const rejectedFiles = videos.filter(v => v.status === "rejected").map(v => `del "${v.name}"`);
                  const content = `@echo off\necho Cleaning up rejected Adobe Stock assets...\n${rejectedFiles.join("\n")}\necho Done!\npause`;
                  const blob = new Blob([content], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "cleanup_rejected.bat";
                  a.click();
                  toast.success("تم تحميل ملف الحذف! ضعه في مجلد الفيديوهات وشغله.");
                }}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-bold border border-red-500/20 transition-all flex items-center gap-1.5"
              >
                📥 تحميل ملف حذف فوري (.bat)
              </button>
            </div>
          </div>
          <p className="text-[10px] text-red-300/60 leading-relaxed mb-2">
            اكتشف النظام ملفات غير متوافقة مع معايير Adobe Stock. يمكنك نسخ الأمر أعلاه وتشغيله في مجلد الفيديوهات لحذفها فوراً.
          </p>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto pr-2">
            {videos.filter(v => v.status === "rejected").map(v => (
              <span key={v.id} className="text-[9px] bg-red-500/10 text-red-400/80 px-2 py-1 rounded-md border border-red-500/5">
                {v.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Diversity Analytics */}
      {videos.filter(v => v.result).length > 1 && !processing && (
        <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">تحليل تنوع الدفعة</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/10">Beta</span>
            </div>
            {(() => {
              const results = videos.filter(v => v.result).map(v => v.result!);
              const div = validateBatchDiversity(results);
              return (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  div.isAcceptable ? "bg-green-500/10 text-green-400 border border-green-500/20" : 
                  div.similarPairs.length > 2 ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                }`}>
                  {div.isAcceptable ? "آمنة" : "خطر تشابه"}
                </span>
              );
            })()}
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            {(() => {
              const results = videos.filter(v => v.result).map(v => v.result!);
              const div = validateBatchDiversity(results);
              return (
                <>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">متوسط التشابه</div>
                    <div className="text-lg font-mono font-bold text-white">{div.averageOverlap}%</div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">الأزواج المتشابهة</div>
                    <div className="text-lg font-mono font-bold text-white">{div.similarPairs.length}</div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <p className="text-[10px] text-blue-300/80 leading-relaxed italic">
              💡 {(() => {
                const results = videos.filter(v => v.result).map(v => v.result!);
                const div = validateBatchDiversity(results);
                return div.recommendation;
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processing && (
        <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              جاري التحليل... {progressPct}%
            </span>
            <button onClick={() => { cancelRef.current = true; }} className="text-xs text-red-400 hover:underline">إيقاف مؤقت</button>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Controls */}
      {pendingCount > 0 && !processing && (
        <button 
          onClick={handleProcess}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.01] transition-all"
        >
          🚀 ابدأ تحليل {pendingCount} ملف جاهز
        </button>
      )}

      {/* Results Detail List */}
      <details open={detailsOpen} onToggle={e => setDetailsOpen(e.currentTarget.open)} className="group">
        <summary className="flex items-center justify-between cursor-pointer p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all list-none">
          <span className="text-sm font-bold flex items-center gap-3">
             <span className={`transition-transform ${detailsOpen ? "rotate-90" : ""}`}>▶</span>
             📋 مراجعة تفاصيل الملفات ({totalCount})
          </span>
        </summary>
        
        <div className="pt-4 space-y-3">
          {videos.filter(vid => !riskFilter || (vid.result && vid.result.adobeReadinessScore < 55)).map((vid) => (
            <div key={vid.id} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-start gap-4 hover:border-white/10 transition-all">
              <div className="w-24 h-16 bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-white/5">
                {vid.thumbnailUrl ? (
                  <img src={vid.thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">جاري المعالجة</div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-300 truncate">{vid.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      vid.status === "ready" ? "bg-green-500/10 text-green-500" :
                      vid.status === "review" ? "bg-yellow-500/10 text-yellow-500" :
                      vid.status === "error" ? "bg-red-500/10 text-red-500" :
                      "bg-blue-500/10 text-blue-500"
                    }`}>
                      {vid.status}
                    </span>
                    <button onClick={() => removeVideo(vid.id)} className="text-slate-600 hover:text-red-400 text-sm">✕</button>
                  </div>
                </div>
                
                {vid.result ? (
                  <div className="space-y-1">
                    <p className="text-[11px] text-white font-medium line-clamp-1">{vid.result.title}</p>
                    <div className="flex gap-2">
                       <span className="text-[9px] text-slate-500">Score: {vid.result.adobeReadinessScore}%</span>
                       <span className="text-[9px] text-blue-500">Acceptance: {vid.result.estimatedAcceptance}%</span>
                    </div>
                  </div>
                ) : vid.error ? (
                  <p className="text-[10px] text-red-400">{vid.error}</p>
                ) : (
                  <p className="text-[10px] text-slate-600">في انتظار التحليل...</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                 {vid.result && (
                   <button 
                     onClick={() => handleReanalyze(vid.id)}
                     className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all text-xs"
                     title="إعادة تحليل"
                   >
                     🔄
                   </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      </details>
      
      <ApiKeyModal open={infoModalOpen} onOpenChange={setInfoModalOpen} />
    </div>
  );
}
