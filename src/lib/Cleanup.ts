/**
 * Cleanup Utility — ensures the application starts with a clean state.
 * Specifically removes legacy / stale cache keys from previous versions.
 */

const LEGACY_KEYS = [
  "gemini_live_trends",
  "ai_trends_cache",
  "market_stats_legacy",
  "source_pulse_data"
];

export function runCleanup(): void {
  try {
    let cleanedCount = 0;
    LEGACY_KEYS.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`[Cleanup] Removed ${cleanedCount} legacy cache keys.`);
    }
  } catch (e) {
    console.error("[Cleanup] Failed to run cleanup:", e);
  }
}

export default runCleanup;
