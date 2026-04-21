import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { toast } from 'sonner';
import { generateMotionTokens } from '@/lib/gemini';
import { copyTextSafely } from '@/lib/shared';
import { MyComposition, defaultDesignTokens, type DesignTokens } from '@/remotion/MyComposition';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// 🔥 TRENDING IDEAS DATABASE (built-in, no external API needed)
// ============================================================================
const TRENDING_CATEGORIES = [
  {
    category: '🌊 Fluid & Liquid',
    ideas: [
      'Smooth liquid mercury flowing over dark marble surface with golden reflections',
      'Iridescent soap bubble surfaces with rainbow color shifts on black background',
      'Molten lava flowing in slow motion with deep orange and crimson glow',
      'Abstract ink drops dissolving in crystal clear water with neon colors',
      'Chrome liquid metal morphing into organic shapes with blue tint',
    ],
  },
  {
    category: '✨ Particles & Light',
    ideas: [
      'Golden dust particles floating in volumetric light beams on dark background',
      'Neon aurora borealis ribbons dancing across a midnight sky',
      'Fiber optic strands pulsing with electric blue and purple light',
      'Sparkling diamond dust swirling in a vortex with prismatic colors',
      'Bioluminescent plankton glowing in deep ocean darkness with teal and cyan',
    ],
  },
  {
    category: '🔮 Geometric & Abstract',
    ideas: [
      'Sacred geometry mandala rotating with gold wireframe on navy background',
      'Floating 3D glass cubes refracting light in a minimal dark space',
      'Hexagonal grid morphing with gradient waves of coral and violet',
      'Infinite tunnel of rotating concentric circles with depth blur',
      'Crystalline fractal structures growing organically with ice blue palette',
    ],
  },
  {
    category: '🌈 Gradient & Color',
    ideas: [
      'Smooth gradient mesh flowing between warm sunset colors orange pink purple',
      'Holographic foil texture shifting colors with metallic sheen',
      'Pastel cotton candy clouds morphing in soft pink blue lavender',
      'Deep space nebula with magenta cyan and gold cosmic dust',
      'Oil slick rainbow on dark water surface with iridescent reflections',
    ],
  },
  {
    category: '🏗️ Tech & Digital',
    ideas: [
      'Digital circuit board traces glowing with electric green data pulses',
      'Abstract data visualization with floating nodes and connecting lines',
      'Cyberpunk cityscape silhouette with neon rain and reflections',
      'Blockchain network nodes connecting with golden energy beams',
      'AI neural network synapses firing with blue electric impulses',
    ],
  },
  {
    category: '🌿 Nature & Organic',
    ideas: [
      'Abstract coral reef growth patterns with warm ocean color palette',
      'Microscopic cell division animation with soft biological colors',
      'Tree ring growth patterns expanding with earth tone gradients',
      'Abstract butterfly wing patterns with vibrant jewel tone colors',
      'Topographic map contour lines flowing with desert sand palette',
    ],
  },
];

