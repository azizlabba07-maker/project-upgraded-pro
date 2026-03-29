import { useEffect, useState } from "react";
import {
  classifyGeminiError,
  generateAIVideoPrompts,
  getGeminiErrorUserMessage,
  hasAnyApiKey,
  type VideoPromptResult,
} from "@/lib/gemini";
import { hasClaudeKey } from "@/lib/claude";
import { hasOpenAIKey } from "@/lib/openai";
import { getPromptEvolutionHint } from "@/lib/promptEvolution";
import { getPromptMemory } from "@/lib/promptMemory";
import { dispatchPromptGeneration, type UnifiedStockPrompt } from "@/lib/aiDispatcher";
import { toast } from "sonner";

const VIDEO_CATEGORIES = [
  "Nature", "Technology", "Food", "Cooking", "Abstract Concepts",
  "Sustainability", "Business", "Science", "Travel",
  "Architecture", "Sports", "Fashion", "Music",
  "Medical", "Education", "Automotive",
];

const TRENDS_2026 = [
  "AI Visuals", "Minimalism", "Clean Backgrounds", "Loop Animation",
  "UI Elements", "Particle Systems", "Holographic", "Biophilic Design",
  "Flat Lay", "Isometric 3D", "Dark Mode", "Social Media Assets",
];

const CAMERA_MOVEMENTS = ["slow pan", "dolly zoom", "static shot", "aerial drone", "timelapse", "tracking shot", "crane shot", "orbit shot", "handheld shake", "steadicam glide", "whip pan", "tilt up reveal", "push in", "pull out", "dutch angle", "jib shot"];
const MOTION_SPEEDS = ["slow motion", "normal speed", "fast motion", "timelapse", "ultra slow motion", "speed ramp", "reverse motion"];
const LIGHTING = ["golden hour", "soft diffused", "dramatic rim", "cinematic", "natural ambient", "studio", "backlit silhouette", "neon glow", "moonlight", "overcast soft", "harsh midday", "volumetric fog", "sunset warm", "blue hour", "candlelight", "underwater caustics"];
const DURATIONS = ["10 seconds", "15 seconds", "20 seconds", "25 seconds", "30 seconds"];
const TECHNICAL_STYLES = [
  "hyper-realistic 4K, cinematic depth of field, detailed textures, sharp focus",
  "ultra-detailed 4K, clean composition, premium commercial look, razor-sharp",
  "anamorphic lens flare, film-grain, cinematic color grading, wide dynamic range",
  "macro close-up, shallow depth of field, studio-quality sharpness, vivid colors",
  "aerial cinematography, sweeping landscapes, epic scale, HDR processing",
  "documentary style, authentic feel, natural color palette, observational",
];
const COMMERCIAL_APPEAL = [
  "commercial stock footage, modern clean aesthetic, clear space for overlays",
  "authentic premium stock, minimal market-friendly composition, negative space",
  "agency-ready commercial style, brand-safe framing, text overlay area",
  "editorial-grade, storytelling composition, premium production value",
];
const NEGATIVE_CONSTRAINTS = "no humans, no hands, no fingers, no text, no logos, no watermarks, no copyrighted elements";

