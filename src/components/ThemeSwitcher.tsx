import { useEffect, useState } from "react";

type Theme = "default" | "theme-blue" | "theme-purple" | "theme-gold" | "theme-red";
type BgTheme = "bg-default" | "bg-black" | "bg-navy" | "bg-charcoal" | "bg-white";

const themes: { id: Theme; label: string; color: string }[] = [
  { id: "default", label: "ماتريكس (أخضر)", color: "#00ff88" },
  { id: "theme-blue", label: "سيبراني (أزرق)", color: "#4da6ff" },
  { id: "theme-purple", label: "نيون (أرجواني)", color: "#c653ff" },
  { id: "theme-gold", label: "ملكي (ذهبي)", color: "#ffb41f" },
  { id: "theme-red", label: "قرمزي (أحمر)", color: "#ff4d4d" },
];

const bgThemes: { id: BgTheme; label: string; color: string }[] = [
  { id: "bg-default", label: "كلاسيك (شفاف)", color: "#0a101f" },
  { id: "bg-black", label: "أسود داكن (OLED)", color: "#050505" },
  { id: "bg-navy", label: "أزرق كحلي", color: "#0d1b2a" },
  { id: "bg-charcoal", label: "رمادي فحمي", color: "#17171a" },
  { id: "bg-white", label: "سحابي (أبيض)", color: "#ffffff" },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<Theme>("default");
  const [currentBg, setCurrentBg] = useState<BgTheme>("bg-default");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("adobe-ai-theme") as Theme | null;
    const savedBg = localStorage.getItem("adobe-ai-bg") as BgTheme | null;
    
    if (savedTheme && themes.some(t => t.id === savedTheme)) {
      setTheme(savedTheme, false);
    }
    if (savedBg && bgThemes.some(b => b.id === savedBg)) {
      setBg(savedBg, false);
    }
  }, []);

  const setTheme = (themeId: Theme, closeMenu = true) => {
    setCurrentTheme(themeId);
    localStorage.setItem("adobe-ai-theme", themeId);
    
    const root = document.documentElement;
    themes.forEach(t => {
      if (t.id !== "default") root.classList.remove(t.id);
    });
    
    if (themeId !== "default") {
      root.classList.add(themeId);
    }
    if (closeMenu) setIsOpen(false);
  };

  const setBg = (bgId: BgTheme, closeMenu = true) => {
    setCurrentBg(bgId);
    localStorage.setItem("adobe-ai-bg", bgId);
    
    const root = document.documentElement;
    bgThemes.forEach(b => {
      if (b.id !== "bg-default") root.classList.remove(b.id);
    });
    
    if (bgId !== "bg-default") {
      root.classList.add(bgId);
    }
    if (closeMenu) setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-card border-2 border-primary/50 text-lg hover:bg-primary/20 transition-all shadow-[0_0_10px_rgba(var(--primary),0.3)] hover:scale-110"
        title="تغيير الثيم والخلفية"
      >
        🎨
      </button>

      {isOpen && (
        <div className="absolute top-10 left-0 w-52 bg-card border-2 border-primary rounded-lg shadow-2xl p-3 animate-fade-in flex flex-col gap-2 box-glow-strong">
          
          <div className="text-[10px] text-secondary font-mono font-bold mb-1 border-b border-primary/20 pb-1">🎨 لون النيون الأساسي:</div>
          <div className="space-y-1 mb-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`flex items-center gap-3 w-full text-right px-3 py-2 rounded-md text-xs font-mono transition-all ${currentTheme === theme.id ? 'bg-primary/20 text-primary font-bold border border-primary/50' : 'text-secondary hover:bg-primary/10 border border-transparent'}`}
              >
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }} />
                {theme.label}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-secondary font-mono font-bold mb-1 border-b border-primary/20 pb-1">🌌 لون الخلفية:</div>
          <div className="space-y-1">
            {bgThemes.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setBg(bg.id)}
                className={`flex items-center gap-3 w-full text-right px-3 py-2 rounded-md text-xs font-mono transition-all ${currentBg === bg.id ? 'bg-primary/20 text-primary font-bold border border-primary/50' : 'text-secondary hover:bg-primary/10 border border-transparent'}`}
              >
                <span className="w-3 h-3 rounded-md shadow-sm border border-secondary/30" style={{ backgroundColor: bg.color }} />
                {bg.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
