import { getUnifiedMarketOracle, MarketOracleItem } from "./gemini";

export interface SmartAlert {
  id: string;
  type: "gold" | "trend" | "api" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  metadata?: any;
}

class SmartAlertEngine {
  private intervalId: number | null = null;
  private onAlertAdded: (alert: Omit<SmartAlert, "id" | "timestamp" | "read">) => void;

  constructor(onAlertAdded: (alert: Omit<SmartAlert, "id" | "timestamp" | "read">) => void) {
    this.onAlertAdded = onAlertAdded;
  }

  start(intervalMs: number = 30 * 60 * 1000) {
    if (this.intervalId) return;

    // Initial check
    this.checkOpportunities();

    // Set up periodic check
    this.intervalId = window.setInterval(() => {
      this.checkOpportunities();
    }, intervalMs);
    
    console.log("🚀 Smart Alert Engine started.");
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🛑 Smart Alert Engine stopped.");
    }
  }

  private async checkOpportunities() {
    try {
      console.log("🔍 Smart Alert Engine checking for opportunities...");
      const opportunities = await getUnifiedMarketOracle();
      
      // Filter for "Gold" opportunities (high probability, high demand, low competition)
      const goldItems = opportunities.filter(
        item => item.probability >= 85 && item.demand === "high" && item.competition === "low"
      );

      goldItems.forEach(item => {
        this.onAlertAdded({
          type: "gold",
          title: `فرصة ذهبية: ${item.topic}`,
          message: `تم اكتشاف نيش عالي الربحية! ${item.strategy}. نسبة النجاح المتوقعة: ${item.probability}%`,
        });
      });

      // Check for trending "Now" items
      const nowItems = opportunities.filter(item => item.timeframe === "now" && item.probability >= 70);
      if (nowItems.length > 0) {
        const topNow = nowItems[0];
        this.onAlertAdded({
          type: "trend",
          title: `تريند عاجل: ${topNow.topic}`,
          message: `هذا النيش يتصدر البحث الآن. ابدأ بالرفع فوراً لضمان أفضل ترتيب.`,
        });
      }

    } catch (error) {
      console.error("Smart Alert Engine Error:", error);
      this.onAlertAdded({
        type: "api",
        title: "خطأ في الاتصال بالأوراكل",
        message: "تعذر تحديث بيانات السوق الحية. يرجى التحقق من مفاتيح API الخاصة بك.",
      });
    }
  }
}

export const createSmartAlertEngine = (onAlertAdded: (alert: any) => void) => {
  return new SmartAlertEngine(onAlertAdded);
};
