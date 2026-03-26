import { useEffect, useState } from "react";

type Theme = "default" | "theme-blue" | "theme-purple" | "theme-gold" | "theme-red";

const themes: { id: Theme; label: string; color: string }[] = [
  { id: "default", label: "ماتريكس (أخضر)", color: "#00ff88" },
  { id: "theme-blue", label: "سيبراني (أزرق)", color: "#4da6ff" },
  { id: "theme-purple", label: "نيون (أرجواني)", color: "#c653ff" },
  { id: "theme-gold", label: "ملكي (ذهبي)", color: "#ffb41f" },
  { id: "theme-red", label: "قرمزي (أحمر)", color: "#ff4d4d" },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<Theme>("default");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("adobe-ai-theme") as Theme | null;
    if (savedTheme && themes.some(t => t.id === savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  const setTheme = (themeId: Theme) => {
    setCurrentTheme(themeId);
    localStorage.setItem("adobe-ai-theme", themeId);
    
    const root = document.documentElement;
    themes.forEach(t => {
      if (t.id !== "default") root.classList.remove(t.id);
    });
    
    if (themeId !== "default") {
      root.classList.add(themeId);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-card border-2 border-primary/50 text-lg hover:bg-primary/20 transition-all shadow-[0_0_10px_rgba(var(--primary),0.3)] hover:scale-110"
        title="تغيير الثيم والألوان"
      >
        🎨
      </button>

      {isOpen && (
        <div className="absolute top-10 left-0 w-48 bg-card border-2 border-primary rounded-lg shadow-2xl p-2 animate-fade-in flex flex-col gap-1 box-glow-strong">
          <div className="text-[10px] text-secondary font-mono font-bold mb-1 px-2 border-b border-primary/20 pb-1">اختر الثيم (Themes)</div>
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
      )}
    </div>
  );
}
