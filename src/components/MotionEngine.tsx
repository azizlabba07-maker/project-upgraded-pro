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
  const [history, setHistory] = useState<{prompt: string, tokens: DesignTokens}[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('الرجاء إدخال وصف للفيديو أولاً');
      return;
    }

    setIsGenerating(true);
    try {
      toast.info('جاري تصميم الحركة عبر الذكاء الاصطناعي... 🎨');
      const newTokens = await generateMotionTokens(prompt);
      setTokens(newTokens);
      setHistory(prev => [{ prompt, tokens: newTokens }, ...prev].slice(0, 5));
      toast.success('تم بناء الفيديو بنجاح! شاهد المعاينة.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء التوليد');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    const props = { designTokens: tokens };
    const jsonStr = JSON.stringify(props).replace(/'/g, "''"); // escape for PowerShell
    
    // Create a PowerShell command that writes the JSON and runs Remotion
    const command = `$json = '${jsonStr}'
Set-Content -Path "tokens.json" -Value $json -Encoding UTF8
npx remotion render src/remotion/index.ts MyComp out.mp4 --props=./tokens.json`;
    
    copyTextSafely(command);
    toast.success('تم نسخ أمر التصدير! الصقه في نافذة Terminal (PowerShell) الخاصة بالمشروع.');
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
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin text-lg">⏳</span>
                  جاري التصميم...
                </>
              ) : (
                <>
                  <span className="text-lg">✨</span>
                  توليد الفيديو
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

            <button
              onClick={handleExport}
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg border border-white/10 transition-all flex items-center justify-center gap-2 group"
            >
              <span className="text-xl group-hover:-translate-y-1 transition-transform">💾</span>
              تصدير كملف MP4 (نسخ الأمر)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