const CATEGORY_SUBJECTS: Record<string, string[]> = {
  Nature: [
    "Crystal-clear mountain stream over mossy rocks", "Dense tropical rainforest canopy with mist",
    "Rolling sand dunes in desert wind", "Ocean waves crashing on volcanic rocks",
    "Lavender field swaying in breeze", "Frozen waterfall with ice crystals",
    "Autumn leaves falling from oak tree", "Coral reef with colorful fish",
    "Lightning storm over prairie", "Northern lights over snowy tundra",
    "Bamboo forest with filtered sunlight", "Volcanic lava flowing into ocean",
    "Bioluminescent plankton on dark beach", "Giant redwood trees in fog",
    "Cherry blossom petals floating on stream", "Glacial ice calving into fjord",
    "Wildflower meadow with butterflies", "Cave stalactites with water droplets",
  ],
  Technology: [
    "Futuristic circuit board with pulsing lights", "Robotic arm assembling micro-components",
    "Holographic data visualization spinning", "Server racks with fiber optic cables",
    "3D printer building geometric sculpture", "Drone navigating obstacles",
    "Quantum computer with supercooled chambers", "Neural chip under microscope",
    "Smart city traffic visualization", "Satellite dish array tracking signals",
    "Flexible OLED screen bending", "Lidar sensor scanning environment",
    "Microchip fabrication clean room", "Holographic keyboard on glass",
    "Electric vehicle battery cell assembly", "Laser cutting precision metal",
  ],
  Cooking: [
    "Chef knife slicing vegetables", "Fresh herbs on wooden board", "Steam rising from pot",
    "Olive oil drizzle on salad", "Pizza dough being stretched", "Wok stir-fry with flames",
    "Chocolate melting in double boiler", "Fresh pasta being cut", "Spices cascading into bowl",
    "Grilling meat on barbecue", "Baking bread in oven", "Coffee beans being ground",
    "Sushi roll being prepared", "Sauce reduction in pan", "Fruit smoothie blending",
    "Artisan cheese being sliced", "Honey dripping from dipper", "Egg cracking into bowl",
  ],
  Food: [
    "Fresh herbs on dark slate", "Steam from artisan coffee", "Tropical fruits cross-section",
    "Chocolate pour in macro detail", "Fresh pasta with olive oil", "Sushi knife slicing salmon",
    "Honeycomb with dripping honey", "Artisan cheese wheel cutting", "Macarons geometric pattern",
    "Fresh bread cracking with steam", "Avocado halved in slow motion", "Spices cascading from spoons",
    "Ice cream melting under warm light", "Espresso extraction macro", "Berries falling into cream",
    "Pizza dough being stretched", "Wok stir-fry with flames", "Molecular gastronomy spherification",
  ],
  "Abstract Concepts": [
    "Fluid ink drops in zero gravity", "Geometric light fractals expanding", "Metallic liquid morphing shapes",
    "Particle flow in magnetic field", "Crystal refractions rainbow spectrums", "Mercury droplets combining",
    "Sound waves as rippling 3D surface", "Smoke trails through laser beams", "Ferrofluid magnetic spikes",
    "Soap bubble interference patterns", "Paint swirls creating galaxies", "Kaleidoscopic crystal rotation",
    "Digital glitch patterns dissolving", "Molten glass shaped by forces", "Aurora plasma in vacuum",
    "Ink explosion in water tank", "Cymatics patterns on vibrating plate", "Oil and water light refraction",
  ],
  Sustainability: [
    "Solar panels reflecting clouds", "Wind turbines at sunset", "Recycled materials transformation",
    "Vertical garden on building", "EV charging station", "Rainwater harvesting rooftop garden",
    "Biodegradable packaging timelapse", "Wave energy converter ocean", "Urban rooftop beehive",
    "Geothermal steam vents", "Bamboo construction assembly", "Ocean cleanup device",
    "Green hydrogen facility", "Regenerative farming soil", "Mangrove seedlings growing",
    "Solar-powered water purification", "Algae biofuel cultivation", "Upcycled fashion materials",
  ],
  Business: [
    "Minimalist workspace floating objects", "Network connection 3D visualization", "Rising bar chart glass floor",
    "Corporate glass architecture", "Analytics dashboard data streams", "Golden compass strategic map",
    "Stock market abstract data flow", "Innovation lightbulb shattering", "Chess strategic view",
    "Supply chain flowing paths", "Currency symbols floating", "Gears business machinery",
    "Target bullseye approaching", "Hourglass sand macro", "Puzzle pieces assembling",
    "Blueprint technical drawing unfolding", "Global trade routes visualization", "Cryptocurrency mining rig",
  ],
  Science: [
    "DNA helix rotating with glow", "Cell division vivid detail", "Chemical crystallization timelapse",
    "Nebula swirling gas clouds", "Laboratory glassware reactions", "Atomic structure orbiting electrons",
    "Tectonic plates geological sim", "Weather system forming over ocean", "Fractal patterns growing",
    "Superconductor levitation", "Brain neural pathway visualization", "Protein folding molecular detail",
    "Spectroscopy prism splitting", "Bacterial colony growth timelapse", "Eclipse shadow landscape",
    "Particle collision visualization", "Deep ocean hydrothermal vent", "Mars terrain simulation",
  ],
  Travel: [
    "Ancient stone temple morning light", "Hot air balloons cappadocia", "Venice canal golden hour",
    "Northern lights Iceland lagoon", "Cherry blossom Japanese garden", "Moroccan mosaic tilework",
    "Greek island blue sea", "Scottish highland misty mountains", "Balinese rice terraces",
    "Desert caravan shadows sunset", "Fjord mountain reflections", "Tuscan cypress road morning mist",
    "Maldives overwater bungalow sunrise", "Santorini caldera blue hour", "Angkor Wat jungle canopy",
    "Sahara star trail night sky", "Norwegian fishing village aurora", "Patagonia glacier trek",
  ],
  Architecture: [
    "Modern skyscraper glass facade", "Gothic cathedral ceiling vaults", "Brutalist concrete structure",
    "Japanese zen temple garden", "Art deco building details", "Futuristic museum spiral staircase",
    "Ancient Roman aqueduct", "Contemporary bridge cable design", "Islamic geometric tile patterns",
    "Abandoned factory industrial decay", "Minimalist house interior", "Opera house acoustics ceiling",
  ],
  Sports: [
    "Tennis ball bouncing slow motion", "Swimming pool underwater bubbles", "Soccer ball spinning in air",
    "Skateboard wheels grinding rail", "Surfing wave curl underwater", "Boxing gloves impact powder",
    "Cycling wheel spokes motion blur", "Rock climbing chalk explosion", "Golf ball dimple macro",
    "Archery arrow flight path", "Gymnastics ribbon flowing", "Martial arts water splash kick",
  ],
  Fashion: [
    "Silk fabric flowing in wind", "Luxury watch mechanism macro", "Leather crafting artisan detail",
    "Perfume bottle light refraction", "Jewelry gemstone sparkle", "Haute couture textile weaving",
    "Sunglasses reflection detail", "Sneaker sole pattern macro", "Handbag stitching close-up",
    "Color palette swatches arrangement", "Runway lights bokeh", "Thread spool collection colors",
  ],
  Music: [
    "Piano keys with water droplets", "Vinyl record grooves macro", "Guitar string vibration slow motion",
    "Drum cymbal splash water", "Sound waves visualization neon", "Mixing console faders moving",
    "Saxophone bell reflection", "Turntable needle groove detail", "Concert spotlight fog beams",
    "Sheet music pages turning wind", "Headphones sound wave visual", "Synthesizer patch cables neon",
  ],
  Medical: [
    "Microscopic blood cells flowing", "MRI brain scan visualization", "DNA strand double helix",
    "Surgical instruments sterile tray", "Heart rhythm ECG visualization", "Pharmaceutical pills macro",
    "Stethoscope sound wave visual", "Virus particle 3D structure", "Laboratory centrifuge spinning",
    "X-ray skeletal overlay", "Prosthetic limb engineering", "Stem cell division microscopic",
  ],
  Education: [
    "Books stacked with light glow", "Chalkboard equations timelapse", "Globe spinning with data overlay",
    "Pencil sketching diagram formation", "Digital tablet learning interface", "Library bookshelves infinite",
    "Microscope lens focusing specimen", "Math formulas floating 3D", "Science beakers bubbling",
    "Graduation cap toss slow motion", "Interactive whiteboard animation", "Coding screen matrix flow",
  ],
  Automotive: [
    "Sports car headlight detail", "Engine pistons in motion", "Tire tread water displacement",
    "Dashboard instrument cluster glow", "Electric motor cross-section", "Paint spray booth application",
    "Suspension spring compression", "Exhaust system heat shimmer", "Gear mechanism interlocking",
    "Aerodynamic wind tunnel smoke", "Carbon fiber weave pattern", "Brake disc cooling glow",
  ],
};

