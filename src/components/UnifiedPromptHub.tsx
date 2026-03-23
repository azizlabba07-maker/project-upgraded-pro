import { useState } from "react";
import PromptGenerator from "@/components/PromptGenerator";
import ImagePromptGenerator from "@/components/ImagePromptGenerator";

type Engine = "gemini" | "claude";

export default function UnifiedPromptHub() {
  const [engine, setEngine] = useState<Engine>("gemini");

  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-card border-2 border-primary rounded-lg p-4 box-glow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-primary text-glow font-mono">
              🤖 مولد موحد (Gemini + Claude)
            </h3>
            <p className="text-[10px] text-secondary font-mono mt-1">
              جميع ميزات المولدين في خانة واحدة مع تبديل داخلي للمحرك.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEngine("gemini")}
              className={`px-3 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                engine === "gemini"
                  ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                  : "bg-card text-secondary border-primary/40 hover:border-primary"
              }`}
            >
              🔮 Gemini
            </button>
            <button
              onClick={() => setEngine("claude")}
              className={`px-3 py-2 rounded-md font-mono text-xs font-semibold border-2 transition-all ${
                engine === "claude"
                  ? "bg-accent/20 text-accent border-accent box-glow-gold"
                  : "bg-card text-secondary border-primary/40 hover:border-primary"
              }`}
            >
              ✦ Claude
            </button>
          </div>
        </div>
      </div>

      {engine === "gemini" ? <PromptGenerator /> : <ImagePromptGenerator />}
    </div>
  );
}
