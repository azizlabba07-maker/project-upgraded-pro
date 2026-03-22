const tabs = [
  { id: "market",     label: "📊 تحليل السوق" },
  { id: "generator",  label: "🤖 مولد Gemini (محسّن)" },
  { id: "claude",     label: "✦ مولد Claude" },
  { id: "dashboard",  label: "📈 لوحة القيادة" },
  { id: "portfolio",  label: "📁 المحفظة" },
  { id: "tools",      label: "🛠️ أدوات" },
  { id: "store",      label: "🔍 محلل المتجر" },
  { id: "inspiration", label: "💡 إلهام" },
  { id: "settings",   label: "⚙️ الإعدادات" },
];

interface TerminalHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TerminalHeader({ activeTab, onTabChange }: TerminalHeaderProps) {
  return (
    <>
      <div className="sticky top-0 z-50 bg-muted border-b-2 border-primary px-5 py-3 flex items-center gap-3 box-glow-strong">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-cyber-red" />
          <div className="w-3 h-3 rounded-full bg-cyber-yellow" />
          <div className="w-3 h-3 rounded-full bg-primary" />
        </div>
        <div className="flex-1 text-center text-xs text-primary text-glow font-mono">
          $ stock_market_intelligence --v2.1 --gemini --claude --portfolio
        </div>
      </div>

      <div className="container mx-auto px-5 pt-5">
        <div className="text-center mb-8 p-8 gradient-header border-2 border-primary rounded-lg box-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary/10 to-transparent scanline-animation pointer-events-none" />
          <h1 className="text-3xl md:text-4xl font-bold text-primary text-glow-strong relative z-10 font-arabic">
            ⚡ STOCK MARKET INTELLIGENCE
          </h1>
          <p className="text-sm text-secondary relative z-10 mt-2 font-mono">
            {">>> محلل سوق Adobe Stock الذكي | Gemini + Claude AI | v2.1 <<<"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b-2 border-primary pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2.5 rounded-md text-xs font-semibold font-mono transition-all duration-300 border-2 ${
                tab.id === "claude"
                  ? activeTab === tab.id
                    ? "bg-accent text-background border-accent box-glow-gold"
                    : "bg-card text-accent border-accent/50 hover:bg-accent/10 hover:box-glow-gold"
                  : activeTab === tab.id
                    ? "gradient-primary text-primary-foreground border-primary box-glow-strong"
                    : "bg-card text-secondary border-primary hover:bg-primary/10 hover:box-glow"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