const CATEGORY_ENVIRONMENTS: Record<string, string[]> = {
  Nature: ["misty alpine valley", "volcanic coastline at dawn", "dense rainforest floor", "frozen arctic lake", "wildflower meadow thunderclouds", "desert oasis", "mountain summit above clouds", "underwater kelp forest"],
  Technology: ["futuristic clean room", "dark data center corridor", "neon lab", "manufacturing floor", "digital abstract backdrop", "quantum facility", "space station interior", "cyber operations center"],
  Cooking: ["professional kitchen", "rustic farmhouse kitchen", "marble countertop", "chef's prep station", "restaurant kitchen", "home kitchen island", "outdoor cooking area", "industrial kitchen"],
  Food: ["dark editorial kitchen", "marble studio surface", "sunlit rustic tabletop", "premium restaurant station", "black background still life", "outdoor farmers market", "traditional bakery", "Mediterranean courtyard"],
  "Abstract Concepts": ["infinite black void", "soft gradient studio", "reflective metallic stage", "prismatic light chamber", "liquid simulation space", "zero-gravity chamber", "holographic room", "electromagnetic field"],
  Sustainability: ["eco-smart city", "green energy landscape", "recycling facility", "solar farm sunset", "urban vertical garden", "pristine coral reef", "ancient forest", "sustainable community"],
  Business: ["modern glass office atrium", "abstract financial space", "minimal corporate studio", "digital strategy room", "executive lounge", "innovation hub", "futuristic trading floor", "startup loft"],
  Science: ["precision laboratory bench", "microscopic sim space", "observatory dome", "sterile biotech chamber", "particle accelerator tunnel", "marine research vessel", "geological survey site", "telescope control room"],
  Travel: ["historic plaza", "coastal cliff promenade", "mountain viewpoint sunrise", "old medina alleyway", "iconic bridge blue hour", "tropical island shore", "alpine village", "ancient ruins courtyard"],
  Architecture: ["urban skyline panorama", "historic district courtyard", "modern campus plaza", "rooftop observation deck", "waterfront promenade", "underground passage", "museum atrium", "construction site"],
  Sports: ["professional stadium arena", "outdoor training field", "Olympic swimming pool", "extreme sports terrain", "indoor gym facility", "mountain trail course", "beach sports court", "ice rink surface"],
  Fashion: ["high-end boutique interior", "editorial studio set", "Milan fashion week backdrop", "luxury showroom", "backstage dressing room", "outdoor fashion shoot location", "textile factory floor", "designer workshop"],
  Music: ["recording studio booth", "concert hall stage", "underground club", "outdoor festival stage", "vinyl record shop", "orchestral rehearsal space", "rooftop performance venue", "sound mixing room"],
  Medical: ["sterile operating theater", "modern hospital ward", "research laboratory", "pharmaceutical clean room", "diagnostic imaging suite", "rehabilitation center", "biotech startup lab", "telemedicine studio"],
  Education: ["modern university library", "science classroom lab", "digital learning center", "historical lecture hall", "outdoor campus garden", "virtual reality classroom", "maker space workshop", "study lounge"],
  Automotive: ["luxury car showroom", "race track pit lane", "automotive factory line", "wind tunnel facility", "design studio clay model", "electric charging station", "off-road terrain course", "classic car garage"],
};

