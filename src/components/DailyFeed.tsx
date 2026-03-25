import { type MarketTrend } from "@/data/marketData";

export default function DailyFeed({
  marketData,
  onSelectTrend,
}: {
  marketData: MarketTrend[];
  onSelectTrend: (trend: MarketTrend) => void;
}) {
  // Select top 3 profitable + low/medium competition trends for the daily feed
  const feedItems = [...marketData]
    .filter((t) => t.profitability > 70)
    .sort((a, b) => b.profitability - a.profitability)
    .slice(0, 3);

  if (feedItems.length === 0) return null;

  return (
    <div className="bg-card border-2 border-primary rounded-lg p-5 box-glow mb-5 space-y-4 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative z-10">
        <span className="text-2xl animate-pulse">🔥</span>
        <h3 className="text-lg font-bold text-primary font-mono text-glow">
          خلاصة الفرص اليومية (النيتشات المربحة)
        </h3>
      </div>
      <div className="space-y-3 relative z-10">
        {feedItems.map((item, i) => (
          <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-background border border-primary/30 rounded-md p-4 hover:border-primary/60 hover:bg-primary/5 transition-all">
            <div className="text-secondary font-mono text-[13px] leading-relaxed flex-1">
              <span className="font-extrabold text-[#70d0ff]">مطلوب الآن:</span> صور ذكاء اصطناعي لـ <span className="font-bold text-white">{item.topic}</span> ({item.category})<br className="md:hidden" />
              <span className="md:inline hidden"> — </span>
              <span className="font-bold text-primary">المنافسة:</span> {item.competition === "low" ? "منخفضة (ممتازة)" : item.competition === "medium" ? "متوسطة" : "عالية"}{" "}
              <span className="text-primary mx-1">|</span>{" "}
              <span className="font-bold text-accent">الربح المتوقع:</span> {item.profitability > 85 ? "عالي جداً 🚀" : "عالي ⭐"}
            </div>
            <button
              onClick={() => onSelectTrend(item)}
              className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-md font-mono text-xs font-bold box-glow-strong hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 whitespace-nowrap shadow-[0_0_15px_rgba(0,212,255,0.4)]"
            >
              🚀 أنشئ 15 صورة في هذا النيتش
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
