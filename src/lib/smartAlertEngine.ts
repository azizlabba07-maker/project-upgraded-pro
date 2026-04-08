import { StatsService } from "./StatsService";

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
    this.intervalId = setInterval(() => {
      this.checkOpportunities();
    }, intervalMs) as any;
    
    console.log("🚀 Smart Alert Engine started.");
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🛑 Smart Alert Engine stopped.");
    }
  }

  private async checkOpportunities() {
    try {
      console.log("🔍 Smart Alert Engine checking for opportunities using StatsService...");
      const data = await StatsService.fetchMarketData();

      const goldItems = data.filter(item =>
        item.demand === "high" &&
        item.competition === "low" &&
        StatsService.getTrendScore(item) >= 85
      );

      goldItems.forEach(item => {
        const score = StatsService.getTrendScore(item);
        this.onAlertAdded({
          type: "gold",
          title: `فرصة ذهبية: ${item.topic}`,
          message: `تم اكتشاف نيش عالي الربحية! درجة الاتجاه: ${score}%`,
        });
      });

      // Trending items: any with trend score >=70
      const nowItems = data.filter(item => StatsService.getTrendScore(item) >= 70);
      if (nowItems.length > 0) {
        const topNow = nowItems[0];
        const score = StatsService.getTrendScore(topNow);
        this.onAlertAdded({
          type: "trend",
          title: `تريند عاجل: ${topNow.topic}`,
          message: `هذا النيش يتصدر البحث الآن. درجة الاتجاه: ${score}%`,
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
