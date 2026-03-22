// Supabase Edge Function: market-pulse
// Returns live/trending-like data for Adobe Stock market dashboard.
// Deploy: supabase functions deploy market-pulse
//
// Frontend env:
//   VITE_MARKET_PULSE_URL=https://<project-ref>.supabase.co/functions/v1/market-pulse

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TRENDS_RSS_URL = "https://trends.google.com/trending/rss?geo=US";

interface TrendItem {
  topic: string;
  demand: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  profitability: number;
  category: string;
  searches: number;
}

function parseGoogleTrendsRSS(xml: string): string[] {
  const items: string[] = [];
  const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const title = m[1]?.replace(/^Daily Search Trends:\s*/i, "").trim() || "";
    if (title && title.length < 80) items.push(title);
  }
  return items.slice(0, 20);
}

function mapToTrendItems(topics: string[]): TrendItem[] {
  const categories = ["AI", "Sustainability", "Technology", "Business", "Science", "Nature", "Design", "Wellness", "Food"];
  const seed = Date.now() % 1e6;
  const rnd = () => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  if (topics.length === 0) {
    return [
      { topic: "AI and Machine Learning", demand: "high", competition: "high", profitability: 87, category: "AI", searches: 14000 },
      { topic: "Sustainability and Green Energy", demand: "high", competition: "medium", profitability: 89, category: "Sustainability", searches: 11000 },
      { topic: "Remote Work and Home Office", demand: "high", competition: "medium", profitability: 86, category: "Technology", searches: 10000 },
    ];
  }

  return topics.slice(0, 15).map((t, i) => {
    const cat = categories[i % categories.length];
    const demandRoll = rnd();
    const demand: TrendItem["demand"] = demandRoll > 0.6 ? "high" : demandRoll > 0.3 ? "medium" : "low";
    const compRoll = rnd();
    const competition: TrendItem["competition"] = compRoll > 0.6 ? "high" : compRoll > 0.3 ? "medium" : "low";
    const profitability = Math.min(99, Math.max(55, 70 + (demand === "high" ? 15 : demand === "medium" ? 5 : -5) + (competition === "low" ? 10 : competition === "medium" ? 0 : -8)));
    const searches = 5000 + Math.round(rnd() * 12000);
    return { topic: t, demand, competition, profitability, category: cat, searches };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let topics: string[] = [];

    try {
      const res = await fetch(TRENDS_RSS_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StockPulse/1.0)" },
      });
      if (res.ok) {
        const xml = await res.text();
        topics = parseGoogleTrendsRSS(xml);
      }
    } catch {
      // Fallback: no external fetch
    }

    const trends = mapToTrendItems(topics);
    let geo = "US";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        geo = (body?.geo as string) || geo;
      } catch {}
    } else {
      const u = new URL(req.url);
      geo = u.searchParams.get("geo") || geo;
    }

    return new Response(
      JSON.stringify({
        success: true,
        geo,
        trends,
        source: topics.length > 0 ? "google_trends_rss" : "fallback",
        fetchedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
