import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { toast } from 'sonner';
import { generateMotionTokens } from '@/lib/gemini';
import { copyTextSafely } from '@/lib/shared';
import { MyComposition, defaultDesignTokens, videoConfig, type DesignTokens } from '@/remotion/MyComposition';

export default function MotionEngine() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokens, setTokens] = useState<DesignTokens>(defaultDesignTokens);
  const [metadata, setMetadata] = useState<{title: string, keywords: string[]} | null>(null);
  const [history, setHistory] = useState<{prompt: string, tokens: DesignTokens, meta: {title: string, keywords: string[]} | null}[]>([]);
  const [batchCount, setBatchCount] = useState(5);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<{prompt: string, tokens: DesignTokens, meta: {title: string, keywords: string[]}}[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('الرجاء إدخال وصف للفيديو أولاً');
      return;
    }

    setIsGenerating(true);
    setBatchItems([]);
    try {
      if (isBatchMode) {
        toast.info(`جاري توليد دفعة من ${batchCount} تصميمات فريدة... 🎨`);
        const newBatch = [];
        for (let i = 0; i < batchCount; i++) {
          const randomDuration = Math.floor(Math.random() * (12 - 8 + 1) + 8);
          const uniquePrompt = `${prompt} - Variation ${i + 1}. Visual diversity is key. Random duration: ${randomDuration}s.`;
          const result = await generateMotionTokens(uniquePrompt);
          if (result.designTokens) {
             result.designTokens.animation.duration = randomDuration;
          }
          newBatch.push({ prompt: uniquePrompt, tokens: result.designTokens, meta: result.metadata });
        }
        setBatchItems(newBatch);
        if (newBatch.length > 0) {
          setTokens(newBatch[0].tokens);
          setMetadata(newBatch[0].meta);
        }
        toast.success(`تم توليد ${batchCount} تصميمات بنجاح!`);
      } else {
        const randomDuration = Math.floor(Math.random() * (12 - 8 + 1) + 8);
        toast.info('جاري تصميم الحركة عبر الذكاء الاصطناعي... 🎨');
        const result = await generateMotionTokens(`${prompt}. Duration: ${randomDuration}s.`);
        if (result.designTokens) {
           result.designTokens.animation.duration = randomDuration;
        }
        setTokens(result.designTokens);
        setMetadata(result.metadata);
        setHistory(prev => [{ prompt, tokens: result.designTokens, meta: result.metadata }, ...prev].slice(0, 5));
        toast.success('تم بناء الفيديو وتوليد البيانات بنجاح!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء التوليد');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (isBatchMode && batchItems.length > 0) {
      let script = '@echo off\nset "PROJECT_DIR=D:\\ADOBE\\New folder (5)\\project-upgraded"\nset "OUTPUT_DIR=D:\\ADOBE\\New folder (4)"\ncd /d "%PROJECT_DIR%"\n';
      
      batchItems.forEach((item, idx) => {
        const jsonStr = JSON.stringify({ designTokens: item.tokens }).replace(/'/g, "''");
        script += `echo [${idx+1}/${batchItems.length}] Rendering: ${item.meta?.title || 'Video'}\n`;
        script += `echo '${jsonStr}' > tokens.json\n`;
        script += `call npx remotion render src/remotion/index.ts MyComp "%OUTPUT_DIR%\\Batch_${idx+1}_${Date.now()}.mp4" --props=tokens.json --gl=angle --concurrency=1\n`;
      });
      
      script += 'echo All renders completed!\npause';
      copyTextSafely(script);
      toast.success('تم نسخ "أمر الرندرة الجماعي"! الصقه في ملف .bat أو في PowerShell.');
    } else {
      const props = { designTokens: tokens };
      const jsonStr = JSON.stringify(props).replace(/'/g, "''");
      const command = `$json = '${jsonStr}'\nSet-Content -Path "tokens.json" -Value $json -Encoding UTF8\nnpx remotion render src/remotion/index.ts MyComp out.mp4 --props=./tokens.json --gl=angle`;
      copyTextSafely(command);
      toast.success('تم نسخ أمر التصدير!');
    }
  };

  const handleExportCSV = () => {
    if (!metadata) return;
    
    // Adobe Stock CSV Format: Filename, Title, Keywords, Category, Releases, AI Generated
    const filename = `motion_${Date.now()}.mp4`; // Example filename
    const title = `"${metadata.title.replace(/"/g, '""')}"`;
    const keywords = `"${metadata.keywords.join(', ').replace(/"/g, '""')}"`;
    const category = "7"; // 7 = Graphic Resources (Abstract Backgrounds)
    
    const csvContent = `Filename,Title,Keywords,Category,Releases,AI Generated\n${filename},${title},${keywords},${category},,Yes`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'adobe_stock_metadata.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('تم تحميل ملف CSV بنجاح!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <span className="text-xl">🎬</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AI Motion Engine</h2>
            <p className="text-[10px] text-slate-500 font-medium">قم بتوليد مقاطع فيديو متحركة بدقة 4K من الوصف النصي</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-4">وصف الحركة (Prompt)</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: حركة سائل برونزي مع تدرجات ذهبية..."
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none mb-4"
            />
            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer bg-white/5 p-2 rounded-lg border border-white/10">
                <input 
                  type="checkbox" 
                  checked={isBatchMode} 
                  onChange={(e) => setIsBatchMode(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500"
                />
                <span className="text-[10px] font-bold text-slate-300">وضع الإنتاج الكمي (Batch Mode)</span>
              </label>
              
              {isBatchMode && (
                <div className="flex items-center justify-between gap-2 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                  <span className="text-[10px] text-indigo-300 font-bold">عدد الفيديوهات:</span>
                  <input 
                    type="number" 
                    value={batchCount} 
                    onChange={(e) => setBatchCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                    className="w-16 bg-slate-900 border border-indigo-500/30 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  {isBatchMode ? `جاري إنتاج ${batchCount} فيديوهات...` : "جاري التصميم..."}
                </>
              ) : (
                <>
                  <span className="text-lg">✨</span>
                  {isBatchMode ? `توليد دفعة (${batchCount})` : "توليد الفيديو"}
                </>
              )}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-300 mb-4">السجل السريع</h3>
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(item.prompt);
                      setTokens(item.tokens);
                      setMetadata(item.meta);
                    }}
                    className="w-full text-right p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs text-slate-400 hover:text-white truncate"
                  >
                    {item.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Player Section */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 relative">
              <Player
                component={MyComposition}
                inputProps={{ designTokens: tokens }}
                durationInFrames={videoConfig.durationInSeconds * videoConfig.fps}
                fps={videoConfig.fps}
                compositionWidth={videoConfig.width}
                compositionHeight={videoConfig.height}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                controls
                autoPlay
                loop
              />
            </div>
            
            <div className="mt-6 grid grid-cols-3 gap-4 w-full">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">الدقة</p>
                <p className="text-sm text-white font-mono">{videoConfig.width}x{videoConfig.height}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">معدل الإطارات</p>
                <p className="text-sm text-white font-mono">{videoConfig.fps} FPS</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المدة</p>
                <p className="text-sm text-white font-mono">{videoConfig.durationInSeconds}s</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExport}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg border border-white/10 transition-all flex items-center justify-center gap-2 group"
              >
                <span className="text-xl group-hover:-translate-y-1 transition-transform">💾</span>
                تصدير كملف MP4 (نسخ الأمر)
              </button>
              
              <button
                onClick={handleExportCSV}
                disabled={!metadata}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold shadow-lg border border-white/10 transition-all flex items-center justify-center gap-2 group"
              >
                <span className="text-xl group-hover:-translate-y-1 transition-transform">📄</span>
                تحميل بيانات CSV لـ Adobe
              </button>
            </div>
          </div>

          {/* Metadata Section */}
          {metadata && (
            <div className="mt-6 bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white mb-4">البيانات الوصفية (Metadata)</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase mb-1 block">العنوان (Title)</label>
                  <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5 text-sm text-slate-300">
                    {metadata.title}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block">الكلمات المفتاحية ({metadata.keywords.length})</label>
                    <button 
                      onClick={() => {
                        copyTextSafely(metadata.keywords.join(', '));
                        toast.success('تم نسخ الكلمات المفتاحية');
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300"
                    >
                      نسخ الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-800/50 rounded-xl border border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                    {metadata.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
