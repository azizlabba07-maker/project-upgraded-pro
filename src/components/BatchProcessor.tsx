import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { analyzeImageForStock } from "@/lib/analyze";
import { extractVideoFrame } from "@/lib/videoUtils";
import { exportToCsv } from "@/lib/csvExport";
import { type AnalysisResult, type VideoFile } from "../types";
import { copyTextSafely } from "@/lib/shared";
import { hasAnyApiKey, getUserGeminiApiKeys } from "@/lib/gemini";

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

        setVideos(prev => prev.map(v => v.id === vid.id ? { ...v, status: "processing" } : v));

        try {
          const result = await analyzeImageForStock(vid.file, vid.frameBase64!);
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
    exportToCsv(results);
    toast.success("تم تصدير ملف CSV بنجاح 📥");
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
          {videos.map((vid) => (
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