export default function MotionEngine() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tokens, setTokens] = useState<DesignTokens>(defaultDesignTokens);
  const [metadata, setMetadata] = useState<{title: string, keywords: string[]} | null>(null);
  const [history, setHistory] = useState<{prompt: string, tokens: DesignTokens, meta: {title: string, keywords: string[]} | null}[]>([]);
  const [batchCount, setBatchCount] = useState(5);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<{prompt: string, tokens: DesignTokens, meta: {title: string, keywords: string[]}, duration: number}[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
  const [showTrending, setShowTrending] = useState(false);

  // Compute dynamic duration from current tokens
  const currentDuration = tokens.animation?.duration || 8;
  const currentDurationFrames = currentDuration * (tokens.animation?.fps || 30);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('الرجاء إدخال وصف للفيديو أولاً');
      return;
    }

    setIsGenerating(true);
    setBatchItems([]);
    setBatchProgress(0);
    try {
      if (isBatchMode) {
        toast.info(`جاري توليد دفعة من ${batchCount} تصميمات فريدة... 🎨`);
        const newBatch: typeof batchItems = [];
        for (let i = 0; i < batchCount; i++) {
          const randomDuration = Math.floor(Math.random() * (12 - 8 + 1) + 8);
          // Create a VERY unique prompt for each variation to ensure visual diversity
          const colorSeeds = ['warm sunset', 'cool ocean', 'neon cyber', 'earth natural', 'pastel soft', 'dark moody', 'vibrant tropical', 'monochrome elegant', 'golden luxury', 'icy crystal'];
          const shapeSeeds = ['organic flowing curves', 'sharp geometric angles', 'floating spheres', 'spiral vortex', 'grid patterns', 'scattered particles', 'wave ripples', 'fractal branching', 'layered depth', 'radial burst'];
          const colorSeed = colorSeeds[i % colorSeeds.length];
          const shapeSeed = shapeSeeds[i % shapeSeeds.length];
          
          const seed = uuidv4();
          const uniquePrompt = `${prompt}. 
IMPORTANT: This is variation ${i + 1} of ${batchCount}. It MUST look completely different from all other variations.
Color palette: Use ${colorSeed} colors. 
Shape style: Focus on ${shapeSeed}.
Duration: ${randomDuration} seconds.
Constraints: Use ONLY the latest 2024 design trends (abstract gradients, low-poly isometric, liquid-metal shaders, neon cyber-punk, geometric motion, organic fluid shapes). 
Absolutely no copyrighted brand names, logos or trademarked assets. All assets must be royalty-free and safe for Adobe Stock.
Generate completely unique hex color codes - never reuse #6366f1 or #8b5cf6 or any default colors.
Seed: ${seed}`;

          try {
            const result = await generateMotionTokens(uniquePrompt);
            if (result.designTokens) {
              result.designTokens.animation.duration = randomDuration;
              result.designTokens.seed = seed;
            }
            newBatch.push({ prompt: uniquePrompt, tokens: result.designTokens, meta: result.metadata, duration: randomDuration });
            setBatchProgress(i + 1);
            toast.info(`✅ تم توليد ${i + 1}/${batchCount}`);
          } catch (err) {
            console.error(`Batch item ${i + 1} failed:`, err);
            toast.error(`فشل التصميم رقم ${i + 1}, متابعة...`);
          }
        }
        setBatchItems(newBatch);
        if (newBatch.length > 0) {
          setTokens(newBatch[0].tokens);
          setMetadata(newBatch[0].meta);
          setSelectedBatchIndex(0);
        }
        toast.success(`تم توليد ${newBatch.length} تصميمات بنجاح!`);
      } else {
        const randomDuration = Math.floor(Math.random() * (12 - 8 + 1) + 8);
        const seed = uuidv4();
        toast.info('جاري تصميم الحركة عبر الذكاء الاصطناعي... 🎨');
        const uniquePrompt = `${prompt}. Duration: ${randomDuration}s.
Constraints: Use ONLY the latest 2024 design trends (abstract gradients, low-poly isometric, liquid-metal shaders, neon cyber-punk, geometric motion, organic fluid shapes). 
Absolutely no copyrighted brand names, logos or trademarked assets. All assets must be royalty-free and safe for Adobe Stock.
Generate unique hex color codes, never use default colors like #6366f1.
Seed: ${seed}`;
        
        const result = await generateMotionTokens(uniquePrompt);
        if (result.designTokens) {
           result.designTokens.animation.duration = randomDuration;
           result.designTokens.seed = seed;
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

  const handleExport = async () => {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isBatchMode && batchItems.length > 0) {
      const batchData = {
        items: batchItems.map(item => ({
          tokens: item.tokens,
          meta: item.meta,
          duration: item.duration,
        })),
      };

      if (isLocalhost) {
        try {
          const response = await fetch('/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchData, null, 2)
          });
          
          if (response.ok) {
            toast.success(`بدأ التوليد! تم إرسال ${batchItems.length} فيديو. ستظهر لك نافذة CMD الآن لتوضيح التقدم.`);
          } else {
            throw new Error('فشل في الاتصال بالخادم المحلي');
          }
        } catch (error) {
          toast.error('حدث خطأ أثناء محاولة بدء التوليد التلقائي. تأكد من أن الخادم يعمل.');
        }
      } else {
        // Fallback to downloading file when on Vercel
        const blob = new Blob([JSON.stringify(batchData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'batch_tokens.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        const command = `cd /d "D:\\ADOBE\\New folder (5)\\project-upgraded"\nnode scripts/batch-render.js`;
        copyTextSafely(command);
        toast.success(`أنت تستخدم النسخة السحابية. تم تحميل batch_tokens.json! انسخ الأمر والصقه في CMD.`);
      }
    } else {
      // Single video
      const props = { designTokens: tokens };
      if (isLocalhost) {
        try {
          const response = await fetch('/api/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [props] }, null, 2)
          });
          
          if (response.ok) {
            toast.success(`بدأ التوليد! ستظهر لك نافذة CMD الآن.`);
          }
        } catch (error) {
          // Fallback handled below
          toast.error('فشل التوليد التلقائي.');
        }
      } else {
        // Fallback to old behavior if not on localhost
        const blob = new Blob([JSON.stringify(props, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'tokens.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        const command = `cd /d "D:\\ADOBE\\New folder (5)\\project-upgraded"\nnpx remotion render src/remotion/index.ts MyComp "D:\\ADOBE\\New folder (4)\\Motion_output.mp4" --props=tokens.json --gl=angle --concurrency=1`;
        copyTextSafely(command);
        toast.success('تم تحميل tokens.json! انقله إلى مجلد المشروع ثم الصق الأمر في CMD.');
      }
    }
  };

  const handleExportCSV = () => {
    const items = isBatchMode && batchItems.length > 0 ? batchItems : (metadata ? [{ meta: metadata }] : []);
    if (items.length === 0) return;
    
    let csvContent = 'Filename,Title,Keywords,Category,Releases,AI Generated\n';
    items.forEach((item, idx) => {
      const m = 'tokens' in item ? item.meta : (item as any).meta;
      if (!m) return;
      const filename = `Batch_${idx + 1}.mp4`;
      const title = `"${m.title.replace(/"/g, '""')}"`;
      const keywords = `"${m.keywords.join(', ').replace(/"/g, '""')}"`;
      csvContent += `${filename},${title},${keywords},7,,Yes\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `adobe_stock_metadata_${items.length}_videos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`تم تحميل ملف CSV لـ ${items.length} فيديو!`);
  };

  const handleTrendingSelect = (idea: string) => {
    setPrompt(idea);
    setShowTrending(false);
    toast.success('تم تحميل الفكرة! اضغط توليد.');
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

            {/* 🔥 Trending Ideas Button */}
            <button
              onClick={() => setShowTrending(!showTrending)}
              className="w-full mb-4 py-2.5 px-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 rounded-xl font-bold border border-amber-500/30 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span className="text-lg">🔥</span>
              {showTrending ? 'إخفاء الأفكار' : 'استلهم أفكار تراند'}
            </button>

            {/* Trending Ideas Panel */}
            {showTrending && (
              <div className="mb-4 max-h-64 overflow-y-auto custom-scrollbar space-y-3 bg-slate-950/50 p-3 rounded-xl border border-amber-500/20">
                {TRENDING_CATEGORIES.map((cat, catIdx) => (
                  <div key={catIdx}>
                    <p className="text-[10px] font-bold text-amber-400 mb-1.5">{cat.category}</p>
                    <div className="space-y-1">
                      {cat.ideas.map((idea, ideaIdx) => (
                        <button
                          key={ideaIdx}
                          onClick={() => handleTrendingSelect(idea)}
                          className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/30 transition-all text-[11px] text-slate-400 hover:text-amber-200 leading-relaxed"
                        >
                          {idea}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Batch Mode Controls */}
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
                  {isBatchMode ? `جاري إنتاج ${batchProgress}/${batchCount}...` : "جاري التصميم..."}
                </>
              ) : (
                <>
                  <span className="text-lg">✨</span>
                  {isBatchMode ? `توليد دفعة (${batchCount})` : "توليد الفيديو"}
                </>
              )}
            </button>
          </div>

          {/* Batch Items List */}
          {batchItems.length > 0 && (
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-emerald-400 mb-4">✅ الدفعة المنتجة ({batchItems.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {batchItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTokens(item.tokens);
                      setMetadata(item.meta);
                      setSelectedBatchIndex(idx);
                    }}
                    className={`w-full text-right p-3 rounded-xl border transition-all text-xs truncate ${
                      selectedBatchIndex === idx 
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{item.duration}s</span>
                      <span>#{idx + 1} - {item.meta?.title?.substring(0, 30) || 'فيديو'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                durationInFrames={currentDurationFrames}
                fps={tokens.animation?.fps || 30}
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
                <p className="text-sm text-white font-mono">{tokens.animation?.fps || 30} FPS</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المدة</p>
                <p className="text-sm text-white font-mono">{currentDuration}s</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleExport}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg border border-white/10 transition-all flex items-center justify-center gap-2 group"
              >
                <span className="text-xl group-hover:-translate-y-1 transition-transform">💾</span>
                {isBatchMode && batchItems.length > 0 ? `تصدير ${batchItems.length} فيديو (نسخ الأمر)` : 'تصدير كملف MP4 (نسخ الأمر)'}
              </button>
              
              <button
                onClick={handleExportCSV}
                disabled={!metadata && batchItems.length === 0}
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