const CATEGORY_GUARD_KEYWORDS: Record<string, string[]> = {
  Nature: ["nature", "forest", "mountain", "wildlife", "landscape"],
  Technology: ["technology", "digital", "ai", "robot", "circuit", "software"],
  Cooking: ["cooking", "kitchen", "recipe", "chef", "food", "ingredients"],
  Food: ["food", "meal", "dish", "restaurant", "kitchen", "ingredients"],
  "Abstract Concepts": ["abstract", "concept", "geometric", "pattern", "texture"],
  Sustainability: ["sustainability", "eco", "green", "renewable", "recycle"],
  Business: ["business", "office", "finance", "corporate", "strategy"],
  Science: ["science", "lab", "molecule", "research", "dna", "medical"],
  Travel: ["travel", "tourism", "destination", "landmark", "journey"],
  Architecture: ["architecture", "building", "interior", "structure", "urban"],
  Sports: ["sports", "fitness", "athlete", "training", "game"],
  Fashion: ["fashion", "style", "clothing", "runway", "luxury"],
  Music: ["music", "instrument", "audio", "sound", "concert"],
  Medical: ["medical", "healthcare", "hospital", "clinical", "diagnosis"],
  Education: ["education", "learning", "school", "university", "study"],
  Automotive: ["automotive", "car", "vehicle", "engine", "transport"],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isPromptCategoryValid(prompt: string, category: string): boolean {
  const text = prompt.toLowerCase();
  const guard = CATEGORY_GUARD_KEYWORDS[category] || [];
  if (guard.length === 0) return true;
  return guard.some((kw) => text.includes(kw));
}

async function copyTextSafely(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

function generateLocalVideoPrompts(category: string, count: number): VideoPromptResult[] {
  const subjects = CATEGORY_SUBJECTS[category] || CATEGORY_SUBJECTS.Nature;
  const environments = CATEGORY_ENVIRONMENTS[category] || CATEGORY_ENVIRONMENTS.Nature;
  const results: VideoPromptResult[] = [];
  const usedSubjects = new Set<string>();

  let safety = 0;
  while (results.length < count && safety < count * 100) {
    safety++;
    const subject = pickRandom(subjects);
    if (usedSubjects.has(subject) && usedSubjects.size < subjects.length) continue;
    usedSubjects.add(subject);

    const environment = pickRandom(environments);
    const camera = pickRandom(CAMERA_MOVEMENTS);
    const speed = pickRandom(MOTION_SPEEDS);
    const light = pickRandom(LIGHTING);
    const duration = pickRandom(DURATIONS);
    const style = pickRandom(TECHNICAL_STYLES);
    const appeal = pickRandom(COMMERCIAL_APPEAL);

    const prompt = `${subject}, ${environment}, ${light} lighting, ${camera}, ${speed}, ${duration}, ${style}, ${appeal}, ${NEGATIVE_CONSTRAINTS}`;
    results.push({ number: results.length + 1, category, prompt });
  }

  return results;
}

type DisplayPrompt = VideoPromptResult & { type?: string; title?: string; keywords?: string[]; demand?: string };

export default function PromptGenerator() {
  const [category, setCategory] = useState("Nature");
  const [promptCount, setPromptCount] = useState(5);
  const [prompts, setPrompts] = useState<DisplayPrompt[]>(() => {
    try {
      const saved = localStorage.getItem("gemini_saved_prompts");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(() => hasAnyApiKey() || hasClaudeKey() || hasOpenAIKey());
  const [advancedMode, setAdvancedMode] = useState(true);
  const [outputType, setOutputType] = useState<"image" | "video" | "both">("video");
  const [competition, setCompetition] = useState("medium");
  const [selectedTrends, setSelectedTrends] = useState<string[]>(["AI Visuals", "Clean Backgrounds"]);
  const [batchTitleInput, setBatchTitleInput] = useState("");
  const [batchTitles, setBatchTitles] = useState<string[]>([]);

  const toggleTrend = (t: string) =>
    setSelectedTrends((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const addBatchTitle = () => {
    const trimmed = batchTitleInput.trim();
    if (!trimmed) return;
    if (batchTitles.length >= 20) {
      toast.error("الحد الأقصى 20 عنوان");
      return;
    }
    if (batchTitles.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("هذا العنوان مضاف مسبقاً");
      return;
    }
    setBatchTitles((prev) => [...prev, trimmed]);
    setBatchTitleInput("");
  };

  const removeBatchTitle = (index: number) => {
    setBatchTitles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const onKeyUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ hasKey?: boolean }>).detail;
      if (detail?.hasKey) {
        setUseAI(true);
        toast.success("✅ تم تفعيل AI تلقائياً!");
      }
    };
    window.addEventListener("gemini-key-updated", onKeyUpdated as EventListener);
    return () => window.removeEventListener("gemini-key-updated", onKeyUpdated as EventListener);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setPrompts([]);
    localStorage.removeItem("gemini_saved_prompts");

    try {
      const hasAnyKey = hasAnyApiKey() || hasClaudeKey() || hasOpenAIKey();
      const evolutionHint = getPromptEvolutionHint(category);
      const historyContext = getPromptMemory(category);

      if (useAI && hasAnyKey && advancedMode && batchTitles.length > 0) {
        // ── BATCH MODE: multiple titles ──
        const allResults: DisplayPrompt[] = [];
        for (const title of batchTitles) {
          const baseHint = `${title}. ${evolutionHint}`.trim();
          const { prompts: result, engineUsed } = await dispatchPromptGeneration(
            category, promptCount, outputType, selectedTrends, competition,
            baseHint, historyContext
          );
          allResults.push(
            ...(result as DisplayPrompt[]).map((item) => ({
              ...item,
              title: item.title ? `${item.title} | Seed: ${title}` : `Seed: ${title}`,
            }))
          );
        }
        const validated = allResults.filter((item) => isPromptCategoryValid(item.prompt, category));
        const finalList = (validated.length > 0 ? validated : allResults).map((item, idx) => ({ ...item, number: idx + 1 }));
        setPrompts(finalList);
        try { localStorage.setItem("gemini_saved_prompts", JSON.stringify(finalList)); } catch {}
        if (validated.length !== allResults.length) {
          toast.warning(`تمت فلترة ${allResults.length - validated.length} برومبت خارج الفئة المختارة.`);
        }
        toast.success(`✅ تم توليد ${finalList.length} برومبت لـ ${batchTitles.length} عنوان`);
      } else if (useAI && hasAnyKey && advancedMode) {
        // ── ADVANCED MODE: single generation ──
        const topicHint = evolutionHint || undefined;
        const { prompts: result, engineUsed, message } = await dispatchPromptGeneration(
          category, promptCount, outputType, selectedTrends, competition,
          topicHint, historyContext
        );
        let validated = (result as DisplayPrompt[]).filter((item) => isPromptCategoryValid(item.prompt, category));
        const finalList = validated.length > 0 ? validated : (result as DisplayPrompt[]);
        setPrompts(finalList);
        try { localStorage.setItem("gemini_saved_prompts", JSON.stringify(finalList)); } catch {}
        if (validated.length !== (result as DisplayPrompt[]).length && validated.length > 0) {
          toast.warning("تمت فلترة بعض البرومبتات غير المطابقة للفئة.");
        }
        const engineLabel = engineUsed === "local" ? "محلياً" : engineUsed.toUpperCase();
        toast.success(`✅ تم توليد ${finalList.length} برومبت (${engineLabel})`);
        if (message) toast.info(message, { duration: 5000 });
      } else if (useAI && hasAnyKey && !advancedMode) {
        // ── SIMPLE MODE: video-only ──
        try {
          const result = await generateAIVideoPrompts(category, promptCount);
          setPrompts(result as DisplayPrompt[]);
          try { localStorage.setItem("gemini_saved_prompts", JSON.stringify(result)); } catch {}
          toast.success(`✅ تم توليد ${promptCount} برومبت فيديو`);
        } catch {
          // Fallback to dispatch
          const { prompts: fallback, engineUsed } = await dispatchPromptGeneration(
            category, promptCount, "video", selectedTrends, competition
          );
          setPrompts(fallback as DisplayPrompt[]);
          toast.success(`✅ تم التوليد عبر ${engineUsed.toUpperCase()}`);
        }
      } else {
        // ── NO API OR AI DISABLED: local only ──
        const { prompts: localResult, message } = await dispatchPromptGeneration(
          category, promptCount, outputType, selectedTrends, competition
        );
        setPrompts(localResult as DisplayPrompt[]);
        try { localStorage.setItem("gemini_saved_prompts", JSON.stringify(localResult)); } catch {}
        toast.success(`تم توليد ${promptCount} برومبت محلياً`);
        if (useAI && !hasAnyKey) {
          toast.error("أضف مفتاح API من الإعدادات ⚙️ لاستخدام AI");
          setUseAI(false);
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error(getGeminiErrorUserMessage(error));
      // Ultimate fallback
      setPrompts(generateLocalVideoPrompts(category, promptCount) as DisplayPrompt[]);
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async (text: string) => {
    try {
      const ok = await copyTextSafely(text);
      if (!ok) throw new Error();
      toast.success("تم النسخ!");
    } catch {
      toast.error("تعذر النسخ — جرّب المتصفح Chrome أو تأكد من HTTPS");
    }
  };

  const copyAll = async () => {
    const table = prompts.map((p) => {
      let line = `${p.number}. [${p.category}]`;
      if (p.type) line += ` [${p.type}]`;
      line += ` ${p.prompt}`;
      if (p.title) line += `\n  Title: ${p.title}`;
      if (p.keywords?.length) line += `\n  Keywords: ${p.keywords.join(", ")}`;
      return line;
    }).join("\n\n");
    try {
      const ok = await copyTextSafely(table);
      if (!ok) throw new Error();
      toast.success("تم نسخ جميع البرومبتات!");
    } catch {
      toast.error("تعذر نسخ الكل");
    }
  };

  const exportCsv = () => {
    if (prompts.length === 0) {
      toast.error("لا توجد نتائج للتصدير.");
      return;
    }
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ["number", "category", "type", "title", "keywords", "prompt"].join(",");
    const rows = prompts.map((p) =>
      [
        p.number,
        esc(p.category || ""),
        esc(p.type || ""),
        esc(p.title || ""),
        esc((p.keywords || []).join(" | ")),
        esc(p.prompt || ""),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemini-prompts-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير CSV");
  };

  const selectClass = "bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full mb-3";

  return (
    <div className="animate-fade-in space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-1 font-mono">🤖 مولد برومبتات Gemini (محسّن)</h3>
          <p className="text-[10px] text-secondary font-mono mb-4">وضع متقدم مثل Claude • التزام صارم بالفئة • صور+فيديو+كلمات مفتاحية</p>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">اختر الفئة:</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            {VIDEO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">
            عناوين متعددة (اختياري):
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={batchTitleInput}
              onChange={(e) => setBatchTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBatchTitle();
                }
              }}
              placeholder="اكتب عنواناً ثم اضغط +"
              className="bg-card border-2 border-primary text-primary p-2.5 rounded-md font-mono text-xs focus:outline-none focus:box-glow-strong w-full"
            />
            <button
              type="button"
              onClick={addBatchTitle}
              className="gradient-primary text-primary-foreground px-3 rounded-md font-mono text-sm font-semibold shrink-0"
              aria-label="إضافة عنوان"
            >
              +
            </button>
          </div>
          {batchTitles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {batchTitles.map((title, index) => (
                <button
                  key={`${title}-${index}`}
                  type="button"
                  onClick={() => removeBatchTitle(index)}
                  className="text-[10px] font-mono px-2 py-1 rounded border border-primary/30 bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
                  title="إزالة العنوان"
                >
                  {title} ×
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-secondary font-mono mb-3">أضف حتى 20 عنواناً بزر +، وسيتم التوليد دفعة واحدة.</p>

          <label className="text-primary text-xs font-semibold font-mono block mb-1.5">عدد البرومبتات:</label>
          <select value={promptCount} onChange={(e) => setPromptCount(Number(e.target.value))} className={selectClass}>
            <option value={1}>1 برومبت</option>
            <option value={3}>3 برومبتات</option>
            <option value={5}>5 برومبتات</option>
            <option value={10}>10 برومبتات</option>
            <option value={15}>15 برومبت</option>
            <option value={20}>20 برومبت</option>
          </select>

          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="text-primary text-xs font-semibold font-mono">وضع التوليد:</label>
            <button
              onClick={() => setUseAI(!useAI)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border-2 transition-all ${
                useAI
                  ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                  : "bg-card text-secondary border-primary/50"
              }`}
            >
              {useAI ? "🧠 AI مفعّل" : "⚙️ محلي"}
            </button>
            <button
              onClick={() => setAdvancedMode(!advancedMode)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold border-2 transition-all ${
                advancedMode
                  ? "bg-accent/20 text-accent border-accent"
                  : "bg-card text-secondary border-primary/50"
              }`}
            >
              {advancedMode ? "✦ متقدم (مثل Claude)" : "بسيط"}
            </button>
          </div>

          {advancedMode && (
            <div className="space-y-3 mb-3 p-3 bg-primary/5 rounded-md border border-primary/20">
              <div>
                <label className="text-primary text-[10px] font-semibold font-mono block mb-1">نوع المخرجات:</label>
                <div className="flex gap-2">
                  {(["image", "video", "both"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setOutputType(t)}
                      className={`px-2 py-1 rounded text-[10px] font-mono border-2 transition-all ${
                        outputType === t ? "gradient-primary text-primary-foreground border-primary" : "bg-card text-secondary border-primary/40"
                      }`}
                    >
                      {t === "image" ? "📷 صور" : t === "video" ? "🎬 فيديو" : "⚡ كلاهما"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-primary text-[10px] font-semibold font-mono block mb-1">المنافسة:</label>
                <select value={competition} onChange={(e) => setCompetition(e.target.value)} className={selectClass}>
                  <option value="low">منخفضة (نيش نادر)</option>
                  <option value="medium">متوسطة</option>
                  <option value="avoid-high">تجنب المشبع</option>
                </select>
              </div>
              <div>
                <label className="text-primary text-[10px] font-semibold font-mono block mb-1">تراندات 2026:</label>
                <div className="flex flex-wrap gap-1">
                  {TRENDS_2026.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleTrend(t)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono border transition-all ${
                        selectedTrends.includes(t) ? "bg-accent/20 text-accent border-accent" : "bg-card text-secondary border-primary/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {!useAI && (
            <p className="text-[10px] text-secondary font-mono mb-3">
              ℹ️ التوليد المحلي يعمل بدون API. أضف مفتاحك من ⚙️ الإعدادات لتفعيل AI.
            </p>
          )}
          {useAI && !hasAnyApiKey() && (
            <p className="text-[10px] text-destructive font-mono mb-3">
              ⚠️ لا يوجد مفتاح API! أضف مفتاحك من تبويب ⚙️ الإعدادات أولاً.
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full gradient-primary text-primary-foreground py-3 rounded-md font-mono text-sm font-semibold box-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "⏳ جاري التوليد..." : "🚀 توليد برومبتات الفيديو"}
          </button>
        </div>

        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <h3 className="text-base font-semibold text-primary text-glow mb-4 font-mono">📋 صيغة البرومبت</h3>
          <div className="text-xs leading-7 text-secondary font-mono space-y-1">
            <p className="text-primary font-semibold">كل برومبت يتضمن:</p>
            <p>🎯 Subject - الموضوع الرئيسي</p>
            <p>🌍 Environment - البيئة والخلفية</p>
            <p>💡 Professional Lighting - إضاءة احترافية</p>
            <p>🎥 Camera Movement - حركة الكاميرا</p>
            <p>⚡ Motion Speed - سرعة الحركة</p>
            <p>⏱️ Duration - مدة المشهد</p>
            <p>🎨 Technical Style - النمط الفني</p>
            <p>💼 Commercial Appeal - جاذبية تجارية</p>
            <p>🚫 Negative Constraints - قيود سلبية</p>
            <p className="mt-3 text-accent font-semibold">📐 4K (3840×2160) | 24-30fps | 15-30s</p>
            <p className="mt-2 text-[10px] text-secondary">
              📂 الفئات: {VIDEO_CATEGORIES.length} فئة متاحة
            </p>
          </div>
        </div>
      </div>

      {prompts.length > 0 && (
        <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary text-glow font-mono">🎬 البرومبتات ({prompts.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-card border-2 border-primary text-primary px-3 py-1.5 rounded text-xs font-semibold font-mono hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                🔄 توليد جديد
              </button>
              <button
                onClick={copyAll}
                className="gradient-primary text-primary-foreground px-4 py-1.5 rounded text-xs font-semibold font-mono hover:box-glow-strong transition-all"
              >
                📋 نسخ الكل
              </button>
              <button
                onClick={exportCsv}
                className="bg-card border-2 border-primary text-primary px-3 py-1.5 rounded text-xs font-semibold font-mono hover:bg-primary/10 transition-all"
              >
                ⬇ CSV
              </button>
              <button
                onClick={() => {
                  setPrompts([]);
                  localStorage.removeItem("gemini_saved_prompts");
                  toast.success("تم مسح البرومبتات.");
                }}
                className="bg-destructive/10 border-2 border-destructive text-destructive px-3 py-1.5 rounded text-xs font-semibold font-mono hover:bg-destructive/20 transition-all"
              >
                ✖ مسح
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse font-mono text-xs">
              <colgroup>
                <col className="w-10" />
                <col className="w-[6.5rem]" />
                <col />
                <col className="w-14" />
              </colgroup>
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="text-primary text-right p-2">#</th>
                  <th className="text-primary text-right p-2">Category</th>
                  <th className="text-primary text-right p-2">Full Prompt</th>
                  <th className="p-2 w-14" aria-label="نسخ" />
                </tr>
              </thead>
              <tbody>
                {prompts.map((p, i) => (
                  <tr key={i} className="border-b border-primary/30 hover:bg-primary/5 transition-colors">
                    <td className="text-secondary p-2 text-center font-semibold align-top">{p.number}</td>
                    <td className="p-2 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-accent font-semibold text-[10px] bg-primary/10 px-2 py-0.5 rounded inline-block w-fit">{p.category}</span>
                        {p.type && <span className="text-[9px] text-secondary font-mono">{p.type}</span>}
                      </div>
                    </td>
                    <td className="text-secondary p-2 leading-relaxed text-[11px] align-top min-w-0 break-words overflow-hidden">
                      <div>
                        {p.prompt}
                        {p.title && <div className="mt-1 text-primary text-[10px] font-semibold">📌 {p.title}</div>}
                        {p.keywords && p.keywords.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.keywords.map((kw, ki) => (
                              <span key={ki} className="text-[9px] bg-primary/5 border border-primary/20 px-1 py-0.5 rounded">{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2 align-top relative z-20 w-14 min-w-[3.5rem] bg-card/95 backdrop-blur-sm border-s border-primary/15">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void copyPrompt(p.prompt);
                        }}
                        className="gradient-primary text-primary-foreground px-2 py-2 rounded text-[10px] font-semibold hover:box-glow-strong transition-all cursor-pointer pointer-events-auto min-h-[2.25rem] min-w-[2.25rem] inline-flex items-center justify-center"
                        aria-label="نسخ البرومبت"
                      >
                        📋
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
